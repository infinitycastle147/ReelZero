// POST /api/video/render/complete-fallback
// Called by the renderer ONLY when the primary /complete webhook permanently fails.
// Performs the minimum update needed to unblock a successfully-rendered video:
//   status → completed, storage_path, video_url, duration_seconds, file_size_bytes
//
// Does NOT run MP4 validation or credit logic — those are handled by /complete.
// Auth: same x-render-secret shared secret as /complete.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getVideoById, updateVideo } from "@/lib/db/queries/videos";
import { withErrorHandler } from "@/lib/errors/middleware";
import type { RenderCompleteCallback } from "@/types/render";

export const runtime = "nodejs";

export const POST = withErrorHandler(async (request: NextRequest) => {
  // Auth: same shared secret as the primary webhook
  const renderSecret = process.env["RENDER_WEBHOOK_SECRET"];
  const incomingSecret = request.headers.get("x-render-secret");

  if (!renderSecret || incomingSecret !== renderSecret) {
    return NextResponse.json(
      { error: { code: "AUTH_UNAUTHORIZED", message: "Invalid render secret" } },
      { status: 401 },
    );
  }

  const body = (await request.json()) as RenderCompleteCallback;

  if (!body.videoId || body.status !== "completed" || !body.outputUrl) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "videoId, status=completed and outputUrl are required" } },
      { status: 400 },
    );
  }

  const video = await getVideoById(body.videoId);
  if (!video) {
    return NextResponse.json(
      { error: { code: "RESOURCE_NOT_FOUND", message: "Video not found" } },
      { status: 404 },
    );
  }

  // Idempotency: already completed by the primary webhook (race condition on retry)
  if (video.status === "completed") {
    console.log(`[complete-fallback] videoId=${body.videoId} already completed — no-op`);
    return NextResponse.json({ data: { applied: false, reason: "already_completed" } });
  }

  // storage_path = "{userId}/{videoId}.mp4" — same convention as complete/route.ts
  const storagePath = `${video.user_id}/${body.videoId}.mp4`;

  await updateVideo(body.videoId, {
    status: "completed",
    current_stage: null,
    video_url: body.outputUrl,
    storage_path: storagePath,
    ...(body.audioUrl ? { audio_url: body.audioUrl } : {}),
    duration_seconds: body.durationSeconds ?? null,
    file_size_bytes: body.fileSizeBytes ?? null,
  });

  console.log(`[complete-fallback] videoId=${body.videoId} marked completed via fallback`);

  return NextResponse.json({ data: { applied: true } });
});
