// F008: POST /api/video/render/complete — Renderer webhook callback
// Called by ReelZero-Renderer when a job finishes (success or failure).
// Auth: x-render-secret shared secret (NOT Clerk).

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createGenerationLog } from "@/lib/db/queries/generation-logs";
import { refundCredit } from "@/lib/db/queries/subscriptions";
import { getUserById } from "@/lib/db/queries/users";
import { getVideoById, updateVideo } from "@/lib/db/queries/videos";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { withErrorHandler } from "@/lib/errors/middleware";
import { validateMp4Buffer } from "@/lib/services/remotion/render";
import type { RenderCompleteCallback } from "@/types/render";

export const runtime = "nodejs";

export const POST = withErrorHandler(async (request: NextRequest) => {
  // Validate shared secret (not Clerk auth — this is an internal service callback)
  const renderSecret = process.env["RENDER_WEBHOOK_SECRET"];
  const incomingSecret = request.headers.get("x-render-secret");

  if (!renderSecret || incomingSecret !== renderSecret) {
    return NextResponse.json(
      { error: { code: "AUTH_UNAUTHORIZED", message: "Invalid render secret" } },
      { status: 401 }
    );
  }

  const body = (await request.json()) as RenderCompleteCallback;

  if (!body.videoId) {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "videoId is required");
  }

  console.log(`[render/complete] Received callback: videoId=${body.videoId}, status=${body.status}`);

  // Fetch video and verify it exists
  const video = await getVideoById(body.videoId);
  if (!video) {
    throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, "Video not found");
  }

  // Idempotency guard: don't process if already terminal
  if (video.status === "completed" || video.status === "failed") {
    return NextResponse.json(
      { error: { code: "RESOURCE_CONFLICT", message: "Video already in terminal state" } },
      { status: 409 }
    );
  }

  const supabaseUserId = video.user_id;

  // Resolve Supabase UUID → Clerk ID (refundCredit requires Clerk ID)
  const dbUser = await getUserById(supabaseUserId);
  const clerkUserId = dbUser?.clerk_user_id ?? null;

  if (body.status === "completed" && body.outputUrl) {
    // --- Success path ---
    // Validate MP4 by fetching only the first 12 bytes via Range header.
    // Previously fetched the ENTIRE file (10-50 MB) just for 12-byte check,
    // which caused timeouts and memory pressure in serverless environments.
    let mp4Valid = false;
    try {
      const res = await fetch(body.outputUrl, {
        headers: { Range: "bytes=0-11" },
        signal: AbortSignal.timeout(10_000),
      });

      // Supabase Storage may return 200 (full body) or 206 (partial content).
      // Accept either — just read the first 12 bytes of whatever comes back.
      if (res.ok || res.status === 206) {
        const arrayBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuf.slice(0, 12));
        mp4Valid = validateMp4Buffer(buf);
      } else {
        console.warn(
          `[render/complete] MP4 fetch returned ${res.status} for videoId=${body.videoId}`,
        );
      }
    } catch (err) {
      console.warn(
        `[render/complete] MP4 validation fetch failed for videoId=${body.videoId}:`,
        err instanceof Error ? err.message : String(err),
      );
      mp4Valid = false;
    }

    if (!mp4Valid) {
      // MP4 validation failed — treat as render failure
      console.warn(`[render/complete] MP4 validation failed for videoId=${body.videoId}, treating as failure`);
      await handleFailure(clerkUserId, body.videoId, video, "MP4 validation failed");
      return NextResponse.json({ data: { received: true } });
    }

    // storage_path = "{userId}/{videoId}.mp4" — same convention used by renderer/src/services/storage.ts
    const storagePath = `${video.user_id}/${body.videoId}.mp4`;

    // Round duration to integer — DB column is INTEGER, renderer may send a decimal (e.g. 15.3)
    const durationSeconds = body.durationSeconds != null
      ? Math.round(body.durationSeconds)
      : null;

    // Update video record as completed
    try {
      await updateVideo(body.videoId, {
        status: "completed",
        current_stage: null,
        video_url: body.outputUrl,
        storage_path: storagePath,
        // Upsert audio_url if echoed back by renderer (belt-and-suspenders in case
        // the write in POST /api/video/render didn't persist before the job completed)
        ...(body.audioUrl ? { audio_url: body.audioUrl } : {}),
        duration_seconds: durationSeconds,
        file_size_bytes: body.fileSizeBytes ?? null,
      });
    } catch (err) {
      console.error(
        `[render/complete] updateVideo FAILED for videoId=${body.videoId}:`,
        err instanceof Error ? err.message : String(err),
      );
      throw err;
    }

    // Credit reservation is consumed by NOT calling refundCredit
    // Log success (non-critical — video is already marked completed)
    try {
      await createGenerationLog({
        video_id: body.videoId,
        stage: "render",
        status: "success",
      });
    } catch (err) {
      console.error(
        `[render/complete] createGenerationLog failed for videoId=${body.videoId}:`,
        err instanceof Error ? err.message : String(err),
      );
      // Don't re-throw — the video update already succeeded, generation log is non-critical
    }
  } else {
    // --- Failure path ---
    await handleFailure(clerkUserId, body.videoId, video, body.error ?? "Render failed");
  }

  return NextResponse.json({ data: { received: true } });
});

async function handleFailure(
  clerkUserId: string | null,
  videoId: string,
  video: { metadata?: unknown },
  errorMessage: string,
): Promise<void> {
  const existingMetadata = (video.metadata as Record<string, unknown>) ?? {};

  const promises: Promise<unknown>[] = [
    updateVideo(videoId, {
      status: "failed",
      current_stage: null,
      metadata: { ...existingMetadata, renderError: errorMessage },
    }),
    createGenerationLog({
      video_id: videoId,
      stage: "render",
      status: "error",
    }),
  ];

  // Only refund if we have a valid Clerk ID (refundCredit requires Clerk ID, not Supabase UUID)
  if (clerkUserId) {
    promises.push(refundCredit(clerkUserId));
  } else {
    console.error(`[render/complete] Cannot refund credit: no Clerk ID found for video ${videoId}`);
  }

  await Promise.all(promises);
}
