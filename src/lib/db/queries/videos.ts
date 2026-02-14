import { createSupabaseAdmin } from "@/lib/db/client";
import { deleteUploadedImagesByVideoId, listImagesByVideoId } from "@/lib/db/queries/uploaded-images";
import type {
  Video,
  VideoInsert,
  VideoUpdate,
  PaginatedResult,
  PaginationParams,
} from "@/lib/db/schema";
import { deleteFile } from "@/lib/db/storage";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import type { VideoListParams } from "@/types/video";

export async function createVideo(data: VideoInsert): Promise<Video> {
  const supabase = createSupabaseAdmin();
  const { data: video, error } = await supabase
    .from("videos")
    .insert({ ...data, status: "processing" })
    .select()
    .single();

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return video as Video;
}

export async function getVideoById(id: string): Promise<Video | null> {
  const supabase = createSupabaseAdmin();
  const { data: video, error } = await supabase
    .from("videos")
    .select()
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return video as Video | null;
}

export async function listVideosByUser(
  userId: string,
  params?: PaginationParams
): Promise<PaginatedResult<Video>> {
  const supabase = createSupabaseAdmin();
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: videos, error, count } = await supabase
    .from("videos")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return {
    items: (videos ?? []) as Video[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function updateVideo(id: string, data: VideoUpdate): Promise<Video> {
  const supabase = createSupabaseAdmin();
  const { data: video, error } = await supabase
    .from("videos")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return video as Video;
}

export async function deleteVideo(id: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("videos").delete().eq("id", id);

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }
}

export type PaginatedVideoResult = PaginatedResult<Video> & { totalPages: number };

/**
 * F009: Filtered, paginated video list with check-on-read timeout (FR-020).
 * Automatically marks videos processing >30 min as 'failed' before querying.
 */
export async function listVideosFiltered(
  userId: string,
  params?: VideoListParams
): Promise<PaginatedVideoResult> {
  const supabase = createSupabaseAdmin();
  const page = params?.page ?? 1;
  const pageSize = Math.min(params?.pageSize ?? 12, 12);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Check-on-read: mark stale processing videos as failed (FR-020, D2)
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  await supabase
    .from("videos")
    .update({ status: "failed", current_stage: null, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "processing")
    .lt("metadata->>renderStartedAt", thirtyMinutesAgo);

  // Build search/filter query
  let query = supabase
    .from("videos")
    .select("*", { count: "exact" })
    .eq("user_id", userId);

  // Full-text search on title OR prompt (case-insensitive substring)
  if (params?.search) {
    const term = `%${params.search}%`;
    query = query.or(`title.ilike.${term},prompt.ilike.${term}`);
  }

  // Date range filter
  if (params?.dateFilter && params.dateFilter !== "all") {
    const now = new Date();
    let startDate: string;
    if (params.dateFilter === "today") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      startDate = start.toISOString();
    } else if (params.dateFilter === "this_week") {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      startDate = start.toISOString();
    } else {
      // this_month
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = start.toISOString();
    }
    query = query.gte("created_at", startDate);
  }

  // Sort direction
  const ascending = params?.sort === "oldest";
  query = query.order("created_at", { ascending });

  const { data: videos, error, count } = await query.range(from, to);

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  const total = count ?? 0;
  return {
    items: (videos ?? []) as Video[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * F009: Atomic delete — remove all storage files first, then delete DB row (D3).
 * If ANY storage deletion fails, re-throws STORAGE_DELETE_FAILED; DB row is preserved.
 */
export async function deleteVideoWithStorage(videoId: string, userId: string): Promise<void> {
  const video = await getVideoById(videoId);
  if (!video) {
    throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, "Video not found");
  }
  if (video.user_id !== userId) {
    throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, "Video not found");
  }

  // Gather scene image storage paths
  const uploadedImages = await listImagesByVideoId(videoId);

  try {
    // Delete MP4 from videos bucket
    if (video.storage_path) {
      const parts = video.storage_path.split("/");
      const filename = parts.slice(1).join("/");
      const uidPart = parts[0] ?? userId;
      await deleteFile("videos", uidPart, filename);
    }

    // Delete audio from audio bucket (stored in metadata.audioStoragePath)
    const metadata = video.metadata as { audioStoragePath?: string };
    if (metadata.audioStoragePath) {
      const parts = metadata.audioStoragePath.split("/");
      const filename = parts.slice(1).join("/");
      const uidPart = parts[0] ?? userId;
      await deleteFile("audio", uidPart, filename);
    }

    // Delete thumbnail from thumbnails bucket
    if (video.thumbnail_url) {
      // thumbnail_url is a public URL — extract the path component after the bucket name
      const match = /thumbnails\/(.+)$/.exec(video.thumbnail_url);
      if (match?.[1]) {
        const storagePath = decodeURIComponent(match[1]);
        const parts = storagePath.split("/");
        const filename = parts.slice(1).join("/");
        const uidPart = parts[0] ?? userId;
        await deleteFile("thumbnails", uidPart, filename);
      }
    }

    // Delete each scene image from images bucket
    for (const image of uploadedImages) {
      const parts = image.storage_path.split("/");
      const filename = parts.slice(1).join("/");
      const uidPart = parts[0] ?? userId;
      await deleteFile("images", uidPart, filename);
    }
  } catch {
    // Storage deletion failed — preserve DB row, surface retryable error (D3)
    throw new AppError(ERROR_CODES.STORAGE_DELETE_FAILED, "Failed to delete video files. Please try again.");
  }

  // All storage files deleted — now remove DB records
  await deleteVideo(videoId);
  await deleteUploadedImagesByVideoId(videoId);
}

/**
 * F008: Concurrent render guard.
 * Returns the first video with status='processing' for the given user, or null.
 * Used to enforce FR-018: max 1 concurrent render per user.
 */
export async function getProcessingVideoByUserId(userId: string): Promise<Video | null> {
  const supabase = createSupabaseAdmin();
  const { data: video, error } = await supabase
    .from("videos")
    .select()
    .eq("user_id", userId)
    .eq("status", "processing")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return video as Video | null;
}
