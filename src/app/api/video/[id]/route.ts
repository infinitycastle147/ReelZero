import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getUserByClerkId } from "@/lib/db/queries/users";
import { getVideoById, updateVideo } from "@/lib/db/queries/videos";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { withErrorHandler } from "@/lib/errors/middleware";

type UpdateVideoMetadataRequest = {
  scenes?: unknown[];
  audioStoragePath?: string;
  wordAlignment?: unknown[];
  [key: string]: unknown;
};

// PATCH /api/video/[id] — Update video metadata
export const PATCH = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED);
  }

  const { id: videoId } = await params;

  // Resolve Clerk ID → Supabase UUID
  const dbUser = await getUserByClerkId(clerkUserId);
  if (!dbUser) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, "User not found");
  }

  // Fetch video and verify ownership
  const video = await getVideoById(videoId);
  if (!video) {
    throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, "Video not found");
  }
  if (video.user_id !== dbUser.id) {
    throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "Video does not belong to current user");
  }

  const body = (await request.json()) as UpdateVideoMetadataRequest;

  // Merge new metadata with existing
  const updatedMetadata = {
    ...(video.metadata as object),
    ...body,
  };

  const updatedVideo = await updateVideo(videoId, {
    metadata: updatedMetadata,
  });

  return NextResponse.json({ data: { video: updatedVideo } });
});

// GET /api/video/[id] — Get video by ID
export const GET = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED);
  }

  const { id: videoId } = await params;

  // Resolve Clerk ID → Supabase UUID
  const dbUser = await getUserByClerkId(clerkUserId);
  if (!dbUser) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, "User not found");
  }

  // Fetch video and verify ownership
  const video = await getVideoById(videoId);
  if (!video) {
    throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, "Video not found");
  }
  if (video.user_id !== dbUser.id) {
    throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "Video does not belong to current user");
  }

  return NextResponse.json({ data: video });
});
