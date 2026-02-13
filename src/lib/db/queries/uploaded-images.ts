import { createSupabaseAdmin } from "@/lib/db/client";
import type {
  UploadedImage,
  UploadedImageInsert,
  PaginatedResult,
  PaginationParams,
} from "@/lib/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";

export async function createUploadedImage(data: UploadedImageInsert): Promise<UploadedImage> {
  const supabase = createSupabaseAdmin();
  const { data: image, error } = await supabase
    .from("uploaded_images")
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return image as UploadedImage;
}

export async function listImagesByUser(
  userId: string,
  params?: PaginationParams
): Promise<PaginatedResult<UploadedImage>> {
  const supabase = createSupabaseAdmin();
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: images, error, count } = await supabase
    .from("uploaded_images")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return {
    items: (images ?? []) as UploadedImage[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function listImagesByVideoId(videoId: string): Promise<UploadedImage[]> {
  const supabase = createSupabaseAdmin();
  const { data: images, error } = await supabase
    .from("uploaded_images")
    .select()
    .eq("video_id", videoId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return (images ?? []) as UploadedImage[];
}

export async function deleteUploadedImage(id: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("uploaded_images").delete().eq("id", id);

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }
}

export async function deleteUploadedImagesByVideoId(videoId: string): Promise<void> {
  const images = await listImagesByVideoId(videoId);
  for (const image of images) {
    await deleteUploadedImage(image.id);
  }
}
