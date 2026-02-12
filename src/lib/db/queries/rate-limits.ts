import { createSupabaseAdmin } from "@/lib/db/client";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";

/**
 * Supabase-backed rate limiter.
 *
 * Counts rows in `usage_tracking` for the given `action` within a sliding
 * time window. Reuses the existing table — no new table required.
 *
 * NOTE: In-memory counters are explicitly forbidden here as Vercel serverless
 * instances do not share state between invocations.
 *
 * @param userId       Clerk user ID
 * @param action       Unique action identifier (e.g. 'checkout', 'portal')
 * @param maxRequests  Maximum allowed requests within the window
 * @param windowSeconds  Time window size in seconds
 * @returns `true` if the request is allowed, `false` if rate limit exceeded
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  maxRequests: number,
  windowSeconds: number
): Promise<boolean> {
  const supabase = createSupabaseAdmin();

  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { count, error } = await supabase
    .from("usage_tracking")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", windowStart);

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return (count ?? 0) < maxRequests;
}
