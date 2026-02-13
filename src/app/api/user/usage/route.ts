// F009: GET /api/user/usage — credit balance + monthly usage stats

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getSubscriptionByClerkUserId } from "@/lib/db/queries/subscriptions";
import { getMonthlyUsageStats } from "@/lib/db/queries/usage";
import { getUserByClerkId } from "@/lib/db/queries/users";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { withErrorHandler } from "@/lib/errors/middleware";

export const GET = withErrorHandler(async (request: NextRequest) => {
  void request;
  const { userId } = await auth();
  if (!userId) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED);
  }

  const dbUser = await getUserByClerkId(userId);
  if (!dbUser) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, "User not found");
  }

  // Use billing_cycle_start from subscription as the "this month" window if available
  const subscription = await getSubscriptionByClerkUserId(userId);
  const billingCycleStart = subscription?.billing_cycle_start ?? undefined;

  const stats = await getMonthlyUsageStats(dbUser.id, billingCycleStart);

  return NextResponse.json({ data: stats });
});
