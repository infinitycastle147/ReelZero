// POST /api/video/render/retry — Re-dispatch a failed video to the renderer.
// Reuses all existing metadata (scenes, audioStoragePath, wordAlignment) — no new
// audio generation, no new images. Only the render step is repeated.
// Consumes 1 credit (same as the original render).

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type { WordAlignment } from "@/lib/ai/types";
import { getSubscriptionByClerkUserId, refundCredit, reserveCredit } from "@/lib/db/queries/subscriptions";
import { getUserByClerkId } from "@/lib/db/queries/users";
import { getProcessingVideoByUserId, getVideoById, updateVideo } from "@/lib/db/queries/videos";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { withErrorHandler } from "@/lib/errors/middleware";
import { buildRenderPayload, dispatchToRenderer } from "@/lib/services/remotion/render";
import type { Scene } from "@/types/scene";

export const runtime = "nodejs";

type RetryRequestBody = {
  videoId: string;
};

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { userId } = await auth();
  if (!userId) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED);
  }

  const body = (await request.json()) as RetryRequestBody;

  if (!body.videoId || typeof body.videoId !== "string") {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "videoId is required");
  }

  const dbUser = await getUserByClerkId(userId);
  if (!dbUser) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, "User not found");
  }

  // Fetch video and verify ownership
  const video = await getVideoById(body.videoId);
  if (!video) {
    throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, "Video not found");
  }
  if (video.user_id !== dbUser.id) {
    throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "Video does not belong to current user");
  }

  // Only failed videos can be retried — not processing or completed
  if (video.status !== "failed") {
    throw new AppError(
      ERROR_CODES.RESOURCE_CONFLICT,
      `Video cannot be retried — current status is "${video.status}"`,
    );
  }

  // Concurrent render guard — max 1 render per user
  const processingVideo = await getProcessingVideoByUserId(dbUser.id);
  if (processingVideo !== null) {
    throw new AppError(ERROR_CODES.RESOURCE_CONFLICT, "Another video is already rendering");
  }

  // Extract the data saved during the original render attempt
  const metadata = video.metadata as {
    scenes?: Scene[];
    audioStoragePath?: string;
    wordAlignment?: WordAlignment[];
    captionStyle?: string;
    transitionType?: string;
    voice?: string;
  };

  const scenes = (metadata.scenes ?? []) as Scene[];
  const audioStoragePath = metadata.audioStoragePath;
  const wordAlignment = (metadata.wordAlignment ?? []) as WordAlignment[];

  // Guard: all three must be present — if missing, the original run never got far enough
  if (scenes.length === 0) {
    throw new AppError(
      ERROR_CODES.VALIDATION_FAILED,
      "No scene data found — the original video generation may not have completed. Please start a new video.",
    );
  }
  if (!audioStoragePath) {
    throw new AppError(
      ERROR_CODES.VALIDATION_FAILED,
      "No audio found — the original video generation may not have completed. Please start a new video.",
    );
  }
  if (wordAlignment.length === 0) {
    throw new AppError(
      ERROR_CODES.VALIDATION_FAILED,
      "No word alignment data found — the original video generation may not have completed. Please start a new video.",
    );
  }

  // Reserve credit
  const reserved = await reserveCredit(userId);
  if (!reserved) {
    throw new AppError(ERROR_CODES.CREDIT_INSUFFICIENT);
  }

  let creditReserved = true;

  try {
    const subscription = await getSubscriptionByClerkUserId(userId);
    const showWatermark = !subscription || subscription.tier === "free";

    const callbackBaseUrl =
      process.env["NEXT_PUBLIC_APP_URL"] ??
      (process.env["VERCEL_URL"]
        ? `https://${process.env["VERCEL_URL"]}`
        : "http://localhost:3000");

    // Build render payload using the saved audio + scenes — no new generation
    const payload = await buildRenderPayload(
      video,
      dbUser.id,
      wordAlignment,
      scenes,
      audioStoragePath,
      showWatermark,
      callbackBaseUrl,
    );

    // Re-dispatch to renderer
    await dispatchToRenderer(payload);

    // Reset video to processing and stamp a new renderStartedAt
    await updateVideo(body.videoId, {
      status: "processing",
      current_stage: "render",
      storage_path: null,
      video_url: null,
      metadata: {
        ...(video.metadata as object),
        renderStartedAt: new Date().toISOString(),
        renderRetryAt: new Date().toISOString(),
      },
    });

    creditReserved = false;

    return NextResponse.json(
      {
        data: {
          videoId: body.videoId,
          status: "processing" as const,
          estimatedSeconds: 80,
        },
      },
      { status: 202 },
    );
  } catch (err) {
    if (creditReserved) {
      await refundCredit(userId);
    }
    try {
      await updateVideo(body.videoId, { status: "failed", current_stage: null });
    } catch {
      // Best-effort — don't mask original error
    }
    throw err;
  }
});
