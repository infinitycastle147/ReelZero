# Implementation Plan: Landing Page

**Branch**: `010-landing-page` | **Date**: 2026-02-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/010-landing-page/spec.md`

---

## Summary

Build a public-facing marketing landing page at `app/page.tsx` for ReelZero. The page is fully static/server-rendered, dark-themed, and consists of 6 sections: Header, Hero, Features, How It Works, Pricing, FAQ, and Footer. Auth state is detected server-side (Clerk `auth()`) to conditionally swap CTA labels. No API routes, no database access, no AI calls — pure UI with static data. Assets are pre-generated PNGs in `public/images/landing/`. Pricing data reuses `PRICING_TIERS` constant from F006.

---

## Technical Context

**Language/Version**: TypeScript 5+ (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19, shadcn/ui (new-york/neutral), Tailwind CSS v4, `@clerk/nextjs` ^6 (existing), `lucide-react` (existing), `next/image` (built-in)
**Storage**: N/A — no database access; assets served from `public/`
**Testing**: `npm test` (existing test runner)
**Target Platform**: Vercel (serverless, SSR/SSG)
**Performance Goals**: Above-fold content visible within 2 seconds on broadband; hero image is LCP element, must load with `priority`
**Constraints**: No client-side state management needed (Zustand not used); no new npm packages required; all components use existing shadcn/ui primitives
**Scale/Scope**: Single page, 7 section components, 1 landing-specific CSS scope block

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies | Status | Notes |
|---|---|---|---|
| I. AI Provider Abstraction | No | N/A | No AI calls on landing page |
| II. Strict Type Safety | Yes | Pass | All components fully typed; `any` forbidden |
| III. Direct Imports Only | Yes | Pass | No barrel files; named exports; direct `@/` imports |
| IV. Database Abstraction | No | N/A | No DB access — static pricing data from constants |
| V. Microservice Boundary | No | N/A | No rendering service interaction |
| VI. Credit-Gated Operations | No | N/A | No generation on marketing page |
| VII. Naming & Structure | Yes | Pass | kebab-case files, named exports, `src/components/landing/` |

**All gates pass. No violations.**

---

## Project Structure

### Documentation (this feature)

```text
specs/010-landing-page/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (component prop contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── page.tsx                          # REPLACE — full landing page (Server Component)
│   ├── layout.tsx                        # UPDATE — add metadataBase
│   └── globals.css                       # UPDATE — add .landing scoped CSS tokens
│
└── components/
    └── landing/                          # NEW directory
        ├── landing-header.tsx            # Fixed header: logo + auth-aware CTA button
        ├── landing-hero.tsx              # Hero: headline + subheadline + CTA + hero image
        ├── landing-features.tsx          # Features grid: 3 cards with Lucide icons
        ├── landing-how-it-works.tsx      # 3-step process with step images
        ├── landing-pricing-table.tsx     # Read-only 4-tier pricing for public page
        ├── landing-faq.tsx               # FAQ accordion: 6 Q&A pairs
        └── landing-footer.tsx            # Footer: links + copyright

public/
└── images/
    └── landing/
        ├── hero.png                      # ASSET-001 (provided)
        ├── step-1.png                    # ASSET-002 (provided)
        ├── step-2.png                    # ASSET-003 (provided)
        ├── step-3.png                    # ASSET-004 (provided)
        └── og-image.png                  # ASSET-005 (provided)
```

**Structure Decision**: Single web project (Next.js App Router). All landing-specific components isolated in `src/components/landing/` to keep them separate from dashboard and billing components. No new route groups needed — `app/page.tsx` already exists at the root.

---

## Phase 0: Research

Complete — see [research.md](./research.md)

Key resolutions:

| Unknown | Decision |
|---|---|
| Auth-aware CTA on public page | `auth()` server helper in `page.tsx`, pass `isSignedIn` prop to header |
| PricingTable reuse | New `LandingPricingTable` (read-only) reusing `PRICING_TIERS` constant |
| Dark background scope | `.landing` CSS class with scoped token overrides in `globals.css` |
| OG meta tags | Page-level `metadata` export + `metadataBase` in `layout.tsx` |
| Image optimisation | `next/image` with `priority` on hero (LCP element) |
| Section anchors | Native `id` attribute on each `<section>` wrapper |

---

## Phase 1: Design & Contracts

### Component Architecture

The root `app/page.tsx` is a **Server Component** that:
1. Calls Clerk `auth()` to get `userId`
2. Derives `isSignedIn: boolean`
3. Renders all section components server-side
4. Passes `isSignedIn` to components that need CTA variation

```
app/page.tsx (Server Component)
├── <LandingHeader isSignedIn />     — Client Component (link href varies by auth)
├── <LandingHero isSignedIn />       — Server Component
├── <LandingFeatures />              — Server Component (static)
├── <LandingHowItWorks />            — Server Component (static)
├── <LandingPricingTable />          — Server Component (static PRICING_TIERS)
├── <LandingFaq />                   — Server Component (static Q&A)
└── <LandingFooter />                — Server Component (static links)
```

`LandingHeader` is the only Client Component. It accepts `isSignedIn` as a prop so no client-side auth hook is needed — avoids CTA flicker.

### Section Design Specifications

#### LandingHeader

- Fixed top, full-width, `z-50`
- Background: `bg-background/80 backdrop-blur-md border-b border-border/50` (glassmorphism)
- Left: "ReelZero" brand wordmark (text or SVG logo)
- Right: single CTA button
  - `isSignedIn=true` → `<Link href="/dashboard">Go to Dashboard</Link>`
  - `isSignedIn=false` → `<Link href="/sign-up">Get Started</Link>`

#### LandingHero

- Two-column grid on desktop (`lg:grid-cols-2`), single-column stacked on mobile
- Left: `h1` headline, `p` sub-headline, CTA button, subtle stat strip ("Join X creators", optional)
- Right: `<Image src="/images/landing/hero.png" priority alt="ReelZero product preview" ...>`
- Headline: `"Turn Any Idea Into a 60-Second Video"`
- Sub-headline: `"AI-powered short-form video creation. No editing skills needed. Just type a prompt."`
- Top padding: `pt-24` to clear fixed header

#### LandingFeatures

- Section `id="features"`
- `<section>` with heading "Why ReelZero?"
- 3-column card grid (`grid-cols-1 md:grid-cols-3`)
- Card 1: `Zap` icon — "Under 90 Seconds" — "From prompt to downloadable MP4 faster than any competitor."
- Card 2: `VideoIcon` icon — "Full HD 1080p" — "Every video at 1080×1920 — crisp, vertical, ready for Reels, Shorts, and TikTok."
- Card 3: `Wand2` icon — "Zero Skills Required" — "Type what you want. AI writes the script, generates visuals, and records the voiceover."

#### LandingHowItWorks

- Section `id="how-it-works"`
- Heading "How It Works"
- 3 numbered steps, horizontal on desktop, vertical on mobile
- Each step: step number badge, `<Image>` of step screenshot, bold step title, description
- Step 1: `step-1.png` — "Enter a Prompt" — "Describe your video topic in plain English. 50–500 characters."
- Step 2: `step-2.png` — "Customize Your Video" — "Edit the AI script, pick a voice, choose a visual theme and captions."
- Step 3: `step-3.png` — "Download & Share" — "Your 60-second MP4 is ready in under 90 seconds. Post anywhere."

#### LandingPricingTable

- Section `id="pricing"`
- Heading "Simple, Transparent Pricing"
- Sub-heading "Start free. Upgrade when you need more."
- Uses `PRICING_TIERS` from `@/lib/constants/pricing`
- Defines local `LANDING_TIER_FEATURES: Record<string, string[]>` for display strings
- 4-column grid (`grid-cols-1 md:grid-cols-2 xl:grid-cols-4`)
- Pro tier highlighted with `ring-2 ring-primary` + "Most Popular" badge
- CTA per tier:
  - Free/Basic/Pro: `<Link href="/sign-up">Get Started</Link>`
  - Enterprise: `<a href="mailto:sales@reelzero.ai">Contact Sales</a>`
- No `onSelectTier` callback, no `isLoading` state — read-only display

#### LandingFaq

- Section `id="faq"`
- Heading "Frequently Asked Questions"
- Uses shadcn/ui `Accordion` (single or multiple expand mode)
- 6 items:
  1. "What is ReelZero?" — "ReelZero is an AI-powered platform that generates professional 60-second vertical videos from a text prompt..."
  2. "How do credits work?" — "1 credit = 1 video generation. Credits reset monthly on your billing date."
  3. "What format are the videos?" — "MP4 (H.264), 1080×1920 pixels, 30fps, ~60 seconds."
  4. "What happens when my free credits run out?" — "Generation is paused until your next billing cycle, or you can upgrade to a paid plan."
  5. "Can I use my own images?" — "Yes — upload PNG, JPG, or WEBP (up to 5MB per image) for any scene."
  6. "How long does video generation take?" — "Under 90 seconds for most videos."

#### LandingFooter

- Horizontal layout: copyright left, nav links right
- Copyright: `© 2026 ReelZero. All rights reserved.`
- Links: Sign In (`/sign-in`), Pricing (`#pricing`), Privacy Policy (`/privacy`), Terms of Service (`/terms`)

### CSS Scope Addition

Add to `src/app/globals.css`:

```css
/* Landing page dark theme */
.landing {
  --background: oklch(0.07 0.01 265);
  --foreground: oklch(0.97 0 0);
  --card: oklch(0.10 0.015 265);
  --card-foreground: oklch(0.97 0 0);
  --muted: oklch(0.14 0.01 265);
  --muted-foreground: oklch(0.65 0 0);
  --border: oklch(0.20 0.01 265);
  --input: oklch(0.20 0.01 265);
}
```

The existing `--primary` (electric blue `oklch(0.546 0.245 262.881)`) works on dark backgrounds without changes.

### Metadata

**`layout.tsx`** — add `metadataBase: new URL('https://reelzero.ai')` to the existing `metadata` export.

**`app/page.tsx`** — export page-level `metadata`:
```ts
export const metadata: Metadata = {
  title: 'ReelZero — AI Video Creator for Reels & Shorts',
  description: 'Generate professional 60-second vertical videos from a text prompt in under 90 seconds. No editing skills required.',
  openGraph: {
    title: 'ReelZero — AI Video Creator',
    description: 'Turn any idea into a 60-second video. AI-powered, no editing skills needed.',
    images: ['/images/landing/og-image.png'],
    type: 'website',
    url: 'https://reelzero.ai',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReelZero — AI Video Creator',
    description: 'Turn any idea into a 60-second video.',
    images: ['/images/landing/og-image.png'],
  },
  alternates: { canonical: 'https://reelzero.ai' },
}
```

---

## Complexity Tracking

No constitution violations. No complexity justification required.

---

## Post-Design Constitution Re-check

| Principle | Status | Notes |
|---|---|---|
| II. Strict Type Safety | Pass | All component props typed; `LANDING_TIER_FEATURES` typed as `Record<string, string[]>` |
| III. Direct Imports Only | Pass | Direct `@/` imports only; no barrel file in `src/components/landing/` |
| VII. Naming & Structure | Pass | All files kebab-case; named exports; boolean prop `isSignedIn` follows `is` prefix rule |

**All gates pass post-design.**
