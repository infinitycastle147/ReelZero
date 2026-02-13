// F009: GET /api/videos/:id — single video with signed URL
//       DELETE /api/videos/:id — atomic delete (storage-first)

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getUserByClerkId } from "@/lib/db/queries/users";
import { deleteVideoWithStorage, getVideoById } from "@/lib/db/queries/videos";
import { getFileUrl } from "@/lib/db/storage";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { withErrorHandler } from "@/lib/errors/middleware";

async function getRouteId(context: unknown): Promise<string> {
  const ctx = context as { params: Promise<{ id: string }> | { id: string } };
  const params = await Promise.resolve(ctx?.params);
  return (params as { id: string })?.id ?? "";
}

export const GET = withErrorHandler(async (_request: NextRequest, context: unknown) => {
  const { userId } = await auth();
  if (!userId) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED);
  }

  const id = await getRouteId(context);

  const dbUser = await getUserByClerkId(userId);
  if (!dbUser) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, "User not found");
  }

  const video = await getVideoById(id);
  if (!video || video.user_id !== dbUser.id) {
    throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, "Video not found");
  }

  // Sign the video URL for playback if available
  let signedVideoUrl: string | null = null;
  if (video.status === "completed" && video.storage_path) {
    const parts = video.storage_path.split("/");
    const filename = parts.slice(1).join("/");
    const uidPart = parts[0] ?? dbUser.id;
    signedVideoUrl = await getFileUrl("videos", uidPart, filename);
  }

  return NextResponse.json({
    data: {
      ...video,
      video_url: signedVideoUrl,
    },
  });
});

export const DELETE = withErrorHandler(async (_request: NextRequest, context: unknown) => {
  const { userId } = await auth();
  if (!userId) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED);
  }

  const id = await getRouteId(context);

  const dbUser = await getUserByClerkId(userId);
  if (!dbUser) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, "User not found");
  }

  await deleteVideoWithStorage(id, dbUser.id);

  return NextResponse.json({ data: { deleted: true } });
});
