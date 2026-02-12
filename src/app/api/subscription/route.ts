import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createSupabaseAdmin } from "@/lib/db/client";
import { getSubscriptionByClerkUserId } from "@/lib/db/queries/subscriptions";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { withErrorHandler } from "@/lib/errors/middleware";

export const GET = withErrorHandler(async (request: NextRequest) => {
  void request; // Required by withErrorHandler signature; not used in this route
  const { userId } = await auth();
  if (!userId) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED);
  }

  const subscription = await getSubscriptionByClerkUserId(userId);

  if (!subscription) {
    throw new AppError(ERROR_CODES.SUBSCRIPTION_NOT_FOUND);
  }

  const supabase = createSupabaseAdmin();
  const internalUserId = subscription.user_id;

  // Count videos created this billing cycle
  const cycleStart = subscription.billing_cycle_start ?? new Date(0).toISOString();
  const cycleEnd = subscription.billing_cycle_end ?? new Date().toISOString();

  const { count: videosCount } = await supabase
    .from("videos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", internalUserId)
    .gte("created_at", cycleStart)
    .lte("created_at", cycleEnd);

  // Sum storage used by videos
  const { data: videoStorage } = await supabase
    .from("videos")
    .select("file_size_bytes")
    .eq("user_id", internalUserId)
    .not("file_size_bytes", "is", null);

  // Sum storage used by uploaded images
  const { data: imageStorage } = await supabase
    .from("uploaded_images")
    .select("file_size_bytes")
    .eq("user_id", internalUserId);

  const videoBytes =
    videoStorage?.reduce((acc, v) => acc + (v.file_size_bytes ?? 0), 0) ?? 0;
  const imageBytes =
    imageStorage?.reduce((acc, i) => acc + (i.file_size_bytes ?? 0), 0) ?? 0;

  return NextResponse.json({
    data: {
      subscription: {
        id: subscription.id,
        tier: subscription.tier,
        status: subscription.status,
        creditsTotal: subscription.credits_total,
        creditsUsed: subscription.credits_used,
        creditsRemaining: subscription.credits_remaining,
        billingCycleStart: subscription.billing_cycle_start,
        billingCycleEnd: subscription.billing_cycle_end,
        hasStripeSubscription: subscription.stripe_subscription_id !== null,
      },
      usage: {
        videosCreatedThisMonth: videosCount ?? 0,
        storageUsedBytes: videoBytes + imageBytes,
      },
    },
  });
});
