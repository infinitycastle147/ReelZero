# Research: Credit System & Stripe Billing (F006)

**Branch**: `006-credit-billing` | **Date**: 2026-02-10

---

## Research Findings

### 1. Stripe Checkout vs Customer Portal Flow

**Decision**: Use two distinct Stripe flows:
- **First-time paid subscription**: Stripe Checkout Session with `mode: 'subscription'`. Include `{CHECKOUT_SESSION_ID}` template in `success_url` so the session ID is auto-injected on redirect.
- **All subsequent plan changes**: Stripe Customer Portal (`billing_portal.Session`). The `return_url` receives no query params from Stripe — plan changes are communicated exclusively via `customer.subscription.updated` webhook.

**Checkout success_url pattern**:
```
/billing/success?session_id={CHECKOUT_SESSION_ID}
```
On the success page, retrieve the session from the Stripe API server-side to confirm `status === 'complete'` before updating UI. This bridges the gap before the webhook fires.

**Customer Portal**: `return_url` is a plain redirect — no params appended. On return, show current DB state (already updated by webhook, typically <1 second ahead of user navigation).

**Rationale**: `{CHECKOUT_SESSION_ID}` is the Stripe-canonical pattern for synchronous post-checkout verification. Portal plan changes rely on webhooks exclusively — this is by Stripe design.

**Alternatives considered**: Frontend polling — discouraged due to latency and race conditions.

---

### 2. Webhook Idempotency

**Decision**: Store processed Stripe event IDs in a `stripe_webhook_events` table. Use `INSERT ... ON CONFLICT DO NOTHING` to atomically claim an event before processing.

**Schema** (new migration required):
```sql
CREATE TABLE stripe_webhook_events (
  id          TEXT PRIMARY KEY,        -- Stripe event id (evt_...)
  type        TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Processing pattern**:
1. Attempt `INSERT INTO stripe_webhook_events (id, type) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`
2. If 0 rows inserted → event already processed → return 200 immediately
3. If 1 row inserted → process event → update subscription/credits

**Rationale**: Atomic DB-level deduplication. Safe under Supabase PostgreSQL. Stripe explicitly recommends logging event IDs to guard against duplicate delivery. More reliable than in-memory or date-comparison approaches.

**Alternatives considered**: Comparing `billing_cycle_start` to `invoice.period_start` — viable but fragile MVP shortcut. In-memory — not viable across serverless function invocations.

---

### 3. Webhook Signature Verification in Next.js App Router

**Decision**: Use `await request.text()` to read the raw body, then pass to `stripe.webhooks.constructEvent()`. Do NOT use `request.json()`.

**Canonical pattern** (App Router, no `config` export needed):
```typescript
export async function POST(request: Request) {
  const body = await request.text();
  const sig = (await headers()).get('stripe-signature');
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }
  // ...
}
```

**Rationale**: `constructEvent` validates HMAC-SHA256 over the exact raw bytes. Any JSON parse/re-serialize changes bytes and breaks verification. App Router uses standard Web `Request` — `request.text()` is the correct raw body accessor (no `bodyParser: false` config needed unlike Pages Router).

**Alternatives considered**: `request.arrayBuffer()` + `Buffer.from()` — also valid but more verbose.

---

### 4. `past_due` Grace Period — When to Block Generation

**Decision**: Block generation only when subscription `status === 'canceled'` (from `customer.subscription.updated`) or `customer.subscription.deleted` fires. Do NOT block on `past_due` alone.

**Webhook event handling**:
| Event | Action |
|---|---|
| `checkout.session.completed` | Create subscription, provision credits |
| `invoice.paid` / `invoice.payment_succeeded` | Reset monthly credits, set `status: active` |
| `invoice.payment_failed` | Set `status: past_due`, show warning banner, keep generation enabled |
| `customer.subscription.updated` | Sync status; if `status === 'canceled'` → revert to Free tier |
| `customer.subscription.deleted` | Revert to Free tier, block generation |

**Rationale**: Stripe's grace window (typically 3–4 retry attempts over ~2 weeks) exists precisely so users aren't disrupted immediately. Blocking on `past_due` would increase churn. The correct gate is `canceled` status or deletion.

---

### 5. Credit Functions — Existing SQL is Correct

**Decision**: The existing `reserve_credit` and `refund_credit` PostgreSQL functions (in the initial migration) are production-correct. No SQL changes required.

**`reserve_credit`** uses `SELECT FOR UPDATE` + conditional check + UPDATE — atomic, correct, returns `BOOLEAN`.

**`refund_credit`** uses `GREATEST(0, credits_used - 1)` — safe floor-at-zero decrement.

**`deduct_credit` is not needed for MVP**: The two-function pattern (reserve = increment, refund = decrement) is sufficient per FR-007. No separate "finalize" step needed.

**Monthly reset via `updateSubscription()`**:
```typescript
await updateSubscription(userId, {
  credits_used: 0,
  credits_total: tierAllotment,
  billing_cycle_start: new Date(invoice.period_start * 1000).toISOString().split('T')[0],
  billing_cycle_end: new Date(invoice.period_end * 1000).toISOString().split('T')[0],
  status: 'active',
});
```

**Rationale**: The existing functions already satisfy FR-007. `deduct_credit` would add complexity without correctness benefit for this spec. Race condition risk at <100 concurrent users is negligible; `SELECT FOR UPDATE` is correct and clear.

---

### 6. Stripe Stripe Client Setup

**Decision**: Create `src/lib/stripe/client.ts` exporting a singleton Stripe server-side client. Use `stripe` npm package v14+. Prices (Basic, Pro) are stored in `src/lib/stripe/products.ts` as constants mapping tier IDs to Stripe Price IDs from env vars.

**Pattern**:
```typescript
// src/lib/stripe/client.ts
import Stripe from 'stripe';
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
});
```

**Rationale**: Singleton pattern avoids re-instantiating the Stripe client per request. Env var `STRIPE_SECRET_KEY` follows existing `src/lib/utils/env.ts` pattern.

---

### Summary of Decisions

| Topic | Decision | New Files/Changes |
|---|---|---|
| Checkout flow | `mode: 'subscription'`, `{CHECKOUT_SESSION_ID}` in success_url | New `src/lib/stripe/client.ts`, `products.ts` |
| Plan changes | Customer Portal only (no new checkout) | New `src/lib/stripe/portal.ts` |
| Idempotency | `stripe_webhook_events` table + `ON CONFLICT DO NOTHING` | New migration |
| Webhook signature | `request.text()` → `constructEvent()` | New `src/app/api/subscription/webhook/route.ts` |
| Grace period | Block only on `canceled`/deleted, not `past_due` | Webhook handler logic |
| Credit SQL | Existing functions correct; `deduct_credit` omitted | No SQL changes |
| Monthly reset | `updateSubscription()` called in `invoice.paid` handler | Webhook handler |
| Stripe client | Singleton in `src/lib/stripe/client.ts` | New file |
