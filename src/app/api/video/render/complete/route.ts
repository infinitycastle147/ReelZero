// F008: POST /api/video/render/complete — Renderer webhook callback
// Called by ReelZero-Renderer when a job finishes (success or failure).
// Auth: x-render-secret shared secret (NOT Clerk).

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createGenerationLog } from "@/lib/db/queries/generation-logs";
import { refundCredit } from "@/lib/db/queries/subscriptions";
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

  const userId = video.user_id;

  if (body.status === "completed" && body.outputUrl) {
    // --- Success path ---
    // Fetch first 12 bytes from outputUrl and validate MP4 signature
    let mp4Valid = false;
    try {
      const res = await fetch(body.outputUrl);
      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf.slice(0, 12));
      mp4Valid = validateMp4Buffer(buf);
    } catch {
      mp4Valid = false;
    }

    if (!mp4Valid) {
      // MP4 validation failed — treat as render failure
      await handleFailure(userId, body.videoId, "MP4 validation failed");
      return NextResponse.json({ data: { received: true } });
    }

    // Update video record as completed
    // video_url stores the outputUrl (renderer provides a direct URL or storage path)
    await updateVideo(body.videoId, {
      status: "completed",
      current_stage: null,
      video_url: body.outputUrl,
      duration_seconds: body.durationSeconds ?? null,
      file_size_bytes: body.fileSizeBytes ?? null,
    });

    // Credit reservation is consumed by NOT calling refundCredit
    // Log success
    await createGenerationLog({
      video_id: body.videoId,
      stage: "render",
      status: "success",
    });
  } else {
    // --- Failure path ---
    await handleFailure(userId, body.videoId, body.error ?? "Render failed");
  }

  return NextResponse.json({ data: { received: true } });
});

async function handleFailure(userId: string, videoId: string, errorMessage: string): Promise<void> {
  await Promise.all([
    updateVideo(videoId, {
      status: "failed",
      current_stage: null,
      metadata: { renderError: errorMessage },
    }),
    refundCredit(userId),
    createGenerationLog({
      video_id: videoId,
      stage: "render",
      status: "error",
    }),
  ]);
}
