# Draft Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-11

## Active Technologies
- TypeScript 5+ (strict mode), Next.js 16+ (App Router) + Tailwind CSS v4, shadcn/ui (new-york style, neutral base), oklch color system (002-design-system)
- N/A (no database in this feature) (002-design-system)
- TypeScript 5+ (strict mode), Next.js 16+ (App Router) + `@supabase/supabase-js` (new), `svix` (existing, webhook verification), `@clerk/nextjs` (existing) (003-database-user-sync)
- Supabase PostgreSQL (database) + Supabase Storage (4 buckets: videos, images, audio, thumbnails) (003-database-user-sync)
- TypeScript 5+ (strict mode), Next.js 16+ (App Router) + `sharp` (v0.34.5, already installed), `@supabase/supabase-js` (existing), `@clerk/nextjs` (existing) (004-ai-services)
- Supabase Storage (`images` bucket for scene images, `audio` bucket for TTS MP3s) + Supabase PostgreSQL (`generation_logs`, `uploaded_images` tables) (004-ai-services)
- TypeScript 5+ (strict mode), Next.js 16+ (App Router) + `stripe` ^14.0.0 (new), `@clerk/nextjs` (existing), `@supabase/supabase-js` (existing), `svix` (existing for Clerk webhook; Stripe uses its own `stripe.webhooks.constructEvent`) (006-credit-billing)
- Supabase PostgreSQL (`subscriptions` table + new `stripe_webhook_events` table) (006-credit-billing)
- TypeScript 5+ strict mode + Next.js 16+ (App Router), React 18+, Zustand (existing), shadcn/ui (new-york / neutral), Tailwind CSS v4, `@dnd-kit/core` + `@dnd-kit/sortable` (new — scene reordering), native HTML5 file upload (no new library), `zustand/middleware` persist (new — draft persistence) (007-video-wizard)
- Supabase Storage (images bucket for scene images — already provisioned by F003) (007-video-wizard)

- TypeScript 5+ (strict mode), Next.js 16+ (App Router) + `@clerk/nextjs` (auth SDK), `svix` (webhook verification), `lucide-react` (icons), `shadcn/ui` (UI components) (001-clerk-auth)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5+ (strict mode), Next.js 16+ (App Router): Follow standard conventions

## Recent Changes
- 007-video-wizard: Added TypeScript 5+ strict mode + Next.js 16+ (App Router), React 18+, Zustand (existing), shadcn/ui (new-york / neutral), Tailwind CSS v4, `@dnd-kit/core` + `@dnd-kit/sortable` (new — scene reordering), `react-dropzone` (new — image upload), `zustand/middleware` persist (new — draft persistence)
- 006-credit-billing: Added TypeScript 5+ (strict mode), Next.js 16+ (App Router) + `stripe` ^14.0.0 (new), `@clerk/nextjs` (existing), `@supabase/supabase-js` (existing), `svix` (existing for Clerk webhook; Stripe uses its own `stripe.webhooks.constructEvent`)
- 004-ai-services: Added TypeScript 5+ (strict mode), Next.js 16+ (App Router) + `sharp` (v0.34.5, already installed), `@supabase/supabase-js` (existing), `@clerk/nextjs` (existing)


<!-- MANUAL ADDITIONS START -->
## Completed Features
- F001: Clerk Auth (Google OAuth, webhook sync)
- F002: Design System (shadcn/ui, Tailwind v4, oklch)
- F003: Database & User Sync (Supabase tables, storage buckets, query layer)
- F004: AI Services (Gemini text/image, ElevenLabs TTS, Sharp processing)
- F006: Credit System & Stripe Billing (Stripe Checkout/Portal, webhook pipeline, credit enforcement)

## F006 Key Implementation Notes
- **Stripe API version**: `'2023-10-16'` (stripe@14.x LatestApiVersion — NOT 2024-06-20)
- **Webhook route**: `export const runtime = 'nodejs'` required; use `request.text()` NOT `request.json()`
- **Idempotency**: `stripe_webhook_events` table + `INSERT ON CONFLICT DO NOTHING` (queries via `src/lib/db/queries/stripe-webhook-events.ts`)
- **Subscription status**: `'active' | 'canceled' | 'past_due' | 'trialing'` — note American English `canceled` (Stripe canonical)
- **Credit enforcement**: `checkCredits` → `reserveCredit` before AI calls; `refundCredit` on failure (in `src/app/api/video/generate/route.ts`)
- **Rate limiting**: Supabase-backed via `src/lib/db/queries/rate-limits.ts` (reuses `usage_tracking` table) — no in-memory counters on Vercel
- **Grace period**: `past_due` shows warning banner but does NOT block generation; only `canceled` blocks
- **Stripe webhook dispatch**: `src/lib/stripe/webhooks.ts` (pure handlers) → `src/app/api/subscription/webhook/route.ts` (signature verify + dispatch)
- **New query files**: `src/lib/db/queries/stripe-webhook-events.ts`, `src/lib/db/queries/rate-limits.ts`
- **New billing components**: `src/components/billing/` (credit-display, pricing-table, subscription-card, payment-failed-banner)
- **New hooks**: `src/hooks/useCredits.ts`
- **Credit refresh**: `useVideoStore.notifyGenerationComplete()` → triggers `useCredits.refresh()` via `setOnGenerationComplete` callback
<!-- MANUAL ADDITIONS END -->
