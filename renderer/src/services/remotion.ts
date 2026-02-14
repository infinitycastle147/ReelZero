import path from "path";

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

import { updateJob } from "@/services/job-map";
import type { VideoCompositionProps } from "@/types/remotion";

/** Cached serve URL — bundle() is called once per process lifetime */
let serveUrl: string | null = null;

/**
 * Return the Remotion webpack bundle serve URL.
 * Bundles on first call and caches the result — subsequent calls return immediately.
 * Bundle takes 10–30s on first call; subsequent jobs reuse the same bundle.
 */
export async function getServeUrl(): Promise<string> {
  if (!serveUrl) {
    console.log("[remotion] Bundling Remotion compositions (first call)...");
    const start = Date.now();
    serveUrl = await bundle({
      entryPoint: path.resolve(__dirname, "../remotion/Root.tsx"),
      // No webpackOverride needed — Root.tsx uses same TS aliases as renderer tsconfig
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
  const url = await getServeUrl();

  console.log(
    `[remotion] selectComposition for job ${jobId} (totalFrames=${totalFrames})`,
  );

  const composition = await selectComposition({
    serveUrl: url,
    id: "VideoComposition",
    inputProps,
  });

  console.log(`[remotion] renderMedia starting for job ${jobId}`);

  await renderMedia({
    // Override Root.tsx default of 1800 frames with the actual computed total
    composition: { ...composition, durationInFrames: totalFrames },
    serveUrl: url,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
    concurrency: Number(process.env.REMOTION_CONCURRENCY ?? "2"),
    // Path to Chromium binary — set in Dockerfile, optional locally
    browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH || null,
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
