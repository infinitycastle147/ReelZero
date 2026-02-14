// F008: GET /api/video/render/status?videoId=<uuid>
// Client polls this every 3s to get current render status.
// Returns status, currentStage, videoUrl (fresh signed URL), and error.

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getUserByClerkId } from "@/lib/db/queries/users";
import { getVideoById } from "@/lib/db/queries/videos";
import { getFileUrl } from "@/lib/db/storage";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { withErrorHandler } from "@/lib/errors/middleware";
import type { RenderStatusResponse } from "@/types/render";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { userId } = await auth();
  if (!userId) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED);
  }

  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");

  if (!videoId) {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "videoId query param is required");
  }

  // Resolve Clerk ID → Supabase UUID (videos.user_id is a UUID FK)
  const dbUser = await getUserByClerkId(userId);
  if (!dbUser) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, "User not found");
  }

  const video = await getVideoById(videoId);
  if (!video) {
    throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, "Video not found");
  }

  if (video.user_id !== dbUser.id) {
    throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, "Video does not belong to current user");
  }

  // Build fresh signed URL when completed
  // video.storage_path stores the Supabase storage object path (e.g., "userId/videoId.mp4")
  let videoUrl: string | null = null;
  if (video.status === "completed" && video.storage_path) {
    const pathParts = video.storage_path.split("/");
    const storedUserId = pathParts[0] ?? userId;
    const filename = pathParts.slice(1).join("/") || video.storage_path;
    videoUrl = await getFileUrl("videos", storedUserId, filename);
  } else if (video.status === "completed" && video.video_url) {
    // Fallback: video_url was stored directly (e.g., from /complete route)
    videoUrl = video.video_url;
  }

  // Extract error message from metadata if failed
  const metadata = video.metadata as { renderError?: string } | null;
  const errorMessage =
    video.status === "failed" ? (metadata?.renderError ?? "Rendering failed") : null;

  const response: RenderStatusResponse = {
    status: video.status,
    currentStage: video.current_stage ?? null,
    videoUrl,
    error: errorMessage,
  };

  return NextResponse.json({ data: response });
});
