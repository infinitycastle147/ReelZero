import fs from "fs/promises";
import path from "path";

import { cleanupJobDir, downloadFile, ensureJobDir } from "@/services/assets";
import {
  fireCompletionCallback,
  fireStageCallback,
} from "@/services/callbacks";
import { updateJob } from "@/services/job-map";
import { getServeUrl, renderComposition } from "@/services/remotion";
import { uploadMp4 } from "@/services/storage";
import { VIDEO_FRAME_RATE } from "@/lib/constants/video";
import type { RenderJobPayload } from "@/types/render";
import type { VideoCompositionProps } from "@/types/remotion";

const RENDER_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Full async render pipeline. Called fire-and-forget from POST /render.
 *
 * Stages:
 *   1. download  — download audio + scene images from Supabase signed URLs
 *   2. bundle    — get/cache the Remotion webpack bundle
 *   3. render    — render frames via headless Chromium + FFmpeg
 *   4. upload    — upload MP4 to Supabase Storage
 *   5. done      — fire completion callback, cleanup temp files
 *
 * All errors are caught, job is marked failed, failure callback is fired.
 */
export async function processJob(
  jobId: string,
  payload: RenderJobPayload,
): Promise<void> {
  const { videoId, userId, audioUrl, scenes, callbackUrl, stageCallbackUrl } = payload;

  let jobDir: string | undefined;

  try {
    // ── Stage 1: download ──────────────────────────────────────────────────
    updateJob(jobId, { status: "processing", stage: "download", progress: 0 });
    fireStageCallback(stageCallbackUrl, videoId, "sync");

    jobDir = await ensureJobDir(jobId);
    console.log(`[pipeline] Job ${jobId}: downloading assets to ${jobDir}`);

    // Download audio
    const audioLocalPath = path.join(jobDir, "audio.mp3");
    await downloadFile(audioUrl, audioLocalPath);

    // Download scene images
    for (const scene of scenes) {
      const imagePath = path.join(jobDir, `scene-${scene.sceneNumber}.jpg`);
      await downloadFile(scene.imageUrl, imagePath);
    }

    console.log(`[pipeline] Job ${jobId}: assets downloaded`);

    // ── Stage 2: bundle ────────────────────────────────────────────────────
    // Warms (or reuses) the cached Remotion webpack bundle.
    // No stage callback for bundle — the "render" callback fires in stage 3.
    updateJob(jobId, { stage: "bundle", progress: 5 });
    await getServeUrl();

    // ── Stage 3: render ────────────────────────────────────────────────────
    updateJob(jobId, { stage: "render", progress: 5 });
    fireStageCallback(stageCallbackUrl, videoId, "render");

    const totalFrames = scenes.reduce((sum, s) => sum + s.durationInFrames, 0);
    const outputPath = path.join(jobDir, "output.mp4");

    // Pass original signed HTTPS URLs to Remotion — it downloads assets itself
    // and rejects file:// URLs. We still downloaded to verify existence above.
    const inputProps: VideoCompositionProps = {
      audioUrl: audioUrl,
      scenes: scenes,
      captionStyle: payload.captionStyle,
      transitionType: payload.transitionType,
      showWatermark: payload.showWatermark,
    };

    console.log(
      `[pipeline] Job ${jobId}: rendering ${totalFrames} frames → ${outputPath}`,
    );

    // Wrap in Promise.race with a 10-minute timeout (satisfies SC-004:
    // failure callback must fire within 30s of error)
    await Promise.race([
      renderComposition(jobId, inputProps, totalFrames, outputPath),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Render timeout after 10 minutes")),
          RENDER_TIMEOUT_MS,
        ),
      ),
    ]);

    console.log(`[pipeline] Job ${jobId}: render complete`);

    // ── Stage 4: upload ────────────────────────────────────────────────────
    updateJob(jobId, { stage: "upload", progress: 98 });
    fireStageCallback(stageCallbackUrl, videoId, "finalize");

    const outputUrl = await uploadMp4(userId, videoId, outputPath);

    // Get file stats for callback payload
    const stats = await fs.stat(outputPath);
    const fileSizeBytes = stats.size;
    const durationSeconds = Math.round((totalFrames / VIDEO_FRAME_RATE) * 10) / 10;

    console.log(
      `[pipeline] Job ${jobId}: uploaded to Supabase. outputUrl=${outputUrl}`,
    );

    // ── Stage 5: done ──────────────────────────────────────────────────────
    updateJob(jobId, {
      status: "completed",
      stage: "done",
      progress: 100,
      completedAt: new Date(),
    });

    await fireCompletionCallback(callbackUrl, {
      videoId,
      status: "completed",
      outputUrl,
      audioUrl,   // echo back so main app can upsert audio_url column
      fileSizeBytes,
      durationSeconds,
    });

    console.log(`[pipeline] Job ${jobId}: COMPLETED`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    console.error(`[pipeline] Job ${jobId}: FAILED — ${errorMessage}`);

    updateJob(jobId, {
      status: "failed",
      error: errorMessage,
      completedAt: new Date(),
    });

    await fireCompletionCallback(callbackUrl, {
      videoId,
      status: "failed",
      error: errorMessage,
    });
  } finally {
    // Always clean up temp files regardless of success or failure
    if (jobDir) {
      await cleanupJobDir(jobId);
    }
  }
}
