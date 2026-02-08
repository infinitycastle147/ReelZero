import { createSupabaseAdmin } from "@/lib/db/client";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";

export type StorageBucket = "videos" | "images" | "audio" | "thumbnails";

// Private buckets require signed URLs; thumbnails are public
const PRIVATE_BUCKETS: StorageBucket[] = ["videos", "images", "audio"];
const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

function buildPath(userId: string, filename: string): string {
  return `${userId}/${filename}`;
}

export async function uploadFile(
  bucket: StorageBucket,
  userId: string,
  filename: string,
  file: Blob | Buffer,
  contentType: string
): Promise<string> {
  const supabase = createSupabaseAdmin();
  const path = buildPath(userId, filename);

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new AppError(ERROR_CODES.STORAGE_UPLOAD_FAILED, error.message);
  }

  return path;
}

export async function getFileUrl(
  bucket: StorageBucket,
  userId: string,
  filename: string
): Promise<string> {
  const supabase = createSupabaseAdmin();
  const path = buildPath(userId, filename);

  if (PRIVATE_BUCKETS.includes(bucket)) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);

    if (error || !data?.signedUrl) {
      throw new AppError(ERROR_CODES.STORAGE_FILE_NOT_FOUND, error?.message ?? "Failed to create signed URL");
    }

    return data.signedUrl;
  }

  // Public bucket (thumbnails)
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFile(
  bucket: StorageBucket,
  userId: string,
  filename: string
): Promise<void> {
  const supabase = createSupabaseAdmin();
  const path = buildPath(userId, filename);

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }
}

export async function listFiles(
  bucket: StorageBucket,
  userId: string
): Promise<string[]> {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase.storage.from(bucket).list(userId);

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return (data ?? []).map((file) => buildPath(userId, file.name));
}
