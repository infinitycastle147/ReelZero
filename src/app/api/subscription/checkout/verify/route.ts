import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getSubscriptionByClerkUserId } from "@/lib/db/queries/subscriptions";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { withErrorHandler } from "@/lib/errors/middleware";
import { stripe } from "@/lib/stripe/client";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { userId } = await auth();
  if (!userId) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED);
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId || !sessionId.startsWith("cs_")) {
    throw new AppError(ERROR_CODES.VALIDATION_INVALID_INPUT, "session_id is required");
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  // Ensure this session belongs to the current user
  if (session.client_reference_id !== userId) {
    throw new AppError(ERROR_CODES.AUTH_FORBIDDEN);
  }

  if (session.payment_status !== "paid" || session.status !== "complete") {
    return NextResponse.json({ data: { status: "pending", tier: null } });
  }

  // Fetch current subscription state from DB (webhook may have already fired)
  const subscription = await getSubscriptionByClerkUserId(userId);

  return NextResponse.json({
    data: {
      status: "complete",
      tier: subscription?.tier ?? (session.metadata?.tier as "basic" | "pro" | null),
      subscription: subscription
        ? {
            creditsTotal: subscription.credits_total,
            billingCycleEnd: subscription.billing_cycle_end,
          }
        : undefined,
    },
  });
});
