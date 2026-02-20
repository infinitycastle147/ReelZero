// POST /api/video/render/discard — Allow user to discard a stuck processing video
// Marks the video as "failed" so the concurrent render guard clears.

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { refundCredit } from "@/lib/db/queries/subscriptions";
import { getUserByClerkId } from "@/lib/db/queries/users";
import { getVideoById, updateVideo } from "@/lib/db/queries/videos";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { withErrorHandler } from "@/lib/errors/middleware";

export const runtime = "nodejs";

type DiscardRequestBody = {
  videoId: string;
};

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { userId } = await auth();
  if (!userId) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED);
  }

  const body = (await request.json()) as DiscardRequestBody;

  if (!body.videoId || typeof body.videoId !== "string") {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "videoId is required");
  }

  const dbUser = await getUserByClerkId(userId);
  if (!dbUser) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, "User not found");
  }

  const video = await getVideoById(body.videoId);
  if (!video) {
    throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, "Video not found");
  }

  // Only the owner can discard their video
  if (video.user_id !== dbUser.id) {
    throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "Video does not belong to current user");
  }

  // Only discard videos that are currently processing
  if (video.status !== "processing") {
    return NextResponse.json({ data: { discarded: false, reason: "Video is not processing" } });
  }

  // Mark as failed and refund the credit
  const existingMetadata = (video.metadata as Record<string, unknown>) ?? {};
  await updateVideo(body.videoId, {
    status: "failed",
    current_stage: null,
    metadata: { ...existingMetadata, renderError: "Discarded by user" },
  });

  // Refund credit (uses Clerk ID)
  await refundCredit(userId);

  return NextResponse.json({ data: { discarded: true } });
});
