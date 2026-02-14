# Research: Landing Page (F010)

**Branch**: `010-landing-page` | **Date**: 2026-02-14

---

## Decision 1: Auth-Aware CTA on Public Page

**Question**: How do we conditionally show "Get Started" vs "Go to Dashboard" on a public route without wrapping the whole page in auth middleware?

**Decision**: Use Clerk's `auth()` server-side helper directly in `app/page.tsx` (Server Component). Since `/` is already declared as a public route in `middleware.ts` with `createRouteMatcher`, `auth()` returns `{ userId: null }` for unauthenticated visitors and `{ userId: string }` for signed-in users — without throwing or redirecting. Pass `isSignedIn` as a prop down to the `LandingHeader` client component.

**Rationale**: Zero additional client-side hydration cost. No `useUser()` hook needed. The page renders the correct CTA server-side. Avoids a flash-of-incorrect-content.

**Alternatives considered**:
- `useUser()` hook in a Client Component — causes CTA flicker on load (shows unauthenticated state first, then hydrates). Rejected.
- Clerk `<SignedIn>` / `<SignedOut>` wrapper components — require the full header to be a Client Component and cause layout shift. Rejected.

---

## Decision 2: PricingTable Reuse Strategy

**Question**: The existing `PricingTable` from F006 (`src/components/billing/pricing-table.tsx`) requires `currentTier`, `onSelectTier`, and `isLoading` props — it's designed for authenticated billing page use. Can it be reused on the public landing page?

**Decision**: Build a separate `LandingPricingTable` component in `src/components/landing/landing-pricing-table.tsx`. This component is read-only (no tier selection, no loading state) and renders all 4 tiers with "Get Started" CTAs pointing to `/sign-up`. It reuses `PRICING_TIERS` and the same `TIER_FEATURES` data but has no callbacks or auth dependency.

**Rationale**: The F006 `PricingTable` is tightly coupled to the billing flow (Stripe checkout callbacks, current plan highlighting, upgrade/downgrade logic). Forcing it to work on a public page would require null-proofing all props and adding route-awareness. A dedicated landing component is simpler, independently testable, and doesn't risk breaking the billing page.

**Alternatives considered**:
- Making `onSelectTier` optional and adding an `isPublic` mode to the existing component — adds conditional complexity to a component that should have one job. Rejected.
- Redirecting Enterprise CTA to `/sign-up?plan=enterprise` — unnecessary complexity; a `mailto:` is sufficient for MVP as per spec assumptions. Accepted.

---

## Decision 3: Dark Background Scoped to Landing Page

**Question**: The existing design system uses light-mode tokens (`:root` with `--background: oklch(1 0 0)` = white). The landing page spec requires a dark aesthetic (`#0a0a0f` background, electric blue/violet accents). How do we apply this without polluting other pages?

**Decision**: Apply a `dark` class to the `<html>` element only for the landing page using a Next.js `<html className="dark">` override in a landing-specific layout, OR apply inline CSS custom property overrides scoped to the landing page wrapper `<div>`. The cleanest approach for App Router: wrap `app/page.tsx` content in a `<main className="landing">` and add a scoped CSS block in `globals.css` that overrides background/foreground tokens only within `.landing`. This avoids a separate layout file while keeping token overrides isolated.

**Rationale**: The landing page is the only page with a dark-first design. A separate layout would require restructuring the route tree. Scoped CSS overrides are the lowest-friction approach and are reversible.

**Implementation note**: Add to `globals.css`:
```css
.landing {
  --background: oklch(0.07 0.01 265);   /* ≈ #0a0a0f */
  --foreground: oklch(0.97 0 0);         /* near-white */
  --card: oklch(0.10 0.015 265);
  --card-foreground: oklch(0.97 0 0);
  --muted: oklch(0.14 0.01 265);
  --muted-foreground: oklch(0.65 0 0);
  --border: oklch(0.20 0.01 265);
}
```
The electric blue/violet accent (`--primary: oklch(0.546 0.245 262.881)`) already exists in the design system and works on dark backgrounds without changes.

**Alternatives considered**:
- Separate `app/(landing)/layout.tsx` with `<html className="dark">` — cleaner but requires moving `app/page.tsx` into a route group, restructuring existing routes. More effort than value for one page. Rejected.
- Hardcoded Tailwind colour classes (e.g., `bg-[#0a0a0f]`) everywhere — breaks design system token discipline. Rejected.

---

## Decision 4: SEO Metadata (OG Tags)

**Question**: The root `layout.tsx` already exports a `metadata` object with a basic title and description. How do we add full OG tags for the landing page specifically?

**Decision**: Export a `metadata` object directly from `app/page.tsx`. In Next.js App Router, page-level `metadata` exports **merge with and override** the root layout's `metadata`. This means we add `openGraph`, `twitter`, and `alternates.canonical` in the page's metadata export without touching `layout.tsx`.

**Rationale**: Standard Next.js pattern. Zero configuration overhead. The `og:image` resolves to an absolute URL using the `metadataBase` property set in `layout.tsx` (to be added) or directly as an absolute URL string.

**Implementation note**: Add `metadataBase: new URL('https://reelzero.ai')` to `layout.tsx` metadata so all relative OG image paths resolve correctly in production.

---

## Decision 5: Image Optimisation Strategy

**Question**: The 5 PNG assets in `public/images/landing/` are large (1.7–2.4 MB each). How do we serve them efficiently?

**Decision**: Use Next.js `<Image>` component (from `next/image`) for all landing page images. Next.js automatically:
- Serves WebP/AVIF versions to supporting browsers
- Resizes to the requested `width` prop
- Applies lazy loading (except hero image which gets `priority`)
- Sets correct `width` and `height` to prevent CLS

**Rationale**: Built-in, zero-config optimization. No additional packages. Hero image gets `priority` prop to trigger eager loading (LCP element).

---

## Decision 6: Section Anchor IDs

**Question**: FR-012 requires `#features`, `#how-it-works`, `#pricing`, `#faq` anchor links. Since the header has no nav links (minimal header — logo + CTA only per clarification), these anchors are for deep linking only (e.g., from other pages or external links).

**Decision**: Each section component receives an `id` prop matching the anchor slug. The section wrapper `<section id="features">`, `<section id="how-it-works">` etc. No scroll library needed — native browser anchor navigation handles this.

---

## Summary Table

| Question | Decision | Pattern |
|---|---|---|
| Auth-aware CTA | `auth()` in Server Component, prop to header | Next.js App Router + Clerk server helper |
| PricingTable reuse | New `LandingPricingTable` component | Isolated, read-only, no callbacks |
| Dark background scope | Scoped CSS custom property overrides via `.landing` class | CSS tokens, no layout restructure |
| OG meta tags | Page-level `metadata` export, `metadataBase` in layout | Next.js App Router metadata API |
| Image optimisation | `next/image` with `priority` on hero | Built-in Next.js image optimization |
| Section anchors | `id` on section wrappers | Native browser anchors |
