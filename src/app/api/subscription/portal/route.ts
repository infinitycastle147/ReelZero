import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { checkRateLimit } from "@/lib/db/queries/rate-limits";
import { getSubscriptionByClerkUserId } from "@/lib/db/queries/subscriptions";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { withErrorHandler } from "@/lib/errors/middleware";
import { stripe } from "@/lib/stripe/client";

export const POST = withErrorHandler(async (request: NextRequest) => {
  void request; // Required by withErrorHandler signature; not used in this route
  const { userId } = await auth();
  if (!userId) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED);
  }

  // Rate limit: max 5 portal requests per 60 seconds per user
  const allowed = await checkRateLimit(userId, "portal", 5, 60);
  if (!allowed) {
    throw new AppError(ERROR_CODES.EXTERNAL_RATE_LIMITED);
  }

  const subscription = await getSubscriptionByClerkUserId(userId);

  if (!subscription?.stripe_customer_id) {
    throw new AppError(ERROR_CODES.SUBSCRIPTION_NOT_FOUND);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${appUrl}/billing`,
  });

  return NextResponse.json({ data: { portalUrl: portalSession.url } });
});
