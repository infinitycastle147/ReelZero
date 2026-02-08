import { createSupabaseAdmin } from "@/lib/db/client";
import type { GenerationLog, GenerationLogInsert, GenerationLogUpdate } from "@/lib/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";

export async function createGenerationLog(data: GenerationLogInsert): Promise<GenerationLog> {
  const supabase = createSupabaseAdmin();
  const { data: log, error } = await supabase
    .from("generation_logs")
    .insert({ ...data, status: data.status ?? "pending" })
    .select()
    .single();

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return log as GenerationLog;
}

export async function updateGenerationLog(
  id: string,
  data: GenerationLogUpdate
): Promise<GenerationLog> {
  const supabase = createSupabaseAdmin();
  const { data: log, error } = await supabase
    .from("generation_logs")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return log as GenerationLog;
}

export async function listLogsByVideoId(videoId: string): Promise<GenerationLog[]> {
  const supabase = createSupabaseAdmin();
  const { data: logs, error } = await supabase
    .from("generation_logs")
    .select()
    .eq("video_id", videoId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return (logs ?? []) as GenerationLog[];
}
