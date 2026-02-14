# Tasks: Landing Page (F010)

**Input**: Design documents from `specs/010-landing-page/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/components.md ✅, quickstart.md ✅

**Tests**: Not requested — no test tasks included.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Setup and Foundational phases have no story label

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install missing dependencies and create the landing component directory structure.

- [x] T001 Install shadcn/ui Accordion component via `npx shadcn@latest add accordion` (required for LandingFaq — currently missing from `src/components/ui/`)
- [x] T002 Create `src/components/landing/` directory (new isolated landing component namespace)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core changes that ALL sections depend on — dark theme tokens, metadata base, and component directory. Must be complete before any section component is built.

**⚠️ CRITICAL**: All user story work depends on these being complete first.

- [x] T003 Add `.landing` scoped CSS custom property overrides to `src/app/globals.css` — dark background (`oklch(0.07 0.01 265)`), foreground, card, muted, border tokens (see plan.md CSS Scope section)
- [x] T004 Update `src/app/layout.tsx` — add `metadataBase: new URL('https://reelzero.ai')` to the existing `metadata` export

**Checkpoint**: Dark theme tokens active; `metadataBase` set. Component builds can now begin.

---

## Phase 3: User Story 1 — Visitor Learns About the Product (Priority: P1) 🎯 MVP

**Goal**: An unauthenticated visitor can load the landing page, see all above-fold content (header + hero + features + how-it-works), understand what ReelZero does, and click a CTA to sign up.

**Independent Test**: Open `http://localhost:3000` in incognito. Above-fold hero is visible within 2 seconds. All 3 feature cards render. All 3 how-it-works steps render with images. "Get Started" CTA links to `/sign-up`. Page has no horizontal scroll at 375px, 768px, 1280px.

### Implementation for User Story 1

- [x] T005 [US1] Create `src/components/landing/landing-header.tsx` — Client Component (`"use client"`); accepts `isSignedIn: boolean` prop; renders fixed header with brand wordmark left and single CTA button right; `isSignedIn=true` → `<Link href="/dashboard">Go to Dashboard</Link>`, `isSignedIn=false` → `<Link href="/sign-up">Get Started</Link>`; styles: `fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50`
- [x] T006 [US1] Create `src/components/landing/landing-hero.tsx` — Server Component; accepts `isSignedIn: boolean`; renders two-column grid (`lg:grid-cols-2`), stacked on mobile; left: `<h1>` "Turn Any Idea Into a 60-Second Video", sub-headline, CTA button (same auth logic as header); right: `<Image src="/images/landing/hero.png" priority width={1200} height={800} alt="ReelZero product preview" className="w-full h-auto rounded-xl" />`; top padding `pt-24` to clear fixed header
- [x] T007 [P] [US1] Create `src/components/landing/landing-features.tsx` — Server Component; section `id="features"`; heading "Why ReelZero?"; 3-card grid (`grid-cols-1 md:grid-cols-3`); Card 1: `Zap` icon, "Under 90 Seconds", description; Card 2: `Video` icon, "Full HD 1080p", description; Card 3: `Wand2` icon, "Zero Skills Required", description; define `FeatureCard` type locally; use shadcn/ui `Card` components
- [x] T008 [P] [US1] Create `src/components/landing/landing-how-it-works.tsx` — Server Component; section `id="how-it-works"`; heading "How It Works"; 3 numbered steps (`grid-cols-1 lg:grid-cols-3`); each step: step number badge (circle), `<Image>` (step-1/2/3.png, lazy load — no `priority`), bold title, description; Step 1: `step-1.png` / "Enter a Prompt"; Step 2: `step-2.png` / "Customize Your Video"; Step 3: `step-3.png` / "Download & Share"; define `HowItWorksStep` type locally
- [x] T009 [US1] Replace `src/app/page.tsx` — async Server Component; import `auth` from `@clerk/nextjs/server`; call `const { userId } = await auth()`; derive `const isSignedIn = !!userId`; export page-level `metadata` with full OG/Twitter/canonical tags (see plan.md Metadata section); wrap all content in `<div className="landing min-h-screen bg-background text-foreground">`; render in order: `<LandingHeader isSignedIn={isSignedIn} />`, `<main>` containing `<LandingHero isSignedIn={isSignedIn} />`, `<LandingFeatures />`, `<LandingHowItWorks />` (pricing/FAQ/footer are stubs or omitted — wired in later phases)

**Checkpoint**: US1 fully functional. Visitor sees header, hero, features, how-it-works. All responsive. CTAs correct for both auth states.

---

## Phase 4: User Story 2 — Visitor Evaluates Pricing (Priority: P2)

**Goal**: A visitor can scroll to the pricing section and see all 4 tiers with prices, credits, features, and working CTAs. Enterprise card shows "Contact Sales". Pro tier is highlighted as most popular.

**Independent Test**: Navigate to `http://localhost:3000/#pricing`. All 4 tier cards render from `PRICING_TIERS`. Prices match PRD (Free/$0, Basic/$29, Pro/$79, Enterprise/Custom). Pro has "Most Popular" badge. Free/Basic/Pro CTAs link to `/sign-up`. Enterprise CTA opens `mailto:sales@reelzero.ai`. Layout is 4-col on xl, 2-col on md, 1-col on mobile.

### Implementation for User Story 2

- [x] T010 [US2] Create `src/components/landing/landing-pricing-table.tsx` — Server Component; section `id="pricing"`; import `PRICING_TIERS` from `@/lib/constants/pricing`; define local `LANDING_TIER_FEATURES: Record<string, string[]>` with display strings for all 4 tiers; heading "Simple, Transparent Pricing" + sub-heading "Start free. Upgrade when you need more."; `grid-cols-1 md:grid-cols-2 xl:grid-cols-4`; Pro tier: `ring-2 ring-primary` border + `<Badge>Most Popular</Badge>`; price display: Free → "Free", Enterprise → "Custom", others → `$${tier.monthlyPrice / 100}/mo`; CTA: Free/Basic/Pro → `<Link href="/sign-up"><Button>Get Started</Button></Link>`; Enterprise → `<Button variant="outline" asChild><a href="mailto:sales@reelzero.ai">Contact Sales</a></Button>`; NO `onSelectTier`, NO `isLoading`, NO current plan state
- [x] T011 [US2] Update `src/app/page.tsx` — add `<LandingPricingTable />` inside `<main>` after `<LandingHowItWorks />`

**Checkpoint**: US2 functional. Pricing section renders and anchors correctly at `#pricing`.

---

## Phase 5: User Story 3 — Visitor Reads FAQ and Converts (Priority: P3)

**Goal**: A visitor reads the FAQ, has their questions answered, reaches the footer with useful links, and if authenticated sees "Go to Dashboard" CTA.

**Independent Test**: Navigate to `http://localhost:3000/#faq`. FAQ accordion renders with ≥6 items, all collapsed by default. Each item expands on click. Footer is visible below FAQ with all 4 links. Navigate to `http://localhost:3000/#pricing` anchor from footer "Pricing" link — scrolls correctly. Sign in and visit `/` — primary CTA shows "Go to Dashboard".

### Implementation for User Story 3

- [x] T012 [US3] Create `src/components/landing/landing-faq.tsx` — mark `"use client"` (required for Accordion); section `id="faq"`; heading "Frequently Asked Questions"; import `Accordion, AccordionContent, AccordionItem, AccordionTrigger` from `@/components/ui/accordion`; `type="single" collapsible`; define `FAQ_ITEMS: FaqItem[]` locally (6 items: What is ReelZero, How credits work, Video format, Free credits exhausted, Own images, Generation time — see plan.md); define `type FaqItem = { question: string; answer: string }`
- [x] T013 [P] [US3] Create `src/components/landing/landing-footer.tsx` — Server Component; horizontal flex layout (`flex flex-col sm:flex-row justify-between items-center`); copyright left: "© 2026 ReelZero. All rights reserved."; links right: Sign In (`/sign-in`), Pricing (`#pricing`), Privacy Policy (`/privacy`), Terms of Service (`/terms`); use `<Link>` for internal routes, `<a>` for anchor link
- [x] T014 [US3] Update `src/app/page.tsx` — add `<LandingFaq />` after `<LandingPricingTable />` inside `<main>`, and `<LandingFooter />` after `</main>` (outside main, as a page-level footer element)

**Checkpoint**: All 3 user stories complete. Full landing page functional end-to-end.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Responsiveness verification, visual refinement, SEO validation, and pre-commit gate.

- [x] T015 [P] Verify full responsive layout — test at 375px, 768px, 1024px, 1440px using Chrome DevTools; fix any horizontal overflow, text truncation, or image overflow issues across all sections
- [x] T016 [P] Verify SEO metadata — view page source in browser and confirm presence of: `<title>`, `<meta name="description">`, `og:title`, `og:description`, `og:image`, `twitter:card`, `twitter:image`, canonical link tag; all values must be non-empty
- [x] T017 [P] Verify anchor deep-links — test `/#features`, `/#how-it-works`, `/#pricing`, `/#faq` in browser; each must scroll to the correct section without JS disabled errors
- [x] T018 [P] Verify auth-aware CTAs — test unauthenticated (incognito) shows "Get Started" → `/sign-up`; test authenticated shows "Go to Dashboard" → `/dashboard` in both header and hero
- [x] T019 Verify server-render without JS — disable JavaScript in Chrome DevTools (Settings → Debugger → Disable JavaScript); reload page; confirm all sections (hero, features, pricing, FAQ content) are readable; only Accordion interactivity should be non-functional
- [x] T020 Run pre-commit gate — `npm run pre-commit` (lint + type-check + build); fix all errors before marking complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — T005 → T006 → T007, T008 can parallel → T009 wires all
- **Phase 4 (US2)**: Depends on Phase 2; T010 can start in parallel with Phase 3 (different file) → T011 depends on T010 and T009
- **Phase 5 (US3)**: Depends on Phase 2; T012 and T013 can parallel → T014 depends on T012+T013+T009
- **Phase 6 (Polish)**: Depends on all prior phases complete

### User Story Dependencies

- **US1 (P1)**: Requires T003 (CSS tokens) and T004 (metadataBase) — no dependency on US2/US3
- **US2 (P2)**: Requires T003+T004 and T009 (page.tsx must exist to add pricing section) — independent of US3
- **US3 (P3)**: Requires T003+T004 and T009 (page.tsx must exist) — independent of US2

### Within Each User Story

- T007 (features) and T008 (how-it-works) can be built in parallel — separate files
- T012 (FAQ) and T013 (footer) can be built in parallel — separate files
- T005 (header) must come before T009 (page.tsx wiring) — page imports header

### Parallel Opportunities

- T007 and T008 (Phase 3): both separate component files, no dependencies on each other
- T010 (Phase 4): can be built in parallel with T007/T008 since it's a separate file
- T012 and T013 (Phase 5): separate component files, fully parallel
- T015–T019 (Phase 6): all verification tasks are read-only and fully parallel

---

## Parallel Example: Phase 3 (US1)

```
# After T003+T004 complete:

Parallel batch 1 (all independent component files):
  Task T005: Create landing-header.tsx
  Task T006: Create landing-hero.tsx
  Task T007: Create landing-features.tsx
  Task T008: Create landing-how-it-works.tsx

Sequential after batch 1:
  Task T009: Replace app/page.tsx (imports all above components)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T004)
3. Complete Phase 3: US1 (T005–T009)
4. **STOP and VALIDATE**: Open `localhost:3000` — header, hero, features, how-it-works all visible; CTAs correct; responsive
5. Demo-ready MVP landing page

### Incremental Delivery

1. Setup + Foundational → base tokens and metadata ready
2. US1 → above-fold sections live (visitor understands the product)
3. US2 → pricing section live (visitor can evaluate and convert)
4. US3 → FAQ + footer live (visitor objections resolved)
5. Polish → production-ready

### Parallel Strategy (if 2 developers)

- Dev A: T005 (header) → T006 (hero) → T009 (page.tsx)
- Dev B: T007 (features) → T008 (how-it-works) → T010 (pricing)
- Merge at T009/T011 wiring step

---

## Notes

- `[P]` tasks = different files, no blocking dependencies — safe to run in parallel
- `[Story]` label maps each task to its user story for traceability
- No test tasks included (not requested in spec)
- `LandingHeader` is the ONLY Client Component (`"use client"`) — all others are Server Components except `LandingFaq` (needs Accordion)
- The `PRICING_TIERS` constant is already typed and frozen — do not modify it; define `LANDING_TIER_FEATURES` locally in `landing-pricing-table.tsx`
- Do not create a barrel/index file in `src/components/landing/` — direct imports only (Constitution Principle III)
- Commit after each phase checkpoint: `feat(landing): add hero and above-fold sections`
