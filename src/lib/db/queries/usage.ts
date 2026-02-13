import { createSupabaseAdmin } from "@/lib/db/client";
import { getSubscriptionByUserId } from "@/lib/db/queries/subscriptions";
import type {
  UsageEntry,
  UsageEntryInsert,
  PaginatedResult,
  PaginationParams,
} from "@/lib/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import type { UsageStats } from "@/types/video";

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

/**
 * F009: Monthly usage stats for the dashboard (FR-013, US6).
 * billingCycleStart is used as the "this month" window start.
 * Falls back to calendar month start if not provided.
 */
export async function getMonthlyUsageStats(
  userId: string,
  billingCycleStart?: string
): Promise<UsageStats> {
  const supabase = createSupabaseAdmin();

  // Resolve credit balance from subscriptions
  const subscription = await getSubscriptionByUserId(userId);
  const creditsRemaining = subscription?.credits_remaining ?? 0;
  const creditsTotal = subscription?.credits_total ?? 0;
  const creditsUsed = subscription?.credits_used ?? 0;

  // Determine window start: billing cycle start or calendar month
  let windowStart: string;
  if (billingCycleStart) {
    windowStart = billingCycleStart;
  } else {
    const now = new Date();
    windowStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }

  // Query video_generated actions since window start
  const { data, error } = await supabase
    .from("usage_tracking")
    .select("created_at")
    .eq("user_id", userId)
    .eq("action", "video_generated")
    .gte("created_at", windowStart);

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  const entries = data ?? [];
  const videosThisMonth = entries.length;

  // Group by date (YYYY-MM-DD) for the bar chart
  const countsByDate = new Map<string, number>();
  for (const entry of entries) {
    const date = entry.created_at.slice(0, 10); // "YYYY-MM-DD"
    countsByDate.set(date, (countsByDate.get(date) ?? 0) + 1);
  }

  const dailyCounts = Array.from(countsByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return {
    creditsRemaining,
    creditsTotal,
    creditsUsed,
    videosThisMonth,
    dailyCounts,
  };
}
