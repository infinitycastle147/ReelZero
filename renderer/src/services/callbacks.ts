import type { RenderCompleteCallback } from "@/types/render";

type StageValue = "sync" | "render" | "finalize";

const RENDER_WEBHOOK_SECRET = process.env.RENDER_WEBHOOK_SECRET ?? "";
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET ?? RENDER_WEBHOOK_SECRET;

/**
 * Fire a stage update callback to the main app.
 * Fire-and-forget — does NOT await, errors are logged but do not block rendering.
 * Stage mapping: download→"sync", render→"render", upload→"finalize"
 */
export function fireStageCallback(
  stageCallbackUrl: string,
  videoId: string,
  stage: StageValue,
): void {
  const body = JSON.stringify({ videoId, stage });
  fetch(stageCallbackUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-render-secret": RENDER_WEBHOOK_SECRET,
    },
    body,
  }).catch((err: unknown) => {
    console.warn(
      `[callbacks] Stage callback failed (stage=${stage}, videoId=${videoId}):`,
      err,
    );
  });
}

/**
 * Fire the completion callback to the main app.
 * Awaited — retries once on failure. Logs error on final failure but does not throw.
 */
export async function fireCompletionCallback(
  callbackUrl: string,
  payload: RenderCompleteCallback,
): Promise<void> {
  const body = JSON.stringify(payload);

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(callbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-render-secret": RENDER_WEBHOOK_SECRET,
        },
        body,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      console.log(
        `[callbacks] Completion callback fired: videoId=${payload.videoId}, status=${payload.status}`,
      );
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[callbacks] Completion callback attempt ${attempt} failed (videoId=${payload.videoId}): ${message}`,
      );
      if (attempt < 2) {
        await sleep(1000);
      }
    }
  }

  console.error(
    `[callbacks] Completion callback permanently failed for videoId=${payload.videoId}`,
  );

  // ── Fallback: direct PATCH ──────────────────────────────────────────────────
  // The completion webhook failed (app may be temporarily down / cold-starting).
  // If the render succeeded, patch the video record directly via the internal API
  // so it doesn't stay stuck as "failed" even though the MP4 is safely in storage.
  if (payload.status === "completed" && payload.outputUrl) {
    await patchVideoFallback(callbackUrl, payload);
  }
}

/**
 * Last-resort direct PATCH to /api/video/render/complete-fallback.
 * Derives the fallback URL from the callbackUrl base (strips the path).
 */
async function patchVideoFallback(
  callbackUrl: string,
  payload: RenderCompleteCallback,
): Promise<void> {
  try {
    // Derive base URL: "https://app.example.com/api/video/render/complete"
    // → "https://app.example.com/api/video/render/complete-fallback"
    const fallbackUrl = callbackUrl.replace(/\/complete$/, "/complete-fallback");

    const response = await fetch(fallbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-render-secret": INTERNAL_API_SECRET,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    if (response.ok) {
      console.log(
        `[callbacks] Fallback PATCH succeeded for videoId=${payload.videoId}`,
      );
    } else {
      console.error(
        `[callbacks] Fallback PATCH also failed for videoId=${payload.videoId}: HTTP ${response.status}`,
      );
    }
  } catch (err) {
    console.error(
      `[callbacks] Fallback PATCH threw for videoId=${payload.videoId}:`,
      err instanceof Error ? err.message : String(err),
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
