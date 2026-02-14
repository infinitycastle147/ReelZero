# Quickstart: Landing Page (F010)

**Branch**: `010-landing-page` | **Date**: 2026-02-14

---

## Prerequisites

All prerequisites are already met — this feature has no new dependencies:

- [x] F001 (Foundation) — Next.js, TypeScript, Tailwind, shadcn/ui
- [x] F002 (Design System) — oklch tokens, `globals.css`, layout patterns
- [x] F006 (Billing) — `PRICING_TIERS` constant in `src/lib/constants/pricing.ts`
- [x] Clerk configured — `middleware.ts` already marks `/` as public route
- [x] Assets in place — `public/images/landing/` has all 5 PNGs

---

## Environment Variables

No new environment variables required. All existing `.env.local` variables for Clerk are already configured.

---

## New npm Packages

**None.** All required packages are already installed:
- `@clerk/nextjs` — auth
- `lucide-react` — icons
- `next/image` — image optimization (built-in)
- shadcn/ui primitives — `Button`, `Card`, `Badge`, `Accordion` (verify `Accordion` below)

### Verify Accordion is Installed

```bash
ls src/components/ui/accordion.tsx 2>/dev/null && echo "installed" || echo "MISSING — install with: npx shadcn@latest add accordion"
```

If missing, add it:
```bash
npx shadcn@latest add accordion
```

---

## Development Workflow

### 1. Start Dev Server

```bash
npm run dev
```

Navigate to `http://localhost:3000` — currently shows the stub placeholder page. After implementation, this will render the full landing page.

### 2. Implement in Order

Follow this sequence (each step is independently testable):

1. **CSS tokens** — Add `.landing` class to `globals.css`; verify dark background appears when wrapper div has `className="landing"`
2. **`LandingHeader`** — Build header; test with `isSignedIn=false` and `isSignedIn=true`
3. **`LandingHero`** — Build hero with hero image; verify `priority` prop on Image
4. **`LandingFeatures`** — Build 3-card features grid
5. **`LandingHowItWorks`** — Build 3-step section with step images
6. **`LandingPricingTable`** — Build pricing cards from `PRICING_TIERS`
7. **`LandingFaq`** — Build accordion FAQ (check Accordion is installed first)
8. **`LandingFooter`** — Build footer with links
9. **`app/page.tsx`** — Wire all components together with `auth()` call
10. **`layout.tsx`** — Add `metadataBase`
11. **Verify SEO** — Open page source and check all meta tags are present

### 3. Verify Responsive Layout

Open Chrome DevTools → Toggle Device Toolbar and test at:
- 375px (iPhone SE — mobile)
- 768px (tablet)
- 1280px (desktop)
- 1440px (large desktop)

Check for horizontal scroll at each breakpoint.

### 4. Verify Auth-Aware CTAs

Test both states:
- **Unauthenticated**: Open in incognito → CTAs should say "Get Started" linking to `/sign-up`
- **Authenticated**: Sign in to the app → navigate to `/` → CTAs should say "Go to Dashboard" linking to `/dashboard`

### 5. Verify Anchor Links

Test deep links:
```
http://localhost:3000/#features
http://localhost:3000/#how-it-works
http://localhost:3000/#pricing
http://localhost:3000/#faq
```

Each should scroll to the correct section.

### 6. Pre-Commit Check

```bash
npm run pre-commit
```

Must pass: lint (0 errors/warnings), type-check (0 errors), build (succeeds).

---

## Key Files Reference

| File | Action |
|---|---|
| `src/app/page.tsx` | REPLACE entirely |
| `src/app/layout.tsx` | ADD `metadataBase` to metadata |
| `src/app/globals.css` | APPEND `.landing` CSS block |
| `src/components/landing/landing-header.tsx` | CREATE |
| `src/components/landing/landing-hero.tsx` | CREATE |
| `src/components/landing/landing-features.tsx` | CREATE |
| `src/components/landing/landing-how-it-works.tsx` | CREATE |
| `src/components/landing/landing-pricing-table.tsx` | CREATE |
| `src/components/landing/landing-faq.tsx` | CREATE |
| `src/components/landing/landing-footer.tsx` | CREATE |
| `public/images/landing/` | ALREADY POPULATED (5 PNGs) |

---

## Common Gotchas

| Issue | Fix |
|---|---|
| Hero image not loading | Check path is `/images/landing/hero.png` (no `/public` prefix in `src`) |
| Dark theme not applying | Ensure root `<div className="landing">` wraps the entire page content |
| CTA flicker on load | Ensure `isSignedIn` is passed from Server Component — do NOT use `useUser()` hook |
| Accordion not found | Run `npx shadcn@latest add accordion` |
| OG image not resolving | Ensure `metadataBase` is set in `layout.tsx` before page-level metadata runs |
| Fixed header overlapping content | Add `pt-24` (or equivalent header height) to hero section top padding |
