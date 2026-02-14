import type { RenderCompleteCallback } from "@/types/render";

type StageValue = "sync" | "render" | "finalize";

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
    headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
