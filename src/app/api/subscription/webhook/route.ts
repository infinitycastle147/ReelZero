import type { NextRequest } from "next/server";
import type Stripe from "stripe";

import { stripe } from "@/lib/stripe/client";
import {
  handleCheckoutSessionCompleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from "@/lib/stripe/webhooks";

// Stripe SDK requires Node.js runtime (not Edge)
export const runtime = "nodejs";

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest): Promise<Response> {
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    console.error("[webhook] missing stripe-signature header", {
      url: request.url,
    });
    return new Response("Missing signature", { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[webhook] signature verification failed", { error: message });
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;
      default:
        // Unhandled event type — acknowledge receipt without processing
        break;
    }
  } catch (err) {
    console.error("[webhook] handler error", { type: event.type, error: err });
    // Return 500 so Stripe will retry
    return new Response("Handler error", { status: 500 });
  }

  return Response.json({ received: true });
}
