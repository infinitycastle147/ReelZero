import type { Subscription } from "@/lib/db/schema";

export const STRIPE_PRICES: Record<"basic" | "pro", string> = {
  basic: process.env.STRIPE_PRICE_BASIC_MONTHLY ?? "",
  pro: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
};

export const TIER_CREDIT_ALLOTMENT: Record<Subscription["tier"], number> = {
  free: 3,
  basic: 30,
  pro: 100,
  enterprise: 999,
};
