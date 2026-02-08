import { createSupabaseAdmin } from "@/lib/db/client";
import type {
  UsageEntry,
  UsageEntryInsert,
  PaginatedResult,
  PaginationParams,
} from "@/lib/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";

export type UsageStatsResult = {
  totalCreditsUsed: number;
  actionCount: number;
};

export async function logAction(data: UsageEntryInsert): Promise<UsageEntry> {
  const supabase = createSupabaseAdmin();
  const { data: entry, error } = await supabase
    .from("usage_tracking")
    .insert({
      user_id: data.user_id,
      action: data.action,
      credits_used: data.credits_used ?? 0,
      metadata: data.metadata ?? {},
    })
    .select()
    .single();

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return entry as UsageEntry;
}

export async function listActionsByUser(
  userId: string,
  params?: PaginationParams & { startDate?: string; endDate?: string }
): Promise<PaginatedResult<UsageEntry>> {
  const supabase = createSupabaseAdmin();
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("usage_tracking")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (params?.startDate) {
    query = query.gte("created_at", params.startDate);
  }

  if (params?.endDate) {
    query = query.lte("created_at", params.endDate);
  }

  const { data: entries, error, count } = await query.range(from, to);

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return {
    items: (entries ?? []) as UsageEntry[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getUsageStats(userId: string): Promise<UsageStatsResult> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("usage_tracking")
    .select("credits_used")
    .eq("user_id", userId);

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  const entries = data ?? [];
  const totalCreditsUsed = entries.reduce((sum, e) => sum + (e.credits_used ?? 0), 0);

  return {
    totalCreditsUsed,
    actionCount: entries.length,
  };
}
