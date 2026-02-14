# Data Model: Landing Page (F010)

**Branch**: `010-landing-page` | **Date**: 2026-02-14

---

## Overview

The landing page has **no persistent data entities**. It is a fully static, server-rendered marketing page. All displayed data is sourced from:

1. **Compile-time constants** — pricing tiers from `src/lib/constants/pricing.ts`
2. **Static copy** — hardcoded strings in component files (headlines, feature descriptions, FAQ content)
3. **Static assets** — PNG images in `public/images/landing/`
4. **Auth state** — derived at request-time from Clerk `auth()` server helper (not persisted)

No database reads, writes, or mutations occur on this page.

---

## Static Data Structures

These are not database entities — they are TypeScript types used within component files.

### FeatureCard

Used in `LandingFeatures` component.

```ts
type FeatureCard = {
  icon: LucideIcon;       // Lucide React icon component
  title: string;          // e.g. "Under 90 Seconds"
  description: string;    // e.g. "From prompt to downloadable MP4..."
}
```

**Instances** (hardcoded, 3 total):
- `{ icon: Zap, title: "Under 90 Seconds", description: "..." }`
- `{ icon: Video, title: "Full HD 1080p", description: "..." }`
- `{ icon: Wand2, title: "Zero Skills Required", description: "..." }`

---

### HowItWorksStep

Used in `LandingHowItWorks` component.

```ts
type HowItWorksStep = {
  stepNumber: number;     // 1, 2, 3
  imageSrc: string;       // e.g. "/images/landing/step-1.png"
  imageAlt: string;       // accessible alt text
  title: string;          // e.g. "Enter a Prompt"
  description: string;    // e.g. "Describe your video topic..."
}
```

**Instances** (hardcoded, 3 total): one per step.

---

### LandingTierFeatures

Used in `LandingPricingTable` component. Augments `PRICING_TIERS` with human-readable display strings.

```ts
const LANDING_TIER_FEATURES: Record<string, string[]> = {
  free:       ["3 videos/month", "720p resolution", "Watermarked", "Basic voices"],
  basic:      ["30 videos/month", "1080p HD", "No watermark", "Basic voices"],
  pro:        ["100 videos/month", "1080p HD", "No watermark", "All 50+ voices", "Priority support"],
  enterprise: ["Unlimited videos", "1080p HD", "Custom branding", "Dedicated support", "SLA guarantee"],
}
```

---

### FaqItem

Used in `LandingFaq` component.

```ts
type FaqItem = {
  question: string;
  answer: string;
}
```

**Instances** (hardcoded, 6 total): see plan.md Phase 1 → LandingFaq section.

---

### LandingHeaderProps

Runtime prop — not persisted. Derived from Clerk `auth()` in `app/page.tsx`.

```ts
type LandingHeaderProps = {
  isSignedIn: boolean;
}
```

---

## Reused Constants

| Constant | Source | Usage |
|---|---|---|
| `PRICING_TIERS` | `src/lib/constants/pricing.ts` | Tier names, prices, credit counts in `LandingPricingTable` |

No new constants files are created. `LANDING_TIER_FEATURES` is defined locally within `landing-pricing-table.tsx` (not exported — no other file needs it).
