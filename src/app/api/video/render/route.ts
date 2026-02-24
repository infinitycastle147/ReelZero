// F008: POST /api/video/render — Trigger video rendering
// Fire-and-forget: returns 202 immediately; renderer calls back via webhook

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

// GET /api/video/render — returns the current processing video for the user (if any)
export const GET = withErrorHandler(async (_request: NextRequest) => {
  const { userId } = await auth();
  if (!userId) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED);
  }

  const dbUser = await getUserByClerkId(userId);
  if (!dbUser) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, "User not found");
  }

  const processingVideo = await getProcessingVideoByUserId(dbUser.id);

  return NextResponse.json({
    data: {
      videoId: processingVideo?.id ?? null,
      status: processingVideo?.status ?? null,
    },
  });
});

type RenderRequestBody = {
  videoId: string;
};

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { userId } = await auth();
  if (!userId) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED);
  }

  const body = (await request.json()) as RenderRequestBody;

  // Validate videoId
  if (!body.videoId || typeof body.videoId !== "string") {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "videoId is required");
  }

  // Resolve Clerk ID → Supabase UUID (videos.user_id is a UUID FK)
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

  // Concurrent render guard — FR-018: max 1 render per user
  const processingVideo = await getProcessingVideoByUserId(dbUser.id);
  if (processingVideo !== null) {
    // Idempotent rejection: same video re-submitted OR a different video is already processing
    throw new AppError(ERROR_CODES.RESOURCE_CONFLICT, "generation already in progress");
  }

  // Reserve credit (FR-013 — atomic before any processing)
  const reserved = await reserveCredit(userId);
  if (!reserved) {
    throw new AppError(ERROR_CODES.CREDIT_INSUFFICIENT);
  }

  // From this point on, any failure MUST call refundCredit
  let creditReserved = true;

  try {
    // Extract wizard data from video metadata
    const metadata = video.metadata as {
      wordAlignment?: WordAlignment[];
      audioStoragePath?: string;
      captionStyle?: string;
      transitionType?: string;
      scenes?: Scene[];
    };

    const scenes = (metadata.scenes ?? []) as Scene[];
    
    // Validate scenes exist
    if (scenes.length === 0) {
      throw new AppError(
        ERROR_CODES.VALIDATION_FAILED,
        "No scenes found. Please complete the wizard first."
      );
    }
    
    // Validate all scenes have images
    const missingImages = scenes.filter(s => !s.imageUrl);
    if (missingImages.length > 0) {
      throw new AppError(
        ERROR_CODES.VALIDATION_FAILED,
        `${missingImages.length} scene(s) missing images. Please generate or upload images for all scenes.`
      );
    }
    
    // FR-002: Generate audio with word alignment BEFORE rendering
    // Combine all scene narrations into one audio file
    const narrationText = scenes.map(s => s.narration).join(" ");
    const voiceId = (metadata as { voice?: string }).voice ?? "voice_echo";
    
    console.log(`[render] Generating audio for video ${body.videoId}...`);
    
    // Import generateAudio dynamically to avoid circular dependencies
    const { generateAudio } = await import("@/lib/ai/tts");
    
    const audioResult = await generateAudio({
      narrationText,
      voiceId,
      videoId: body.videoId,
      userId: dbUser.id, // Supabase UUID — storage paths use UUID folders, not Clerk ID
    });
    
    console.log(`[render] Audio generated: ${audioResult.storageUrl}`);
    
    const wordAlignment = audioResult.alignment;
    const audioStoragePath = audioResult.storagePath;
    
    // T042: Derive watermark from subscription tier (FR-012 — free tier gets watermark)
    const subscription = await getSubscriptionByClerkUserId(userId);
    const showWatermark = !subscription || subscription.tier === "free";

    // Determine callback base URL
    const callbackBaseUrl =
      process.env["NEXT_PUBLIC_APP_URL"] ??
      (process.env["VERCEL_URL"]
        ? `https://${process.env["VERCEL_URL"]}`
        : "http://localhost:3000");

    // Build render payload (fetches signed URLs, calculates timings)
    // dbUser.id = Supabase UUID — matches the storage folder used during image/audio upload
    const payload = await buildRenderPayload(
      video,
      dbUser.id,
      wordAlignment,
      scenes,
      audioStoragePath,
      showWatermark,
      callbackBaseUrl
    );

    // Dispatch to renderer (fire-and-forget — returns jobId immediately)
    await dispatchToRenderer(payload);

    // Update current_stage and save audio as a first-class column.
    // audioStoragePath is kept in metadata for the deletion logic in deleteVideoWithStorage.
    await updateVideo(body.videoId, {
      status: "processing",
      current_stage: "sync",
      audio_url: audioResult.storageUrl,
      metadata: {
        ...(video.metadata as object),
        renderStartedAt: new Date().toISOString(),
        captionStyle: payload.captionStyle,
        transitionType: payload.transitionType,
        audioStoragePath,
        wordAlignment,
      },
    });

    creditReserved = false; // Credit reservation stays consumed (no refund needed)

    return NextResponse.json(
      {
        data: {
          videoId: body.videoId,
          status: "processing" as const,
          estimatedSeconds: 80,
        },
      },
      { status: 202 }
    );
  } catch (err) {
    if (creditReserved) {
      await refundCredit(userId);
    }
    // Mark video as failed if we managed to reach the dispatch step
    try {
      await updateVideo(body.videoId, { status: "failed", current_stage: null });
    } catch {
      // Best-effort — don't mask original error
    }
    throw err;
  }
});
