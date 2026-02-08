import { createSupabaseAdmin } from "@/lib/db/client";
import type {
  Video,
  VideoInsert,
  VideoUpdate,
  PaginatedResult,
  PaginationParams,
} from "@/lib/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";

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
