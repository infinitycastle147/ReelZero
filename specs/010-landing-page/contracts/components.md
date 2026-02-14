# Component Contracts: Landing Page (F010)

**Branch**: `010-landing-page` | **Date**: 2026-02-14

> No API routes are introduced by this feature. Contracts here describe component interfaces (props) and rendering behaviour.

---

## LandingHeader

**File**: `src/components/landing/landing-header.tsx`
**Type**: Client Component (`"use client"`)

```ts
type LandingHeaderProps = {
  isSignedIn: boolean;
}

export function LandingHeader({ isSignedIn }: LandingHeaderProps): JSX.Element
```

**Rendering contract**:
- Always renders a fixed header at top of viewport (`position: fixed`)
- Left: "ReelZero" brand wordmark
- Right: single CTA button
  - `isSignedIn === true` → renders `<Link href="/dashboard">Go to Dashboard</Link>`
  - `isSignedIn === false` → renders `<Link href="/sign-up">Get Started</Link>`
- No nav links, no hamburger, no dropdown

---

## LandingHero

**File**: `src/components/landing/landing-hero.tsx`
**Type**: Server Component

```ts
type LandingHeroProps = {
  isSignedIn: boolean;
}

export function LandingHero({ isSignedIn }: LandingHeroProps): JSX.Element
```

**Rendering contract**:
- Two-column grid on `lg+`, single column on mobile
- Left column: `<h1>` headline, `<p>` sub-headline, CTA button (same logic as header)
- Right column: `<Image src="/images/landing/hero.png" priority width={600} height={400} alt="ReelZero product preview" />`
- `priority` prop MUST be present on the Image — it is the LCP element
- Top padding MUST clear fixed header height

---

## LandingFeatures

**File**: `src/components/landing/landing-features.tsx`
**Type**: Server Component

```ts
export function LandingFeatures(): JSX.Element
```

**Rendering contract**:
- Section has `id="features"`
- Renders exactly 3 feature cards
- Each card: Lucide icon, bold title, description paragraph
- 3-column grid on `md+`, 1-column on mobile
- No props required — all data is hardcoded internally

---

## LandingHowItWorks

**File**: `src/components/landing/landing-how-it-works.tsx`
**Type**: Server Component

```ts
export function LandingHowItWorks(): JSX.Element
```

**Rendering contract**:
- Section has `id="how-it-works"`
- Renders exactly 3 numbered steps
- Each step: step number badge, `<Image>` (step-N.png), bold step title, description
- Images: NOT `priority` (below fold) — default lazy loading
- 3-column grid on `lg+`, vertical stack on mobile
- No props required

---

## LandingPricingTable

**File**: `src/components/landing/landing-pricing-table.tsx`
**Type**: Server Component

```ts
export function LandingPricingTable(): JSX.Element
```

**Rendering contract**:
- Section has `id="pricing"`
- Renders exactly 4 tier cards sourced from `PRICING_TIERS`
- Pro tier MUST have `ring-2 ring-primary` border and "Most Popular" badge
- Each card footer:
  - Free / Basic / Pro → `<Link href="/sign-up">Get Started</Link>` (Button)
  - Enterprise → `<a href="mailto:sales@reelzero.ai">Contact Sales</a>` (outline Button)
- No `onSelectTier` callback, no `isLoading` state, no current plan highlighting
- 4-column grid on `xl+`, 2-column on `md`, 1-column on mobile

---

## LandingFaq

**File**: `src/components/landing/landing-faq.tsx`
**Type**: Server Component (shadcn/ui Accordion is a Client Component — must be wrapped or imported)

> Note: shadcn/ui `Accordion` uses Radix UI which requires `"use client"`. Either mark `landing-faq.tsx` as `"use client"` or create a thin `FaqAccordion` client wrapper and keep `LandingFaq` as a server component that passes data down.

**Recommended approach**: Mark `landing-faq.tsx` as `"use client"` — it holds only static data and a UI primitive, no server-only code.

```ts
export function LandingFaq(): JSX.Element
```

**Rendering contract**:
- Section has `id="faq"`
- Renders shadcn/ui `Accordion` with minimum 6 items
- Each item: `AccordionItem` > `AccordionTrigger` (question) + `AccordionContent` (answer)
- All items collapsed by default (`type="single" collapsible`)
- No props required

---

## LandingFooter

**File**: `src/components/landing/landing-footer.tsx`
**Type**: Server Component

```ts
export function LandingFooter(): JSX.Element
```

**Rendering contract**:
- Horizontal layout: copyright text left, nav links right
- Copyright: `"© 2026 ReelZero. All rights reserved."`
- Links (all `<Link>` or `<a>`):
  - Sign In → `/sign-in`
  - Pricing → `#pricing` (anchor)
  - Privacy Policy → `/privacy`
  - Terms of Service → `/terms`
- On mobile: links wrap or stack below copyright

---

## app/page.tsx

**File**: `src/app/page.tsx`
**Type**: Server Component (async)

**Contract**:
- Exports `metadata: Metadata` (page-level SEO override)
- Calls `auth()` from `@clerk/nextjs/server`
- Derives `const isSignedIn = !!userId`
- Wraps all content in `<div className="landing">` to scope dark CSS tokens
- Renders all section components in order:
  1. `<LandingHeader isSignedIn={isSignedIn} />`
  2. `<main>` containing:
     - `<LandingHero isSignedIn={isSignedIn} />`
     - `<LandingFeatures />`
     - `<LandingHowItWorks />`
     - `<LandingPricingTable />`
     - `<LandingFaq />`
  3. `<LandingFooter />`

---

## Modified Files

### src/app/layout.tsx

**Change**: Add `metadataBase` to the existing `metadata` export:
```ts
metadataBase: new URL('https://reelzero.ai'),
```

### src/app/globals.css

**Change**: Append `.landing` scoped CSS custom property overrides (see plan.md CSS Scope section).

---

## No New API Routes

This feature introduces zero API routes. The page is public (`/` is already declared as a public route in `middleware.ts`) and requires no server-side data fetching beyond Clerk's `auth()` call.
