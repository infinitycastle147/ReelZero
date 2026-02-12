import type Stripe from "stripe";

import { recordWebhookEvent } from "@/lib/db/queries/stripe-webhook-events";
import {
  getSubscriptionByStripeCustomerId,
  resetMonthlyCredits,
  revertToFreeTier,
  updateSubscription,
} from "@/lib/db/queries/subscriptions";
import { TIER_CREDIT_ALLOTMENT } from "@/lib/stripe/products";

/**
 * Resolves user ID from a Stripe customer ID.
 * Returns null if no subscription found (unknown customer — safe to skip).
 */
async function resolveUserId(stripeCustomerId: string): Promise<string | null> {
  const subscription = await getSubscriptionByStripeCustomerId(stripeCustomerId);
  return subscription?.user_id ?? null;
}

/**
 * Checks idempotency guard. Returns true if event should be processed (new),
 * false if already processed (duplicate — skip).
 */
async function shouldProcess(event: Stripe.Event): Promise<boolean> {
  return recordWebhookEvent(event.id, event.type);
}

// ── Handler: checkout.session.completed ────────────────────────────────────────

export async function handleCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
  if (!(await shouldProcess(event))) return;

  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.client_reference_id;
  const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
  const stripeSubscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;

  if (!userId) {
    console.error("[webhook] checkout.session.completed: missing client_reference_id", {
      sessionId: session.id,
    });
    return;
  }

  // Determine tier from subscription's price
  let tier: "basic" | "pro" = "basic";
  if (session.metadata?.tier === "pro") {
    tier = "pro";
  }

  const creditsTotal = TIER_CREDIT_ALLOTMENT[tier];
  const now = new Date();
  const cycleStart = now.toISOString().split("T")[0];
  const cycleEnd = new Date(now.setMonth(now.getMonth() + 1)).toISOString().split("T")[0];

  await updateSubscription(userId, {
    tier,
    status: "active",
    stripe_subscription_id: stripeSubscriptionId,
    stripe_customer_id: stripeCustomerId,
    credits_total: creditsTotal,
    credits_used: 0,
    billing_cycle_start: cycleStart,
    billing_cycle_end: cycleEnd,
  });
}

// ── Handler: invoice.paid ───────────────────────────────────────────────────────

export async function handleInvoicePaid(event: Stripe.Event): Promise<void> {
  if (!(await shouldProcess(event))) return;

  const invoice = event.data.object as Stripe.Invoice;
  const stripeCustomerId = typeof invoice.customer === "string" ? invoice.customer : null;

  if (!stripeCustomerId) return;

  const userId = await resolveUserId(stripeCustomerId);
  if (!userId) return;

  const subscription = await getSubscriptionByStripeCustomerId(stripeCustomerId);
  if (!subscription) return;

  const creditsTotal = TIER_CREDIT_ALLOTMENT[subscription.tier];

  // Extract billing cycle from invoice period
  const periodStart = invoice.period_start
    ? new Date(invoice.period_start * 1000).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];
  const periodEnd = invoice.period_end
    ? new Date(invoice.period_end * 1000).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  await resetMonthlyCredits(userId, creditsTotal, periodStart, periodEnd);
}

// ── Handler: invoice.payment_failed ────────────────────────────────────────────

export async function handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
  if (!(await shouldProcess(event))) return;

  const invoice = event.data.object as Stripe.Invoice;
  const stripeCustomerId = typeof invoice.customer === "string" ? invoice.customer : null;

  if (!stripeCustomerId) return;

  const userId = await resolveUserId(stripeCustomerId);
  if (!userId) return;

  await updateSubscription(userId, { status: "past_due" });
}

// ── Handler: customer.subscription.updated ─────────────────────────────────────

export async function handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  if (!(await shouldProcess(event))) return;

  const stripeSub = event.data.object as Stripe.Subscription;
  const stripeCustomerId =
    typeof stripeSub.customer === "string" ? stripeSub.customer : null;

  if (!stripeCustomerId) return;

  const userId = await resolveUserId(stripeCustomerId);
  if (!userId) return;

  const stripeStatus = stripeSub.status;

  // If subscription is canceled, revert to Free tier
  if (stripeStatus === "canceled") {
    await revertToFreeTier(userId);
    return;
  }

  // Map Stripe status to our status
  type OurStatus = "active" | "canceled" | "past_due" | "trialing";
  const statusMap: Record<string, OurStatus> = {
    active: "active",
    past_due: "past_due",
    trialing: "trialing",
    canceled: "canceled",
  };
  const status: OurStatus = statusMap[stripeStatus] ?? "active";

  // Derive tier from subscription's price
  const priceId = stripeSub.items.data[0]?.price.id ?? "";
  const tierFromPrice = resolveTierFromPriceId(priceId);

  const cycleStart = new Date(stripeSub.current_period_start * 1000)
    .toISOString()
    .split("T")[0];
  const cycleEnd = new Date(stripeSub.current_period_end * 1000)
    .toISOString()
    .split("T")[0];

  await updateSubscription(userId, {
    tier: tierFromPrice,
    status,
    billing_cycle_start: cycleStart,
    billing_cycle_end: cycleEnd,
  });
}

// ── Handler: customer.subscription.deleted ─────────────────────────────────────

export async function handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
  if (!(await shouldProcess(event))) return;

  const stripeSub = event.data.object as Stripe.Subscription;
  const stripeCustomerId =
    typeof stripeSub.customer === "string" ? stripeSub.customer : null;

  if (!stripeCustomerId) return;

  const userId = await resolveUserId(stripeCustomerId);
  if (!userId) return;

  await revertToFreeTier(userId);
}

// ── Helper: Resolve tier from Stripe Price ID ───────────────────────────────────

function resolveTierFromPriceId(
  priceId: string
): "free" | "basic" | "pro" | "enterprise" {
  const basicPriceId = process.env.STRIPE_PRICE_BASIC_MONTHLY ?? "";
  const proPriceId = process.env.STRIPE_PRICE_PRO_MONTHLY ?? "";

  if (priceId === basicPriceId) return "basic";
  if (priceId === proPriceId) return "pro";

  // Fallback: keep existing tier (unknown price = enterprise or no change)
  return "enterprise";
}
