import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { checkCredits, getSubscriptionByClerkUserId } from "@/lib/db/queries/subscriptions";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { withErrorHandler } from "@/lib/errors/middleware";

export const GET = withErrorHandler(async (request: NextRequest) => {
  void request; // Required by withErrorHandler signature; not used in this route
  const { userId } = await auth();
  if (!userId) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED);
  }

  const [credits, subscription] = await Promise.all([
    checkCredits(userId),
    getSubscriptionByClerkUserId(userId),
  ]);

  return NextResponse.json({
    data: {
      creditsRemaining: credits.creditsRemaining,
      creditsTotal: credits.creditsTotal,
      creditsUsed: credits.creditsUsed,
      canGenerate: credits.canGenerate,
      tier: subscription?.tier ?? "free",
      status: subscription?.status ?? "active",
    },
  });
});
