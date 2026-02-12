# Tasks: Credit System & Stripe Billing

**Input**: Design documents from `/specs/006-credit-billing/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.md ✅, quickstart.md ✅

**Tests**: Not requested — no test tasks generated.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story this task belongs to (US1–US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install Stripe SDK, create `src/lib/stripe/` abstraction layer, run migration, extend error codes and types. Must complete before any user story work.

- [ ] T001 Install `stripe` ^14.0.0 npm package (`npm install stripe`)
- [ ] T002 Create Supabase migration `supabase/migrations/20260210000000_add_stripe_billing.sql`: add `stripe_customer_id TEXT UNIQUE NULL` column to `subscriptions`; update `status` CHECK constraint to `CHECK (status IN ('active', 'canceled', 'past_due', 'trialing'))` — replacing `'cancelled'` with `'canceled'` (Stripe's canonical spelling) and removing `'expired'`; create `stripe_webhook_events` table (`id TEXT PK`, `type TEXT NOT NULL`, `processed_at TIMESTAMPTZ DEFAULT NOW()`)
- [ ] T003 [P] Create Stripe SDK singleton in `src/lib/stripe/client.ts`: instantiate `new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20', typescript: true })` and export as named `stripe`
- [ ] T004 [P] Create tier-to-price-ID mapping in `src/lib/stripe/products.ts`: export `STRIPE_PRICES` constant mapping `'basic'` and `'pro'` to `process.env.STRIPE_PRICE_BASIC_MONTHLY` and `process.env.STRIPE_PRICE_PRO_MONTHLY`; export `TIER_CREDIT_ALLOTMENT` record mapping all 4 tiers to their credit counts (3/30/100/999)
- [ ] T005 [P] Add new error codes to `src/lib/errors/codes.ts`: `STRIPE_WEBHOOK_INVALID`, `STRIPE_CHECKOUT_FAILED`, `SUBSCRIPTION_NOT_FOUND`, `SUBSCRIPTION_ALREADY_PAID`
- [ ] T006 [P] Extend `src/lib/db/schema.ts`: replace `'cancelled'` with `'canceled'` in `Subscription.status` union and add `'past_due' | 'trialing'` (final union: `'active' | 'canceled' | 'past_due' | 'trialing'` — remove `'expired'` as it is not a valid Stripe status); add `stripe_customer_id: string | null` to `Subscription` and `SubscriptionUpdate`; add `StripeWebhookEvent` type (`id: string`, `type: string`, `processed_at: string`)
- [ ] T007 [P] Extend `src/types/database.ts`: replace `'cancelled'` with `'canceled'` in `DbSubscription.status` union and add `'past_due' | 'trialing'` (final union: `'active' | 'canceled' | 'past_due' | 'trialing'`); add `stripeCustomerId: string | null` to `DbSubscription`
- [ ] T008 [P] Align pricing constants in `src/lib/constants/pricing.ts` to PRD values: Free=3 credits/$0, Basic=30 credits/2900 cents, Pro=100 credits/7900 cents, Enterprise=999 credits/custom
- [ ] T009 Add required env vars to `.env.local.example` (and validate in `src/lib/utils/env.ts`): `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC_MONTHLY`, `STRIPE_PRICE_PRO_MONTHLY`

**Checkpoint**: Migration applied, Stripe SDK available, types extended, error codes ready — user story implementation can begin.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core DB query functions and Stripe webhook infrastructure that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T010 Extend `src/lib/db/queries/subscriptions.ts` with three new functions: `getSubscriptionByStripeCustomerId(stripeCustomerId: string): Promise<Subscription | null>` (Supabase query by `stripe_customer_id`); `resetMonthlyCredits(userId: string, creditsTotal: number, cycleStart: string, cycleEnd: string): Promise<Subscription>` (calls `updateSubscription` with `credits_used: 0`, new cycle dates, `status: 'active'`); `revertToFreeTier(userId: string): Promise<Subscription>` (calls `updateSubscription` with `tier: 'free'`, `credits_total: 3`, `credits_used: 0`, `stripe_subscription_id: null`, `stripe_customer_id: null`, `status: 'active'`)
- [ ] T010a [P] Create `src/lib/db/queries/stripe-webhook-events.ts`: export `recordWebhookEvent(eventId: string, eventType: string): Promise<boolean>` — inserts into `stripe_webhook_events` using `INSERT ... ON CONFLICT (id) DO NOTHING`, returns `true` if inserted (new event), `false` if already existed (duplicate); export `hasProcessedEvent(eventId: string): Promise<boolean>` — queries by primary key. Both use `createSupabaseAdmin()`. This satisfies Constitution Principle IV (no raw Supabase in service layer).
- [ ] T011 Create `src/lib/stripe/webhooks.ts` with five named handler functions (pure — accept a typed `Stripe.Event` and resolved `userId: string`, return `Promise<void>`): `handleCheckoutSessionCompleted`, `handleInvoicePaid`, `handleInvoicePaymentFailed`, `handleSubscriptionUpdated`, `handleSubscriptionDeleted`. Each handler calls the appropriate query function from T010/existing `subscriptions.ts`. Add idempotency check at the top of each by calling `recordWebhookEvent(event.id, event.type)` from T010a — if it returns `false`, return early (already processed). No direct Supabase calls in this file.
- [ ] T012 Create `src/app/api/subscription/webhook/route.ts`: export `POST` handler with `export const runtime = 'nodejs'`; read raw body with `await request.text()`; read `stripe-signature` header — if header is null or missing, log `console.error('[webhook] missing stripe-signature header', { url })` and return `new Response('Missing signature', { status: 400 })`; call `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)` — on `WebhookSignatureVerificationError` log `console.error('[webhook] signature verification failed', { error: err.message })` and return `new Response('Invalid signature', { status: 400 })` (satisfies FR-016 logging requirement); resolve `userId` from `stripe_customer_id` via `getSubscriptionByStripeCustomerId`; dispatch to handler from T011 based on `event.type`; return `Response.json({ received: true })`.

**Checkpoint**: Webhook pipeline fully wired. Stripe events can now update subscription/credit state end-to-end.

---

## Phase 3: User Story 1 — View and Upgrade Subscription Plan (Priority: P1) 🎯 MVP

**Goal**: Free-tier users can view all 4 pricing tiers, start a Stripe Checkout Session for Basic/Pro, and see their plan updated after payment. Existing paid users can access the Customer Portal for plan management.

**Independent Test**: Create a test Free-tier user → visit `/billing` → click Upgrade to Basic → complete Stripe test checkout (`4242...`) → confirm plan shows "Basic" and credits show 30 on return.

### Implementation for User Story 1

- [ ] T013 [US1] Create `POST /api/subscription/checkout/route.ts`: validate request body (`tier: 'basic' | 'pro'`); verify user is on Free tier (reject with `SUBSCRIPTION_ALREADY_PAID` and message `"You already have an active subscription. Use 'Manage Subscription' to change your plan."` if already on a paid tier); create or retrieve Stripe Customer (store `stripe_customer_id` on subscription via `updateSubscription`); call `stripe.checkout.sessions.create({ mode: 'subscription', line_items: [{ price: STRIPE_PRICES[tier], quantity: 1 }], customer: stripeCustomerId, client_reference_id: userId, success_url: '/billing/success?session_id={CHECKOUT_SESSION_ID}', cancel_url: '/billing?canceled=true' })`; return `{ data: { checkoutUrl: session.url } }`
- [ ] T014 [US1] Create `GET /api/subscription/checkout/verify/route.ts`: read `session_id` query param; retrieve session from Stripe API with `stripe.checkout.sessions.retrieve(sessionId)`; verify `session.client_reference_id === currentUserId` (return `403` on mismatch); if `session.payment_status === 'paid'` return `{ data: { status: 'complete', tier, subscription: { creditsTotal, billingCycleEnd } } }`; else return `{ data: { status: 'pending' } }`
- [ ] T015 [US1] Create `POST /api/subscription/portal/route.ts`: verify user has `stripe_customer_id` (return `SUBSCRIPTION_NOT_FOUND` if not); call `stripe.billingPortal.sessions.create({ customer: stripeCustomerId, return_url: '/billing' })`; return `{ data: { portalUrl: session.url } }`
- [ ] T016 [P] [US1] Create `src/components/billing/pricing-table.tsx`: named export `PricingTable`; accepts `{ currentTier, onSelectTier, isLoading }`; renders 4 shadcn Card components in a grid; Free and current tier show "Current Plan" badge (not selectable); Basic and Pro show monthly price + "Upgrade" button that calls `onSelectTier`; Enterprise shows "Contact Sales" link to `mailto:` or external URL; highlight current tier with ring/border accent
- [ ] T017 [P] [US1] Create `src/components/billing/subscription-card.tsx`: named export `SubscriptionCard`; accepts `{ tier, status, creditsRemaining, creditsTotal, billingCycleEnd, onManageSubscription }`; shows plan name badge, credit bar (`creditsRemaining / creditsTotal`), billing cycle end date (null for Free), "Manage Subscription" button (calls `onManageSubscription`, hidden for Free tier)
- [ ] T018 [US1] Create billing page `src/app/(dashboard)/billing/page.tsx`: server component; fetch `/api/subscription` (or call query directly server-side); render `SubscriptionCard` + `PricingTable` + usage stats (videos this month, storage used); `onSelectTier` handler: `POST /api/subscription/checkout` then `router.push(checkoutUrl)`; `onManageSubscription` handler: `POST /api/subscription/portal` then `router.push(portalUrl)`
- [ ] T019 [US1] Create `src/app/(dashboard)/billing/success/page.tsx`: client component (`'use client'`); read `session_id` from `useSearchParams()`; poll `GET /api/subscription/checkout/verify?session_id=...` every 2000ms (max 15 attempts) using `setInterval`; show shadcn Skeleton "Upgrading your plan…" while polling; on `status === 'complete'` show success message with new tier name + credits and a "Go to Dashboard" button; on timeout redirect to `/billing` via `router.replace`
- [ ] T019a [US1] Add checkout cancellation message to `src/app/(dashboard)/billing/page.tsx`: read `canceled=true` query param from `useSearchParams()` on mount; if present, display a neutral sonner toast or inline banner: "Checkout was canceled — your plan was not changed." This satisfies US1 Acceptance Scenario 4 (FR-003 cancel path).

**Checkpoint**: Full upgrade flow (Free → Basic/Pro → return → plan updated) is functional and testable end-to-end with Stripe test mode.

---

## Phase 4: User Story 2 — Credit Enforcement During Video Generation (Priority: P1)

**Goal**: Video generation is blocked server-side and client-side when credits = 0. Credits are atomically reserved before generation and refunded on failure.

**Independent Test**: Set a test user's `credits_used = credits_total` in Supabase → call `POST /api/video/generate` → confirm `409 CREDIT_INSUFFICIENT` error returned before any AI service call. Then set `credits_used = 0` → call generate → confirm credit decrements after success.

### Implementation for User Story 2

- [ ] T020 [US2] Integrate credit gate into `src/app/api/video/generate/route.ts`: at the top of the handler (before any AI calls), call `checkCredits(userId)` — if `!canGenerate` return `{ error: { code: 'CREDIT_INSUFFICIENT', message: 'Out of credits — upgrade to continue' } }` with status `402`; then call `reserveCredit(userId)` — if returns `false` return same error; wrap the remainder of generation logic in try/catch; on any caught error call `refundCredit(userId)` before re-throwing
- [ ] T021 [US2] Create `GET /api/user/credits/route.ts`: auth-required; call `checkCredits(userId)` and `getSubscriptionByUserId(userId)`; return `{ data: { creditsRemaining, creditsTotal, creditsUsed, canGenerate, tier, status } }`. Note: this is intentionally a lightweight endpoint for the header counter only — `GET /api/subscription` (T025) is the authoritative billing source for the full billing page. The two endpoints serve different consumers and preventing drift is the implementer's responsibility.
- [ ] T022 [P] [US2] Create `src/components/billing/credit-display.tsx`: named export `CreditDisplay`; accepts `{ creditsRemaining, creditsTotal, isLoading, status }`; renders `{creditsRemaining}/{creditsTotal}` as a compact chip; shows amber warning icon if `status === 'past_due'`; shows red badge if `creditsRemaining === 0`
- [ ] T023 [US2] Integrate `CreditDisplay` into `src/components/layout/dashboard-header.tsx`: fetch `/api/user/credits` on mount with SWR or `useEffect`; pass result to `CreditDisplay`; subscribe to Zustand `video-store` generation complete event to trigger a credit refetch after successful video generation
- [ ] T024 [US2] Add client-side generate button gating in the video creation UI (future F007 hook point): export a `useCredits()` hook from `src/hooks/useCredits.ts` that fetches `/api/user/credits` and returns `{ creditsRemaining, canGenerate, isLoading, refresh }`; the generate button should be disabled when `!canGenerate` and show an upgrade prompt tooltip/popover linking to `/billing`

**Checkpoint**: Credit enforcement works end-to-end. Zero-credit users cannot generate videos from either client or server path.

---

## Phase 5: User Story 3 — View Credit Balance and Usage Statistics (Priority: P2)

**Goal**: Users see accurate credit counter in header at all times and detailed usage stats on the billing page.

**Independent Test**: Generate a video → verify header counter decrements by 1 on same page. Visit `/billing` → verify stats show correct credits used, videos this month, storage.

### Implementation for User Story 3

- [ ] T025 [US3] Create `GET /api/subscription/route.ts`: auth-required; call `getSubscriptionByUserId(userId)` for subscription data; query `videos` table for count of videos created in current billing cycle (between `billing_cycle_start` and `billing_cycle_end`); query `uploaded_images` + `videos` for storage used (sum of `file_size_bytes`); return `{ data: { subscription: { id, tier, status, creditsTotal, creditsUsed, creditsRemaining, billingCycleStart, billingCycleEnd, hasStripeSubscription }, usage: { videosCreatedThisMonth, storageUsedBytes } } }`
- [ ] T026 [US3] Wire usage stats display into `src/app/(dashboard)/billing/page.tsx`: display "Videos this month: N / creditsTotal", "Storage used: X MB / quota MB" using shadcn Progress or simple stat cards; derive storage quota from `PRICING_TIERS[tier].storageQuotaMb`
- [ ] T027 [US3] Ensure `CreditDisplay` in header refreshes after video generation: update `src/hooks/useCredits.ts` from T024 to export a `refreshCredits()` function; call `refreshCredits()` from video generation success callback in `src/store/video-store.ts`

**Checkpoint**: Header counter is live and accurate. Billing page shows complete usage breakdown.

---

## Phase 6: User Story 4 — Monthly Credit Reset and Billing Lifecycle (Priority: P2)

**Goal**: Monthly credit resets fire automatically on billing renewal. Grace period shows warning banner. Subscription cancellation reverts to Free tier.

**Independent Test**: Use Stripe CLI to trigger `stripe trigger invoice.payment_succeeded` → verify `credits_used` resets to 0 in DB. Trigger `invoice.payment_failed` → verify `status` becomes `past_due` and warning banner appears in dashboard. Trigger `customer.subscription.deleted` → verify tier reverts to Free.

### Implementation for User Story 4

- [ ] T028 [P] [US4] Create `src/components/billing/payment-failed-banner.tsx`: named export `PaymentFailedBanner`; accepts `{ onUpdatePayment: () => void }`; renders a full-width amber alert strip: "Payment failed — update your payment method to avoid interruption" with an "Update Payment" button that calls `onUpdatePayment`; dismissible per session (use `sessionStorage` flag)
- [ ] T029 [US4] Integrate `PaymentFailedBanner` into `src/app/(dashboard)/layout.tsx`: fetch subscription status server-side (or pass via cookie/header); conditionally render `PaymentFailedBanner` when `status === 'past_due'`; `onUpdatePayment` calls `POST /api/subscription/portal` and redirects to portal URL
- [ ] T030 [US4] Verify webhook handlers in `src/lib/stripe/webhooks.ts` (T011) correctly implement all lifecycle transitions per data-model state machine: `handleInvoicePaid` resets credits + sets `status: 'active'`; `handleInvoicePaymentFailed` sets `status: 'past_due'` only; `handleSubscriptionUpdated` syncs tier/status including `canceled` → calls `revertToFreeTier`; `handleSubscriptionDeleted` calls `revertToFreeTier`; all handlers are idempotent via `stripe_webhook_events` check
- [ ] T031 [US4] Manually smoke-test all Stripe webhook events via Stripe CLI: `stripe trigger checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted` — verify DB state after each event matches expected state machine transitions; also verify SC-001 (time the full checkout flow end-to-end — should complete in under 3 minutes with test card `4242...`); verify SC-007 (generation succeeds while subscription status is `past_due`)

**Checkpoint**: Full billing lifecycle (renewal, grace period, cancellation) is automated and verified.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Loading states, error boundaries, rate limiting, security hardening, and lint/type-check pass.

- [ ] T032 [P] Add loading skeletons to `src/app/(dashboard)/billing/page.tsx` using shadcn Skeleton: show during initial data fetch for `SubscriptionCard` and `PricingTable`
- [ ] T033 [P] Add error boundary / toast notifications for checkout and portal failures: if `POST /api/subscription/checkout` fails, show sonner toast "Failed to start checkout — please try again"; if `POST /api/subscription/portal` fails, show toast "Failed to open billing portal"
- [ ] T034 [P] Add Supabase-based rate limiting to checkout and portal endpoints: create `src/lib/db/queries/rate-limits.ts` with `checkRateLimit(userId: string, action: string, maxRequests: number, windowSeconds: number): Promise<boolean>` — counts rows in `usage_tracking` for the given `action` within the time window (reuses existing table, no new table needed); in `src/app/api/subscription/checkout/route.ts` and `src/app/api/subscription/portal/route.ts` call `checkRateLimit(userId, 'checkout', 5, 60)` at the top — if `false`, return `429 EXTERNAL_RATE_LIMITED`. Note: in-memory counters are explicitly forbidden here as Vercel serverless instances do not share state between invocations.
- [ ] T035 [P] Add `stripe_customer_id` to `getSubscriptionByUserId` SELECT projection in `src/lib/db/queries/subscriptions.ts` and update all callers that use the return type
- [ ] T036 Run `npm run lint && npm run type-check && npm run build` — fix all errors and warnings before marking feature complete; pre-flight checklist: confirm `export const runtime = 'nodejs'` on webhook route, no `any` types, all new error codes used correctly, `stripe_webhook_events` queries only via `src/lib/db/queries/stripe-webhook-events.ts` (not inline in webhooks.ts)
- [ ] T037 Update `CLAUDE.md` via `.specify/scripts/bash/update-agent-context.sh claude` to reflect completed F006 feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately. T003–T009 all parallelizable.
- **Phase 2 (Foundational)**: Depends on Phase 1 completion. T010→T011→T012 must be sequential.
- **Phase 3 (US1 — Upgrade Flow)**: Depends on Phase 2. T013→T014, T015, T016, T017 parallelizable, T018 depends on T016+T017, T019 depends on T014.
- **Phase 4 (US2 — Credit Enforcement)**: Depends on Phase 2. T020 depends on existing `video/generate` route. T021→T022→T023 partially parallelizable.
- **Phase 5 (US3 — Usage Stats)**: Depends on Phase 3 (billing page exists). T025→T026→T027 sequential.
- **Phase 6 (US4 — Lifecycle)**: Depends on Phase 2 (webhook handlers). T028 parallelizable, T029→T030→T031 sequential.
- **Phase 7 (Polish)**: Depends on all user story phases complete.

### User Story Dependencies

- **US1 (P1)**: After Phase 2 — no story dependencies
- **US2 (P1)**: After Phase 2 — no story dependencies (parallel with US1)
- **US3 (P2)**: After US1 (billing page must exist)
- **US4 (P2)**: After Phase 2 — no story dependencies (parallel with US1/US2)

### Within Each User Story

- Models/query extensions before services
- Services/lib functions before route handlers
- Route handlers before UI components
- UI components before page assembly

### Parallel Opportunities

- **Phase 1**: T003–T009 all run in parallel (different files)
- **Phase 3**: T016 + T017 in parallel (different component files)
- **Phase 3+4**: US1 and US2 can be worked simultaneously after Phase 2
- **Phase 6**: T028 in parallel with T029 (different files)
- **Phase 7**: T032–T036 all parallelizable

---

## Parallel Example: Phase 3 (User Story 1)

```text
# After T013 and T015 complete, launch in parallel:
Task T016: "Create pricing-table.tsx in src/components/billing/"
Task T017: "Create subscription-card.tsx in src/components/billing/"

# After T016 + T017 complete:
Task T018: "Assemble billing page in src/app/(dashboard)/billing/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (T001–T009)
2. Complete Phase 2: Foundational (T010–T012) ← BLOCKING
3. Complete Phase 3: US1 — Upgrade Flow (T013–T019)
4. Complete Phase 4: US2 — Credit Enforcement (T020–T024)
5. **STOP and VALIDATE**: Test checkout flow + credit gating end-to-end
6. Deploy MVP — monetization is live

### Full Feature Delivery

1. MVP above (Steps 1–5)
2. Phase 5: US3 — Usage Stats (T025–T027)
3. Phase 6: US4 — Billing Lifecycle (T028–T031)
4. Phase 7: Polish (T032–T038)

### Parallel Strategy (Single Developer)

Work US1 and US2 together — they share the same Phase 2 foundation and are fully independent of each other. Develop Stripe checkout API (US1) and credit enforcement route update (US2) in the same session.

---

## Notes

- `[P]` tasks touch different files — safe to implement in any order within their phase
- `[Story]` label maps each task to its user story for traceability
- The webhook endpoint (T012) requires `export const runtime = 'nodejs'` — Stripe SDK does not support Edge Runtime
- Stripe test mode card `4242 4242 4242 4242` for all checkout tests
- Run `stripe listen --forward-to localhost:3000/api/subscription/webhook` in a separate terminal during development
- All DB writes go through `src/lib/db/queries/subscriptions.ts` — no direct Supabase calls in route handlers (Constitution Principle IV)
- Total tasks: **40** (T001–T038 + T010a, T019a)
