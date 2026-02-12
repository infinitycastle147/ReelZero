# Data Model: Credit System & Stripe Billing (F006)

**Branch**: `006-credit-billing` | **Date**: 2026-02-10

---

## Existing Tables (No Changes Required)

### `subscriptions`

Already exists from F003/F004. This feature **completes** its Stripe fields and status values.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | Auto-generated |
| `user_id` | `UUID FK → users.id` | One subscription per user |
| `tier` | `TEXT` | `'free' \| 'basic' \| 'pro' \| 'enterprise'` |
| `status` | `TEXT` | Final constraint: `'active' \| 'canceled' \| 'past_due' \| 'trialing'` — replaces `'cancelled'` (typo) and removes `'expired'` (not a valid Stripe status) |
| `credits_total` | `INTEGER` | Tier allotment (3 / 30 / 100 / unlimited≡999) |
| `credits_used` | `INTEGER DEFAULT 0` | Incremented by `reserve_credit()` |
| `credits_remaining` | `INTEGER GENERATED` | `credits_total - credits_used` (computed, read-only) |
| `billing_cycle_start` | `DATE` | Set on subscription creation & monthly reset |
| `billing_cycle_end` | `DATE` | Set on subscription creation & monthly reset |
| `stripe_subscription_id` | `TEXT UNIQUE NULL` | Null for Free tier |
| `stripe_customer_id` | `TEXT UNIQUE NULL` | **New column** — Stripe customer ID (needed for portal sessions) |
| `created_at` | `TIMESTAMPTZ` | |
| `updated_at` | `TIMESTAMPTZ` | |

**Schema change required**: Add `stripe_customer_id TEXT UNIQUE` column (migration).

**Status value change**: Replace `'cancelled'` with `'canceled'`, remove `'expired'`, add `'past_due'` and `'trialing'`. Final CHECK: `('active', 'canceled', 'past_due', 'trialing')`.

---

## New Table

### `stripe_webhook_events`

Idempotency table — stores processed Stripe event IDs to prevent duplicate processing.

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT PK` | Stripe event ID (`evt_...`) — primary key enforces uniqueness |
| `type` | `TEXT NOT NULL` | Stripe event type (e.g., `checkout.session.completed`) |
| `processed_at` | `TIMESTAMPTZ DEFAULT NOW()` | When the event was processed |

**Index**: None needed — PK lookup is sufficient.

---

## Existing RPC Functions (No Changes)

### `reserve_credit(p_user_id UUID) → BOOLEAN`

Uses `SELECT FOR UPDATE` + conditional check. Increments `credits_used` by 1 if `credits_remaining > 0`. Returns `TRUE` on success, `FALSE` if no credits or user not found.

### `refund_credit(p_user_id UUID) → VOID`

Decrements `credits_used` by 1 with `GREATEST(0, ...)` floor guard.

**Note**: `deduct_credit` is not implemented — the two-function pattern is sufficient for FR-007.

---

## TypeScript Schema Extensions

### `src/lib/db/schema.ts` additions

```typescript
// Extend Subscription type
export type Subscription = {
  // ... existing fields ...
  status: 'active' | 'canceled' | 'past_due' | 'trialing'; // replaces 'cancelled'/'expired'
  stripe_customer_id: string | null; // new
};

export type SubscriptionUpdate = Partial<Pick<Subscription,
  | 'tier' | 'status' | 'credits_total' | 'credits_used'
  | 'billing_cycle_start' | 'billing_cycle_end'
  | 'stripe_subscription_id'
  | 'stripe_customer_id' // new
>>;

// New entity
export type StripeWebhookEvent = {
  id: string;          // Stripe evt_...
  type: string;
  processed_at: string;
};
```

---

## State Machine: Subscription Status

```
[New User]
    │
    ▼
  free (active)
    │
    │ checkout.session.completed
    ▼
  basic/pro/enterprise (active)
    │
    ├─ invoice.payment_failed ──────────────► past_due (generation enabled, banner shown)
    │                                              │
    │                                              │ invoice.paid (retry success)
    │                                              ├──────────────────────────────► active
    │                                              │
    │                                              │ customer.subscription.updated (canceled)
    │                                              │ customer.subscription.deleted
    │                                              └──────────────────────────────► free (active)
    │
    ├─ customer.subscription.updated (tier change via portal)
    │       ▼
    │  basic/pro/enterprise (active) [new tier]
    │
    └─ customer.subscription.deleted
            ▼
         free (active)
```

---

## Constants: Pricing Tiers

**Note**: `src/lib/constants/pricing.ts` already exists but uses different values than the PRD. This feature will align the constants to PRD values during implementation.

| Tier | Credits/Month | Monthly Price (cents) | Stripe Price ID |
|---|---|---|---|
| Free | 3 | 0 | N/A |
| Basic | 30 | 2900 | `STRIPE_PRICE_BASIC_MONTHLY` (env var) |
| Pro | 100 | 7900 | `STRIPE_PRICE_PRO_MONTHLY` (env var) |
| Enterprise | 999 (unlimited) | custom | N/A (Contact Sales) |

---

## New Migration

**File**: `supabase/migrations/20260210000000_add_stripe_billing.sql`

Changes:
1. Add `stripe_customer_id TEXT UNIQUE` to `subscriptions`
2. Replace `status` CHECK constraint: `('active', 'canceled', 'past_due', 'trialing')` — corrects spelling from `'cancelled'` to `'canceled'`, removes `'expired'`, adds `'past_due'` and `'trialing'`
3. Create `stripe_webhook_events` table
4. Index on `stripe_webhook_events.processed_at` for cleanup queries
