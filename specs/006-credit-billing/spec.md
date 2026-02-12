# Feature Specification: Credit System & Stripe Billing

**Feature Branch**: `006-credit-billing`
**Created**: 2026-02-10
**Status**: Draft
**Input**: User description: "Credit System and Stripe Billing - subscription tiers, credit tracking, Stripe checkout and webhooks, billing UI"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and Upgrade Subscription Plan (Priority: P1)

A new user on the Free tier wants to understand their usage limits and upgrade to a paid plan. They visit the billing page, see their current plan with credits remaining, review the four available tiers with pricing and feature comparisons, click "Upgrade", and are redirected to a secure checkout flow. After completing payment, their plan is immediately updated and new monthly credits are available.

**Why this priority**: Monetization is the core business goal. Without subscription checkout working, no revenue is generated. This is the most critical path.

**Independent Test**: Can be tested end-to-end by creating a test user, visiting the billing page, initiating checkout with a test payment method, and confirming plan upgrade is reflected in the UI.

**Acceptance Scenarios**:

1. **Given** a Free-tier user on the billing page, **When** they click "Upgrade to Basic", **Then** they are redirected to a Stripe-hosted checkout page with the correct plan details and price.
2. **Given** a user who completes Stripe checkout successfully, **When** they return to the app, **Then** the app detects the successful checkout via the return URL and shows an "Upgrading your plan…" pending state until the billing event fires and the subscription is updated, at which point the plan badge updates to "Basic" and credit balance shows 30.
3. **Given** a user on any paid plan, **When** they visit the billing page, **Then** they can click "Manage Subscription" to access the Stripe Customer Portal for tier upgrades, downgrades, cancellations, and payment method updates — no separate checkout flow is used for plan changes after the initial subscription.
4. **Given** a user who cancels during Stripe checkout, **When** they are returned to the app, **Then** their plan remains unchanged and they see a neutral cancellation message.

---

### User Story 2 - Credit Enforcement During Video Generation (Priority: P1)

A user attempts to generate a video. Before any AI processing begins, the system checks their credit balance. If they have credits, one is reserved, the generation proceeds, and the credit is deducted on success (or refunded on failure). If they have no credits, generation is blocked immediately with a prompt to upgrade.

**Why this priority**: Credit enforcement is the business model's integrity layer. Without it, users can generate unlimited videos for free.

**Independent Test**: Can be tested by setting a user's credit balance to 0 and attempting to trigger video generation — the request should be rejected before any AI calls are made.

**Acceptance Scenarios**:

1. **Given** a user with 1 credit remaining, **When** they initiate video generation, **Then** the credit is reserved immediately and the generation proceeds.
2. **Given** a user with 1 credit whose video generation fails mid-process, **When** the failure occurs, **Then** the reserved credit is refunded and their balance returns to 1.
3. **Given** a user with 0 credits remaining, **When** they view the generation UI, **Then** the "Generate" button is disabled and an upgrade prompt is shown client-side. If they bypass the UI and call the API directly, the server rejects the request before any AI services are called with a clear "Out of credits — upgrade to continue" error.
4. **Given** a user with 0 credits who upgrades their plan, **When** the upgrade completes, **Then** their new monthly credit allotment is immediately available for use.

---

### User Story 3 - View Credit Balance and Usage Statistics (Priority: P2)

A user wants to track how many credits they've used this month and how many remain. The credit count is visible in the app header at all times. The billing page shows a detailed breakdown: credits used, credits remaining, videos created this month, and storage used.

**Why this priority**: Visibility into usage builds trust and helps users self-manage before hitting limits. It reduces support requests about "why can't I generate?"

**Independent Test**: Can be tested independently by checking that the header credit counter updates in real-time after a successful video generation, and that the billing page shows accurate statistics.

**Acceptance Scenarios**:

1. **Given** any authenticated user, **When** they view any dashboard page, **Then** a credit counter is visible in the header showing remaining credits for the current billing cycle.
2. **Given** a user who successfully generates a video, **When** generation completes, **Then** the header credit counter decrements by 1 within the same page view.
3. **Given** a user on the billing page, **When** they view usage statistics, **Then** they see: current plan name, credits remaining, credits used this month, number of videos created this month, and storage used.

---

### User Story 4 - Monthly Credit Reset on Billing Cycle (Priority: P2)

On a user's monthly billing renewal date, their credit balance resets to their tier's full allotment. If payment fails, they enter a grace period (credits remain usable). If payment fails repeatedly and the subscription is canceled, the account reverts to Free tier limits.

**Why this priority**: Ensures the recurring revenue model functions correctly and users experience a seamless monthly renewal.

**Independent Test**: Can be tested by simulating a billing renewal event and verifying credit balance resets to the tier allotment.

**Acceptance Scenarios**:

1. **Given** a Basic-tier user whose billing cycle renews successfully, **When** the renewal event is received, **Then** their monthly usage resets and they have the full 30 credits available again.
2. **Given** a paid-tier user whose payment fails, **When** the payment failure event is received, **Then** their subscription enters grace period (`past_due`) status, generation remains enabled using their remaining credits, and a non-blocking warning banner is shown ("Payment failed — update your payment method to avoid interruption").
3. **Given** a user whose subscription is canceled after failed payment, **When** the cancellation event is received, **Then** their tier reverts to Free (3 credits/month) at the next billing cycle.

---

### Edge Cases

- What happens when a user's credit reservation succeeds but generation fails unexpectedly? The reserved credit must be refunded so the user is not charged for a failed generation.
- What happens if a billing webhook is delivered twice (duplicate event)? Processing the same event twice must not double-reset credits or create duplicate subscriptions.
- What happens if a forged or tampered webhook request is received? The webhook endpoint MUST reject any request that fails signature verification with a 400 error, logging the rejection for monitoring.
- What happens if a user tries to upgrade while already on the highest self-serve plan? The upgrade flow only shows available higher tiers; the current tier is highlighted but not selectable as an upgrade.
- What happens when a user closes the browser mid-generation with a credit reserved? The generation continues server-side; credit deduction or refund occurs when it completes or fails.
- What happens when the credit counter shows stale data? The counter refreshes on next navigation or page reload; stale display is acceptable for MVP.
- What happens when a user returns from checkout before the billing webhook has fired? The app detects the successful checkout return URL flag and shows an "Upgrading your plan…" pending state; it does not revert to the old plan or show an error while awaiting the webhook.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display the user's current subscription tier and credit balance on the billing page.
- **FR-002**: System MUST show a pricing comparison across all four tiers (Free, Basic, Pro, Enterprise) including price, credit allotment, and key feature differences.
- **FR-003**: System MUST redirect Free-tier users to a secure, hosted checkout flow when they subscribe to a paid tier for the first time. All subsequent tier changes (e.g., Basic → Pro) MUST be handled via the subscription management portal, not a new checkout session.
- **FR-004**: System MUST provide access to a subscription management portal for active paid subscribers to change plans, cancel, or update payment methods.
- **FR-005**: System MUST automatically update subscription status and credit balance in response to billing lifecycle events (checkout completed, payment succeeded/failed, subscription updated/deleted).
- **FR-006**: System MUST enforce credit availability on both the client and the server. The client MUST disable the "Generate" button and display an upgrade prompt when the known credit balance is zero. The server MUST perform the authoritative credit check before any generation begins and reject the request with an actionable error if credits are zero.
- **FR-007**: System MUST atomically reserve a credit at the start of generation, deduct it on success, and refund it on any failure — with no scenario leaving a user permanently short a credit for a video they did not receive.
- **FR-008**: System MUST display a persistent credit counter in the dashboard header visible on all authenticated pages.
- **FR-009**: System MUST reset a user's monthly credit usage to zero when a successful billing renewal event is received.
- **FR-010**: System MUST revert a canceled subscription to Free tier limits (3 credits/month) when either a subscription deletion event is received OR a subscription update event with `status: 'canceled'` is received.
- **FR-011**: System MUST maintain full generation access during the grace period (`past_due` status) following a payment failure. A non-blocking warning banner MUST be displayed on all dashboard pages prompting the user to update their payment method. Generation MUST NOT be blocked until the subscription is canceled.
- **FR-012**: System MUST provide a usage statistics view with: plan name, credits remaining, credits used this month, videos created this month, and storage used.
- **FR-013**: Billing event processing MUST be idempotent — replaying the same event produces the same final state as processing it once.
- **FR-016**: The billing webhook endpoint MUST verify the request signature on every incoming request and reject any request failing verification with a 400 response. Failed verification attempts MUST be logged for security monitoring.
- **FR-014**: Enterprise tier MUST display a "Contact Sales" call-to-action instead of a self-serve checkout button.
- **FR-015**: On the checkout success return page, the system MUST detect the successful checkout via return URL and display an "Upgrading your plan…" pending state until the subscription is confirmed via billing event, without reverting to the previous plan state or showing an error.

### Key Entities

- **Subscription**: Links a user to a billing tier. Tracks credit totals, monthly usage, billing cycle start/end dates, payment status, and external billing identifiers. Status values: `active`, `trialing`, `past_due`, `canceled`. Note: `expired` is removed — Stripe does not use this status; the canonical end-state is `canceled`.
- **Credit**: A unit of video generation currency. 1 credit = 1 video generation. Represented as used/total counts on the Subscription entity.
- **Subscription Tier**: One of four plan levels — Free (3/mo, $0), Basic (30/mo, $29), Pro (100/mo, $79), Enterprise (custom). Each tier defines credit allotment, feature access, and overage pricing.
- **Billing Event**: An external payment system notification that triggers subscription or credit state transitions (e.g., checkout completed, payment succeeded/failed, subscription updated/deleted).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete the full upgrade flow (billing page → checkout → plan confirmed in app) in under 3 minutes.
- **SC-002**: Credit enforcement rejects zero-credit generation attempts 100% of the time before any AI service call is made.
- **SC-003**: Subscription state and credit balance are updated within 10 seconds of a billing event being received.
- **SC-004**: The header credit counter reflects the correct balance after each successful video generation without requiring a page reload.
- **SC-005**: Monthly credit resets occur automatically upon billing renewal with no manual intervention required.
- **SC-006**: Replaying any billing event produces the same final subscription/credit state as processing it once (idempotency verified for all event types).
- **SC-007**: Users with failed payments retain generation access for at least 3 days before credits are blocked.

## Assumptions

- Stripe is the sole payment processor; no alternative payment methods are in scope for MVP.
- Enterprise tier onboarding is handled manually by sales; the UI shows only a "Contact Sales" button for that tier.
- Annual pricing (17% discount) is displayed on the pricing table for marketing purposes but checkout uses monthly plans only for MVP; annual billing is Phase 2.
- Overage purchases are out of scope — when credits run out, generation is blocked with an upgrade prompt, not a per-video purchase option.
- The payment failure grace period follows Stripe's default retry window (approximately 3 days); no custom dunning sequences are required for MVP.
- Free-tier users cannot purchase additional credits without upgrading to a paid tier.
- Watermarking of Free-tier videos is handled in the rendering pipeline (F008), not in this feature; this feature only controls generation access.
- The `subscriptions` table and credit query function stubs (`checkCredits`, `reserveCredit`, `refundCredit`) already exist from F004 and will be fully implemented in this feature. Note: `deductCredit` is intentionally omitted — the two-function reserve/refund pattern is sufficient (no separate finalize step needed).

## Clarifications

### Session 2026-02-10

- Q: When a user returns from checkout before the billing webhook fires, what should the app show? → A: Detect checkout success from return URL, show "Upgrading your plan…" skeleton until subscription updates via webhook.
- Q: For users already on a paid plan (e.g., Basic → Pro), should tier changes use a new Checkout session or the Customer Portal? → A: Checkout only for first paid subscription; all subsequent tier changes via Customer Portal.
- Q: During the grace period (payment failed, `past_due`), what should the credit counter and generation gating show? → A: Show actual remaining credits normally; display a non-blocking warning banner about payment failure. Generation remains fully enabled during grace period.
- Q: Should the billing webhook endpoint verify request signatures? → A: Always verify; reject any request failing verification with a 400 error and log the attempt.
- Q: Where should the zero-credit enforcement check happen? → A: Both client and server — client disables the "Generate" button and shows upgrade prompt; server is the authoritative enforcement point.

## Dependencies

- **F003 (Auth)**: User identity and session management required for all billing operations.
- **F004 (Database)**: `subscriptions` table, `users` table, and credit query function stubs are already scaffolded and will be completed here.
- **F007 (Video Wizard)**: Will consume the credit check and reservation APIs built in this feature before initiating generation.
- **External — Stripe**: Requires a Stripe account with products and prices configured for Basic and Pro monthly plans.
