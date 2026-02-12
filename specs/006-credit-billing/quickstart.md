# Quickstart: Credit System & Stripe Billing (F006)

**Branch**: `006-credit-billing` | **Date**: 2026-02-10

---

## Prerequisites

1. Node.js 20+, npm
2. Supabase project running (from F003)
3. Stripe account (test mode keys)
4. Stripe CLI installed (for local webhook forwarding)

---

## Environment Variables

Add to `.env.local`:

```bash
# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...          # from `stripe listen` output

# Stripe Price IDs (create in Stripe Dashboard → Products)
STRIPE_PRICE_BASIC_MONTHLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
```

---

## Stripe Setup (Test Mode)

1. **Create Products** in the Stripe Dashboard:
   - Product: "ReelZero Basic" → Price: $29.00/month recurring → copy Price ID → set `STRIPE_PRICE_BASIC_MONTHLY`
   - Product: "ReelZero Pro" → Price: $79.00/month recurring → copy Price ID → set `STRIPE_PRICE_PRO_MONTHLY`

2. **Enable Customer Portal** in Stripe Dashboard → Settings → Billing → Customer Portal:
   - Allow plan switching between Basic and Pro
   - Allow subscription cancellation
   - Allow payment method updates

3. **Forward webhooks locally**:
   ```bash
   stripe listen --forward-to localhost:3000/api/subscription/webhook
   ```
   Copy the `whsec_...` webhook signing secret → set `STRIPE_WEBHOOK_SECRET`.

---

## Database Migration

Run the new migration to add Stripe billing fields:

```bash
# Apply via Supabase CLI
supabase db push

# Or apply manually in Supabase Studio SQL editor:
# Run: supabase/migrations/20260210000000_add_stripe_billing.sql
```

Migration adds:
- `stripe_customer_id` column to `subscriptions`
- `past_due` and `trialing` to `status` CHECK constraint
- `stripe_webhook_events` idempotency table

---

## Install Stripe SDK

```bash
npm install stripe
```

Version: `^14.0.0` (Node.js Stripe SDK v14+ with TypeScript support built-in).

---

## Key Source Files for This Feature

```
src/
├── app/
│   ├── (dashboard)/billing/
│   │   ├── page.tsx                    # Billing page (plan + usage)
│   │   └── success/page.tsx            # Post-checkout pending/success page
│   └── api/
│       ├── subscription/
│       │   ├── checkout/
│       │   │   ├── route.ts            # POST /api/subscription/checkout
│       │   │   └── verify/route.ts     # GET /api/subscription/checkout/verify
│       │   ├── portal/route.ts         # POST /api/subscription/portal
│       │   └── webhook/route.ts        # POST /api/subscription/webhook
│       └── user/credits/route.ts       # GET /api/user/credits
├── components/billing/
│   ├── credit-display.tsx              # Header credit counter
│   ├── pricing-table.tsx               # 4-tier comparison cards
│   ├── subscription-card.tsx           # Current plan display
│   └── payment-failed-banner.tsx       # past_due warning banner
└── lib/
    ├── stripe/
    │   ├── client.ts                   # Stripe SDK singleton
    │   ├── products.ts                 # Tier → Price ID mapping
    │   └── webhooks.ts                 # Webhook event handlers
    └── db/queries/
        └── subscriptions.ts            # Extended with stripe_customer_id support

supabase/migrations/
└── 20260210000000_add_stripe_billing.sql

tests/
└── 006-credit-billing/
    ├── unit/
    │   ├── webhook-handlers.test.ts    # Event handler logic
    │   └── credit-operations.test.ts  # checkCredits, reserveCredit, refundCredit
    └── integration/
        └── subscription-flow.test.ts  # Checkout → webhook → credit update
```

---

## Running Locally

```bash
# Start the dev server
npm run dev

# In a separate terminal, forward Stripe webhooks
stripe listen --forward-to localhost:3000/api/subscription/webhook

# Trigger test events manually
stripe trigger checkout.session.completed
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.deleted
```

---

## Test Cards (Stripe Test Mode)

| Scenario | Card Number |
|---|---|
| Successful payment | `4242 4242 4242 4242` |
| Payment declined | `4000 0000 0000 0002` |
| Requires 3D Secure | `4000 0025 0000 3155` |
| Always fails after attach | `4000 0000 0000 0341` |

Use any future expiry, any 3-digit CVC, any ZIP.

---

## Constitution Compliance Checklist

- [ ] Stripe SDK calls only through `src/lib/stripe/` — no direct Stripe calls in route handlers
- [ ] All DB access through `src/lib/db/queries/subscriptions.ts`
- [ ] API responses use `{ data: T }` / `{ error: { code, message } }` format
- [ ] All error throws use `AppError` + `ERROR_CODES`
- [ ] No `any` types — use `Stripe.Event`, `Stripe.Subscription`, etc.
- [ ] New error codes added to `src/lib/errors/codes.ts` (e.g., `STRIPE_WEBHOOK_INVALID`, `SUBSCRIPTION_NOT_FOUND`)
- [ ] Webhook endpoint uses `request.text()` (not `request.json()`) for signature verification
- [ ] `stripe_webhook_events` insert used before every event handler dispatch
