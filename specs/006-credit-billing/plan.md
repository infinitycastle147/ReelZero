# Implementation Plan: Credit System & Stripe Billing

**Branch**: `006-credit-billing` | **Date**: 2026-02-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-credit-billing/spec.md`

## Summary

Implement Stripe-powered subscription billing with four tiers (Free/Basic/Pro/Enterprise), monthly credit tracking enforced server-side, a Stripe Checkout flow for first-time paid subscriptions, a Customer Portal for plan management, and a webhook pipeline that keeps local subscription and credit state in sync. The foundation (DB schema, credit RPC functions, `subscriptions` query layer) was scaffolded in F003/F004; this feature completes and wires everything up.

## Technical Context

**Language/Version**: TypeScript 5+ (strict mode), Next.js 16+ (App Router)
**Primary Dependencies**: `stripe` ^14.0.0 (new), `@clerk/nextjs` (existing), `@supabase/supabase-js` (existing), `svix` (existing for Clerk webhook; Stripe uses its own `stripe.webhooks.constructEvent`)
**Storage**: Supabase PostgreSQL (`subscriptions` table + new `stripe_webhook_events` table)
**Testing**: Vitest (project standard), collocated `.test.ts` files
**Target Platform**: Vercel (Next.js serverless functions)
**Performance Goals**: Webhook processing < 10 seconds (SC-003); credit check < 200ms (synchronous path before generation)
**Constraints**: Vercel serverless timeout (10s default); webhook endpoint must use `request.text()` not `request.json()`; Stripe SDK must not be instantiated in client components
**Scale/Scope**: MVP — <100 concurrent users; single subscription per user

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. AI Provider Abstraction | ✅ Pass | No AI calls in this feature |
| II. Strict Type Safety | ✅ Pass | `Stripe.Event`, `Stripe.Subscription` types used; no `any`; new error codes added |
| III. Direct Imports Only | ✅ Pass | No barrel files; direct imports from `@/lib/stripe/client`, `@/lib/db/queries/subscriptions` |
| IV. Database Abstraction | ✅ Pass | All DB access via `src/lib/db/queries/subscriptions.ts`; no raw Supabase calls in route handlers |
| V. Microservice Boundary | ✅ Pass | All billing in Main App (Vercel); no Renderer involvement |
| VI. Credit-Gated Operations | ✅ Pass | This feature implements the credit gate; `checkCredits` + `reserveCredit` + `refundCredit` complete |
| VII. Naming & Structure | ✅ Pass | kebab-case files, `SCREAMING_SNAKE_CASE` constants, `isLoading`/`hasCredits` booleans |

**Post-design re-check**: All principles satisfied. No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/006-credit-billing/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (dashboard)/
│   │   └── billing/
│   │       ├── page.tsx                     # Billing dashboard page
│   │       └── success/
│   │           └── page.tsx                 # Post-checkout pending/success page
│   └── api/
│       ├── subscription/
│       │   ├── checkout/
│       │   │   ├── route.ts                 # POST — create checkout session
│       │   │   └── verify/
│       │   │       └── route.ts             # GET — verify checkout session
│       │   ├── portal/
│       │   │   └── route.ts                 # POST — create portal session
│       │   └── webhook/
│       │       └── route.ts                 # POST — Stripe webhook receiver
│       └── user/
│           └── credits/
│               └── route.ts                 # GET — credit balance
├── components/
│   └── billing/
│       ├── credit-display.tsx               # Header counter component
│       ├── pricing-table.tsx                # 4-tier card grid
│       ├── subscription-card.tsx            # Current plan display
│       └── payment-failed-banner.tsx        # past_due warning
├── lib/
│   ├── stripe/
│   │   ├── client.ts                        # Stripe SDK singleton
│   │   ├── products.ts                      # Tier → Price ID constants
│   │   └── webhooks.ts                      # Webhook event handler dispatch
│   ├── db/
│   │   └── queries/
│   │       └── subscriptions.ts             # Extended (stripe_customer_id, resetCredits)
│   ├── errors/
│   │   └── codes.ts                         # Add STRIPE_WEBHOOK_INVALID, SUBSCRIPTION_NOT_FOUND
│   └── constants/
│       └── pricing.ts                       # Align to PRD tier values
└── types/
    └── database.ts                          # Extend DbSubscription (past_due, trialing, stripe_customer_id)

supabase/migrations/
└── 20260210000000_add_stripe_billing.sql    # stripe_customer_id, status constraint, stripe_webhook_events

tests/
└── 006-credit-billing/
    ├── unit/
    │   ├── webhook-handlers.test.ts
    │   └── credit-operations.test.ts
    └── integration/
        └── subscription-flow.test.ts
```

**Structure Decision**: Next.js App Router monorepo (single project). Stripe lib abstracted in `src/lib/stripe/` per Constitution Principle IV pattern (parallels `src/lib/ai/`). Route handlers delegate to lib functions — no business logic in route files.

## Phase 0: Research Summary

All unknowns resolved. See [research.md](./research.md) for full findings.

| Unknown | Resolution |
|---|---|
| Checkout success before webhook | `{CHECKOUT_SESSION_ID}` in `success_url` → server-side session retrieval to confirm `status === 'complete'` |
| Portal return — plan change detection | Webhook only (`customer.subscription.updated`); return URL has no params |
| Webhook idempotency | `stripe_webhook_events` table + `INSERT ON CONFLICT DO NOTHING` |
| Webhook body in App Router | `await request.text()` → `stripe.webhooks.constructEvent()` |
| Grace period block trigger | Only `status === 'canceled'` or `customer.subscription.deleted`; `past_due` does not block |
| `deduct_credit` RPC | Not needed; two-function (reserve + refund) pattern is sufficient |
| Monthly credit reset SQL | `updateSubscription()` called in `invoice.paid` handler with `credits_used: 0` |

## Phase 1: Design

### Data Model

See [data-model.md](./data-model.md).

**Key decisions**:
- Add `stripe_customer_id TEXT UNIQUE NULL` to `subscriptions` (new migration)
- Extend `status` CHECK constraint with `'past_due'` and `'trialing'`
- New `stripe_webhook_events` table for idempotency
- Existing `reserve_credit` and `refund_credit` RPCs are correct — no changes
- No `deduct_credit` RPC

### API Contracts

See [contracts/api.md](./contracts/api.md).

**Endpoints**:
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/user/credits` | Header credit counter data |
| `GET` | `/api/subscription` | Billing page — full subscription + usage stats |
| `POST` | `/api/subscription/checkout` | Create Stripe Checkout Session (Free → paid) |
| `GET` | `/api/subscription/checkout/verify` | Verify checkout session post-redirect |
| `POST` | `/api/subscription/portal` | Create Stripe Customer Portal Session |
| `POST` | `/api/subscription/webhook` | Stripe webhook receiver |

### Stripe Webhook Handlers

Implemented in `src/lib/stripe/webhooks.ts` as named handler functions — never directly in the route:

```text
handleCheckoutSessionCompleted(event)
  → updateSubscription(userId, { tier, status: 'active', stripe_subscription_id, stripe_customer_id, billing_cycle_start, billing_cycle_end, credits_total })

handleInvoicePaid(event)
  → updateSubscription(userId, { credits_used: 0, credits_total, billing_cycle_start, billing_cycle_end, status: 'active' })

handleInvoicePaymentFailed(event)
  → updateSubscription(userId, { status: 'past_due' })

handleSubscriptionUpdated(event)
  → updateSubscription(userId, { tier, status, billing_cycle_start, billing_cycle_end })
  → if status === 'canceled': revert to Free tier values

handleSubscriptionDeleted(event)
  → updateSubscription(userId, { tier: 'free', credits_total: 3, credits_used: 0, stripe_subscription_id: null, status: 'active' })
```

User ID resolution: `stripe_customer_id` → `getSubscriptionByStripeCustomerId(stripeCustomerId)` → `user_id`.

### UI Architecture

**Billing page** (`(dashboard)/billing/page.tsx`): Server component fetching `/api/subscription`. Renders `SubscriptionCard` + `PricingTable` + usage stats. Client-side interactions (checkout/portal) use server actions or API calls.

**Success page** (`billing/success/page.tsx`): Client component. Reads `session_id` from URL. Calls `GET /api/subscription/checkout/verify` every 2s (max 15 attempts). Shows "Upgrading your plan…" skeleton until `status === 'complete'` or timeout (fallback: redirect to `/billing`).

**Credit display** (`components/billing/credit-display.tsx`): Client component in `dashboard-header.tsx`. Fetches `/api/user/credits` on mount and after generation completes (via Zustand store event).

**Payment failed banner**: Conditionally rendered in dashboard layout when subscription `status === 'past_due'`.

### New Error Codes

Add to `src/lib/errors/codes.ts`:
```typescript
STRIPE_WEBHOOK_INVALID: 'STRIPE_WEBHOOK_INVALID',
STRIPE_CHECKOUT_FAILED: 'STRIPE_CHECKOUT_FAILED',
SUBSCRIPTION_NOT_FOUND: 'SUBSCRIPTION_NOT_FOUND',
SUBSCRIPTION_ALREADY_PAID: 'SUBSCRIPTION_ALREADY_PAID',
```

### Pricing Constants Alignment

`src/lib/constants/pricing.ts` currently has incorrect values vs. PRD (e.g., Basic = 900 cents, 15 credits vs. PRD's 2900 cents, 30 credits). This feature corrects them:

| Tier | Credits | Monthly (cents) |
|---|---|---|
| Free | 3 | 0 |
| Basic | 30 | 2900 |
| Pro | 100 | 7900 |
| Enterprise | 999 | custom |

## Implementation Order

Recommended sequence to minimize dependency blocking:

1. **Migration** → `stripe_customer_id`, `status` extension, `stripe_webhook_events`
2. **Stripe client + products constants** → `src/lib/stripe/client.ts`, `products.ts`
3. **DB query extensions** → `subscriptions.ts` (add `getByStripeCustomerId`, `resetMonthlyCredits`, `revertToFree`)
4. **Error codes** → add new Stripe/subscription codes
5. **Webhook handler logic** → `src/lib/stripe/webhooks.ts` (pure functions, testable in isolation)
6. **Webhook route** → `src/app/api/subscription/webhook/route.ts` (signature verification + dispatch)
7. **Checkout route** → `POST /api/subscription/checkout`
8. **Portal route** → `POST /api/subscription/portal`
9. **Verify route** → `GET /api/subscription/checkout/verify`
10. **Credits route** → `GET /api/user/credits`
11. **Subscription route** → `GET /api/subscription`
12. **UI components** → `credit-display`, `pricing-table`, `subscription-card`, `payment-failed-banner`
13. **Billing page** → assemble components
14. **Success page** → post-checkout polling UI
15. **Tests** → unit (webhook handlers, credit operations) + integration (checkout flow)
