import { PRICING_TIERS } from "@/lib/constants/pricing";
import { createSupabaseAdmin } from "@/lib/db/client";
import type {
  Subscription,
  SubscriptionInsert,
  SubscriptionUpdate,
  CreditCheckResult,
} from "@/lib/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";

export async function createSubscription(data: SubscriptionInsert): Promise<Subscription> {
  const supabase = createSupabaseAdmin();
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return subscription as Subscription;
}

export async function createFreeSubscription(userId: string): Promise<Subscription> {
  const freeTier = PRICING_TIERS.find((t) => t.id === "free");
  if (!freeTier) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, "Free tier configuration not found");
  }

  // Idempotent: check if subscription already exists before creating
  const existing = await getSubscriptionByUserId(userId);
  if (existing) {
    return existing;
  }

  return createSubscription({
    user_id: userId,
    tier: "free",
    status: "active",
    credits_total: freeTier.creditsPerMonth,
  });
}

export async function getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
  const supabase = createSupabaseAdmin();
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select()
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return subscription as Subscription | null;
}

/**
 * Look up a subscription by Clerk user ID.
 * Resolves clerk_user_id → users.id → subscriptions.user_id in one query.
 */
export async function getSubscriptionByClerkUserId(
  clerkUserId: string
): Promise<Subscription | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("subscriptions(*)")
    .eq("clerk_user_id", clerkUserId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  if (!data) return null;

  // Supabase returns a single object (not array) due to the unique constraint on user_id
  return (data.subscriptions as unknown as Subscription) ?? null;
}

export async function updateSubscription(
  userId: string,
  data: SubscriptionUpdate
): Promise<Subscription> {
  const supabase = createSupabaseAdmin();
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return subscription as Subscription;
}

export async function checkCredits(clerkUserId: string): Promise<CreditCheckResult> {
  const subscription = await getSubscriptionByClerkUserId(clerkUserId);

  if (!subscription) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, "Subscription not found for user");
  }

  return {
    creditsRemaining: subscription.credits_remaining,
    creditsTotal: subscription.credits_total,
    creditsUsed: subscription.credits_used,
    canGenerate: subscription.credits_remaining > 0,
  };
}

export async function reserveCredit(clerkUserId: string): Promise<boolean> {
  const subscription = await getSubscriptionByClerkUserId(clerkUserId);
  if (!subscription) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, "Subscription not found for user");
  }
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.rpc("reserve_credit", {
    p_user_id: subscription.user_id,
  });

  if (error) {
    throw new AppError(ERROR_CODES.CREDIT_RESERVATION_FAILED, error.message);
  }

  return data as boolean;
}

export async function refundCredit(clerkUserId: string): Promise<void> {
  const subscription = await getSubscriptionByClerkUserId(clerkUserId);
  if (!subscription) return; // Nothing to refund if no subscription
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.rpc("refund_credit", {
    p_user_id: subscription.user_id,
  });

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }
}

export async function getSubscriptionByStripeCustomerId(
  stripeCustomerId: string
): Promise<Subscription | null> {
  const supabase = createSupabaseAdmin();
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select()
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return subscription as Subscription | null;
}

export async function resetMonthlyCredits(
  userId: string,
  creditsTotal: number,
  cycleStart: string,
  cycleEnd: string
): Promise<Subscription> {
  return updateSubscription(userId, {
    credits_used: 0,
    credits_total: creditsTotal,
    billing_cycle_start: cycleStart,
    billing_cycle_end: cycleEnd,
    status: "active",
  });
}

export async function revertToFreeTier(userId: string): Promise<Subscription> {
  return updateSubscription(userId, {
    tier: "free",
    credits_total: 3,
    credits_used: 0,
    stripe_subscription_id: null,
    stripe_customer_id: null,
    status: "active",
  });
}
