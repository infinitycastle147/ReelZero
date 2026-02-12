import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { checkRateLimit } from "@/lib/db/queries/rate-limits";
import {
  getSubscriptionByClerkUserId,
  updateSubscription,
} from "@/lib/db/queries/subscriptions";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { withErrorHandler } from "@/lib/errors/middleware";
import { stripe } from "@/lib/stripe/client";
import { STRIPE_PRICES } from "@/lib/stripe/products";

type CheckoutRequestBody = {
  tier: "basic" | "pro";
};

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { userId } = await auth();
  if (!userId) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED);
  }

  // Rate limit: max 5 checkout attempts per 60 seconds per user
  const allowed = await checkRateLimit(userId, "checkout", 5, 60);
  if (!allowed) {
    throw new AppError(ERROR_CODES.EXTERNAL_RATE_LIMITED);
  }

  const body = (await request.json()) as CheckoutRequestBody;

  if (!body.tier || !["basic", "pro"].includes(body.tier)) {
    throw new AppError(
      ERROR_CODES.VALIDATION_INVALID_INPUT,
      "tier must be 'basic' or 'pro'"
    );
  }

  const subscription = await getSubscriptionByClerkUserId(userId);

  // Only Free-tier users can initiate checkout; existing paid users use the portal
  if (subscription && subscription.tier !== "free") {
    throw new AppError(ERROR_CODES.SUBSCRIPTION_ALREADY_PAID);
  }

  // Create or retrieve Stripe Customer
  let stripeCustomerId = subscription?.stripe_customer_id ?? null;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      metadata: { userId },
    });
    stripeCustomerId = customer.id;

    // Persist customer ID on the subscription record
    if (subscription) {
      await updateSubscription(subscription.user_id, { stripe_customer_id: stripeCustomerId });
    }
  }

  const priceId = STRIPE_PRICES[body.tier];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    client_reference_id: userId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/billing?canceled=true`,
    metadata: { tier: body.tier },
    subscription_data: {
      metadata: { tier: body.tier, userId },
    },
  });

  return NextResponse.json({ data: { checkoutUrl: session.url } });
});
