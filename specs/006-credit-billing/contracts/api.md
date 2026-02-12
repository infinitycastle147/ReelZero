# API Contracts: Credit System & Stripe Billing (F006)

**Branch**: `006-credit-billing` | **Date**: 2026-02-10

All endpoints follow the project standard:
- **Auth**: Clerk session required (except webhook)
- **Success**: `{ data: T }`
- **Error**: `{ error: { code: string, message: string, details?: unknown } }`
- **Error codes** from `src/lib/errors/codes.ts`

---

## GET `/api/user/credits`

Returns the current user's credit balance and subscription tier. Used by the header credit counter.

**Auth**: Required

**Response `200`**:
```typescript
{
  data: {
    creditsRemaining: number;
    creditsTotal: number;
    creditsUsed: number;
    canGenerate: boolean;
    tier: 'free' | 'basic' | 'pro' | 'enterprise';
    status: 'active' | 'past_due' | 'trialing' | 'canceled';
  }
}
```

**Error cases**:
- `401 AUTH_UNAUTHORIZED` — no session

---

## GET `/api/subscription`

Returns the current user's full subscription details plus usage stats for the billing page.

**Auth**: Required

**Response `200`**:
```typescript
{
  data: {
    subscription: {
      id: string;
      tier: 'free' | 'basic' | 'pro' | 'enterprise';
      status: 'active' | 'past_due' | 'trialing' | 'canceled';
      creditsTotal: number;
      creditsUsed: number;
      creditsRemaining: number;
      billingCycleStart: string | null;  // ISO date
      billingCycleEnd: string | null;    // ISO date
      hasStripeSubscription: boolean;
    };
    usage: {
      videosCreatedThisMonth: number;
      storageUsedBytes: number;
    };
  }
}
```

**Error cases**:
- `401 AUTH_UNAUTHORIZED`

---

## POST `/api/subscription/checkout`

Creates a Stripe Checkout Session for first-time paid subscription. Only valid for Free-tier users.

**Auth**: Required

**Request body**:
```typescript
{
  tier: 'basic' | 'pro';  // Enterprise uses Contact Sales flow
}
```

**Response `200`**:
```typescript
{
  data: {
    checkoutUrl: string;  // Stripe Checkout hosted URL
  }
}
```

**Error cases**:
- `400 VALIDATION_INVALID_INPUT` — tier is 'free' or 'enterprise'
- `409 RESOURCE_CONFLICT` — user already has an active paid subscription (should use portal)
- `401 AUTH_UNAUTHORIZED`

**Notes**:
- Creates or retrieves Stripe Customer ID for the user
- Stores `stripe_customer_id` on the subscription record
- `success_url` includes `{CHECKOUT_SESSION_ID}` template: `/billing/success?session_id={CHECKOUT_SESSION_ID}`
- `cancel_url`: `/billing`
- `client_reference_id`: Clerk user ID (for webhook reconciliation)

---

## POST `/api/subscription/portal`

Creates a Stripe Customer Portal Session for plan changes, cancellation, payment method updates.

**Auth**: Required

**Request body**: None

**Response `200`**:
```typescript
{
  data: {
    portalUrl: string;  // Stripe Customer Portal URL (one-time, ~5 min expiry)
  }
}
```

**Error cases**:
- `404 RESOURCE_NOT_FOUND` — user has no active paid subscription (use checkout instead)
- `401 AUTH_UNAUTHORIZED`

---

## GET `/api/subscription/checkout/verify`

Verifies a completed Stripe Checkout Session and returns the resulting subscription state. Called from the `/billing/success` page before webhook arrives.

**Auth**: Required

**Query params**:
```
session_id: string  // cs_... from success_url redirect
```

**Response `200`**:
```typescript
{
  data: {
    status: 'complete' | 'pending' | 'failed';
    tier: 'basic' | 'pro' | null;
    // Present only when status === 'complete'
    subscription?: {
      creditsTotal: number;
      billingCycleEnd: string;
    };
  }
}
```

**Error cases**:
- `400 VALIDATION_INVALID_INPUT` — session_id missing or malformed
- `403 AUTH_FORBIDDEN` — session belongs to a different user
- `401 AUTH_UNAUTHORIZED`

**Notes**: Retrieves the Checkout Session from Stripe API server-side. Returns `pending` if `status !== 'complete'` (webhook not yet processed). The frontend polls this endpoint every 2s for up to 30s, then falls back to showing the billing page with current DB state.

---

## POST `/api/subscription/webhook`

Stripe webhook endpoint. Handles billing lifecycle events.

**Auth**: None — validated by Stripe signature (`stripe-signature` header)

**Request body**: Raw Stripe event (text, not JSON — required for signature verification)

**Events handled**:

| Event | Action |
|---|---|
| `checkout.session.completed` | Update `stripe_subscription_id`, `stripe_customer_id`, tier, `billing_cycle_start/end`, set `status: active` |
| `invoice.paid` | Reset `credits_used = 0`, update `credits_total`, update `billing_cycle_start/end`, set `status: active` |
| `invoice.payment_failed` | Set `status: past_due` |
| `customer.subscription.updated` | Sync `tier`, `status`, `billing_cycle_start/end` from Stripe subscription object |
| `customer.subscription.deleted` | Reset to Free tier: `tier: free`, `credits_total: 3`, `credits_used: 0`, `stripe_subscription_id: null`, `status: active` |

**Response `200`**: `{ received: true }` on success or already-processed event

**Response `400`**: On signature verification failure

**Idempotency**: Event ID stored in `stripe_webhook_events` before processing. `ON CONFLICT DO NOTHING` — if 0 rows inserted, event already processed, return 200 immediately.

---

## Internal: Credit Operations (not HTTP endpoints)

These are TypeScript functions in `src/lib/db/queries/subscriptions.ts`, called within route handlers.

### `checkCredits(userId: string): Promise<CreditCheckResult>`
Returns `{ creditsRemaining, creditsTotal, creditsUsed, canGenerate }`. Used by generation routes (F007) for client-facing credit display and pre-flight check.

**Credit enforcement HTTP response** (used in `POST /api/video/generate` — F007 route):
- `402 CREDIT_INSUFFICIENT` — user has zero credits remaining; generation rejected before any AI call. Response body: `{ error: { code: 'CREDIT_INSUFFICIENT', message: 'Out of credits — upgrade to continue' } }`

### `reserveCredit(userId: string): Promise<boolean>`
Calls `reserve_credit(p_user_id)` RPC. Returns `true` if credit reserved, `false` if insufficient. Called at generation start before any AI calls.

### `refundCredit(userId: string): Promise<void>`
Calls `refund_credit(p_user_id)` RPC. Called on any generation failure path.

---

## UI Component Contracts

### `CreditDisplay` (header)

Props:
```typescript
{
  creditsRemaining: number;
  creditsTotal: number;
  isLoading: boolean;
  status: 'active' | 'past_due' | 'trialing' | 'canceled';
}
```

Renders: `{creditsRemaining}/{creditsTotal}` counter + warning icon if `status === 'past_due'`.

### `PricingTable`

Props:
```typescript
{
  currentTier: 'free' | 'basic' | 'pro' | 'enterprise';
  onSelectTier: (tier: 'basic' | 'pro') => void;  // triggers checkout
  isLoading: boolean;
}
```

Renders: 4 tier cards. Current tier highlighted. Enterprise shows "Contact Sales" link. Basic/Pro show price + "Upgrade" button (disabled if already on that tier or higher).

### `SubscriptionCard`

Props:
```typescript
{
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'past_due' | 'trialing' | 'canceled';
  creditsRemaining: number;
  creditsTotal: number;
  billingCycleEnd: string | null;
  onManageSubscription: () => void;  // triggers portal session creation
}
```

### `PaymentFailedBanner`

Rendered on all dashboard pages when `status === 'past_due'`. Props:
```typescript
{
  onUpdatePayment: () => void;  // triggers portal session
}
```
