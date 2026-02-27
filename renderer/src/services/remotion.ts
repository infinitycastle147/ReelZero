import path from "path";

import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderMedia, selectComposition } from "@remotion/renderer";
import type { Configuration } from "webpack";

import { updateJob } from "@/services/job-map";
import type { VideoCompositionProps } from "@/types/remotion";

/** Cached serve URL — bundle() is called once per process lifetime */
let serveUrl: string | null = null;

/**
 * Resolved Chrome executable path — set once per process lifetime.
 *
 * Resolution order:
 *   1. PUPPETEER_EXECUTABLE_PATH  (set in Dockerfile or local dev) → string
 *   2. ensureBrowser() with REMOTION_CHROME_PATH as browserExecutable
 *      - Points to a Render persistent disk (/data/chrome): downloaded once,
 *        reused across cold starts.
 *      - Unset: Remotion picks its own cache dir (re-downloads on cold start).
 *
 * undefined = not yet resolved; null = no usable path (Remotion auto-detects);
 * string = resolved executable path.
 */
let resolvedBrowserPath: string | null | undefined =
  process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

/**
 * Ensure Chrome is downloaded and return its executable path (or null to let
 * Remotion auto-detect). Idempotent — resolves once and caches the result.
 */
async function getChromePath(): Promise<string | null> {
  if (resolvedBrowserPath !== undefined) return resolvedBrowserPath;

  const browserExecutable = process.env.REMOTION_CHROME_PATH || undefined;
  console.log(
    browserExecutable
      ? `[remotion] Ensuring Chrome at ${browserExecutable} ...`
      : "[remotion] Ensuring Chrome (default Remotion cache dir) ...",
  );

  // onBrowserDownload must return { onProgress, version } per the Remotion API.
  const status = await ensureBrowser({
    browserExecutable: browserExecutable ?? null,
    onBrowserDownload: () => ({
      version: null,
      onProgress: ({ downloadedBytes, totalSizeInBytes }) => {
        const dl = (downloadedBytes / 1_000_000).toFixed(1);
        const tot = (totalSizeInBytes / 1_000_000).toFixed(1);
        process.stdout.write(
          `\rDownloading Chrome Headless Shell - ${dl} Mb/${tot} Mb`,
        );
      },
    }),
  });

  // BrowserStatus is a discriminated union — only 'user-defined-path' and
  // 'local-puppeteer-browser' carry a path; others mean no usable binary.
  if (status.type === "user-defined-path" || status.type === "local-puppeteer-browser") {
    process.stdout.write("\n");
    resolvedBrowserPath = status.path;
    console.log(`[remotion] Chrome ready at ${status.path} (${status.type})`);
  } else {
    console.warn(`[remotion] Chrome status: ${status.type} — falling back to Remotion auto-detect`);
    resolvedBrowserPath = null;
  }

  return resolvedBrowserPath;
}

/**
 * Absolute path to renderer/src — used by webpack to resolve the @/ alias.
 * __dirname at runtime is renderer/dist/services, so go up two levels to renderer/,
 * then into src/.
 */
const RENDERER_SRC = path.resolve(__dirname, "../../src");

/**
 * Webpack override that adds the @/ → renderer/src/ alias.
 * Remotion's bundler uses its own webpack instance which does NOT read tsconfig paths.
 * Without this, imports like `@/lib/constants/video` fail with "Module not found".
 */
function webpackOverride(currentConfig: Configuration): Configuration {
  return {
    ...currentConfig,
    resolve: {
      ...currentConfig.resolve,
      alias: {
        ...(currentConfig.resolve?.alias ?? {}),
        "@": RENDERER_SRC,
      },
    },
  };
}

/**
 * Return the Remotion webpack bundle serve URL.
 * Bundles on first call and caches the result — subsequent calls return immediately.
 * Bundle takes 10–30s on first call; subsequent jobs reuse the same bundle.
 */
export async function getServeUrl(): Promise<string> {
  if (!serveUrl) {
    console.log("[remotion] Bundling Remotion compositions (first call)...");
    console.log(`[remotion] Entry point: ${path.resolve(RENDERER_SRC, "remotion/Root.tsx")}`);
    console.log(`[remotion] @/ alias → ${RENDERER_SRC}`);
    const start = Date.now();
    serveUrl = await bundle({
      entryPoint: path.resolve(RENDERER_SRC, "remotion/Root.tsx"),
      webpackOverride,
    });
    console.log(
      `[remotion] Bundle complete in ${((Date.now() - start) / 1000).toFixed(1)}s. serveUrl: ${serveUrl}`,
    );
  }
  return serveUrl;
}

/**
 * Render the VideoComposition to an MP4 file.
 *
 * @param jobId       - Used to route onProgress updates to the job map
 * @param inputProps  - VideoCompositionProps (audioUrl = local file:// path)
 * @param totalFrames - Sum of all scene durationInFrames (overrides Root.tsx default)
 * @param outputPath  - Local absolute path for the output MP4
 */
export async function renderComposition(
  jobId: string,
  inputProps: VideoCompositionProps,
  totalFrames: number,
  outputPath: string,
): Promise<void> {
  const [url, browserExecutable] = await Promise.all([
    getServeUrl(),
    getChromePath(),
  ]);

  console.log(
    `[remotion] selectComposition for job ${jobId} (totalFrames=${totalFrames})`,
  );

  const composition = await selectComposition({
    serveUrl: url,
    id: "VideoComposition",
    inputProps,
    browserExecutable,
  });

  console.log(`[remotion] renderMedia starting for job ${jobId}`);

  await renderMedia({
    // Override Root.tsx default of 1800 frames with the actual computed total
    composition: { ...composition, durationInFrames: totalFrames },
    serveUrl: url,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
    concurrency: Number(process.env.REMOTION_CONCURRENCY ?? "1"),
    // H.264 compression: CRF 23 = good quality at ~60% smaller file vs Remotion default.
    // Scale: 0 (lossless) → 51 (worst). 18–28 is the sweet spot; 23 is FFmpeg default.
    // Targets ~8–15 MB for a 60-second 1080×1920 reel, well under Supabase's 50 MB limit.
    crf: Number(process.env.REMOTION_CRF ?? "23"),
    // yuv420p: required for playback in all browsers, QuickTime, and mobile players.
    // Without it, some decoders reject the file or show colour artefacts.
    pixelFormat: "yuv420p",
    // Resolved once per process — points to persistent disk on Render or Dockerfile path
    browserExecutable,
    chromiumOptions: {
      // Required for headless Chromium in Docker (no GPU available)
      gl: "swiftshader",
    },
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      // Map 0–100 render progress to 5–95 in job progress (leave room for other stages)
      const jobProgress = 5 + Math.round(pct * 0.9);
      updateJob(jobId, { progress: jobProgress });
    },
  });

  console.log(`[remotion] renderMedia complete for job ${jobId}: ${outputPath}`);
}
