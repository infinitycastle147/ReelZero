# Tasks: Design System & Frontend Standards

**Input**: Design documents from `/specs/002-design-system/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: No tests requested in specification. Tasks are implementation and documentation only.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: No setup needed — project already scaffolded (F001), Tailwind CSS v4 + shadcn/ui already configured, branch `002-design-system` already exists.

*(No tasks — all infrastructure is in place from F001 and F001-clerk-auth.)*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Update CSS custom properties with violet/purple brand palette and gradient tokens. These token changes are consumed by ALL user stories and must land first.

**CRITICAL**: No user story work can begin until this phase is complete — all subsequent documentation and components reference these token values.

- [x] T001 [US1] Update `:root` light mode color tokens in `src/app/globals.css` — replace `--primary`, `--primary-foreground`, `--accent`, `--accent-foreground`, and `--ring` with violet oklch values from research R1 (e.g., `--primary: oklch(0.546 0.245 262.881)`)
- [x] T002 [US1] Update `.dark` dark mode color tokens in `src/app/globals.css` — replace `--primary`, `--primary-foreground`, `--accent`, `--accent-foreground`, and `--ring` with dark-mode violet oklch values from research R1
- [x] T003 [US1] Add sidebar color tokens in `src/app/globals.css` — update `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, and `--sidebar-ring` in both `:root` and `.dark` blocks to use violet-tinted values consistent with the main palette
- [x] T004 [US1] Add gradient custom properties in `src/app/globals.css` — define `--gradient-cta` and `--gradient-hero` in `:root` block with oklch gradient values from research R2
- [x] T005 [US1] Add gradient utility classes in `src/app/globals.css` — create `.bg-gradient-cta` and `.bg-gradient-hero` utility classes in `@layer utilities` that apply `background: var(--gradient-cta)` and `background: var(--gradient-hero)` respectively

**Checkpoint**: Foundation ready — `globals.css` has all violet tokens and gradient utilities. All shadcn/ui components now render with violet primary color.

---

## Phase 3: User Story 1 — Consistent Visual Identity (Priority: P1) MVP

**Goal**: Establish and document the complete color palette, shadow scale, and border-radius rules so any developer can build visually consistent pages.

**Independent Test**: Open any dashboard page — primary buttons show violet, focus rings are violet, cards use consistent shadows. A developer can look up any visual decision in `docs/DESIGN_SYSTEM.md` Section 1.

### Implementation for User Story 1

- [x] T006 [US1] Review `src/components/layout/sidebar-nav-item.tsx` — verify active state uses `bg-accent text-accent-foreground` which now resolves to violet-tinted values. No code changes expected; confirm visually after token update
- [x] T007 [US1] Write Section 1 "Color & Visual Tokens" in `docs/DESIGN_SYSTEM.md` — document the full color palette (primary, secondary, accent, muted, destructive), light/dark mode values, usage rules for each semantic token, gradient tokens and their restricted use cases (CTA buttons and hero only per FR-003), shadow/elevation scale (shadow-sm/md/lg mapped to component tiers per R3), and border-radius usage rules (per FR-005)

**Checkpoint**: User Story 1 complete — visual identity is applied via tokens and fully documented.

---

## Phase 4: User Story 2 — Predictable Page Layout and Spacing (Priority: P1) MVP

**Goal**: Document the "empty box" layout approach, grid patterns, spacing rules, and responsive breakpoints so every new page follows the same structure.

**Independent Test**: A developer reads Section 3 of `DESIGN_SYSTEM.md` and can build a new page matching existing dashboard layout without writing custom CSS.

### Implementation for User Story 2

- [x] T008 [P] [US2] Write Section 3 "Page Layout & Spacing" in `docs/DESIGN_SYSTEM.md` — document the existing dashboard grid pattern from `src/app/(dashboard)/layout.tsx` (grid-rows, grid-cols, header h-16, sidebar 256px), the "empty box" approach (grid → regions → components), gap-over-padding rule (FR-011), max content widths for full-bleed vs. centered pages (FR-013), and responsive breakpoints at <640px / 640-1023px / >=1024px (FR-012) including sidebar collapse behavior, content reflow, and mobile overlay pattern

**Checkpoint**: User Story 2 complete — layout patterns are documented and reference the existing implementation.

---

## Phase 5: User Story 3 — Smooth and Consistent Interactions (Priority: P2)

**Goal**: Document transition presets, hover/focus interaction patterns, and when NOT to animate, ensuring all UI state changes feel consistent.

**Independent Test**: A developer reads Section 2 of `DESIGN_SYSTEM.md` and knows exactly which Tailwind classes to use for hover states, dropdown opens, and sidebar toggles.

### Implementation for User Story 3

- [x] T009 [P] [US3] Write Section 2 "Transitions & Motion" in `docs/DESIGN_SYSTEM.md` — document the three transition tiers (fast: `transition-colors duration-150 ease-out`, normal: `transition-all duration-200 ease-out`, slow: `transition-transform duration-300 ease-in-out` per R6), map each tier to specific use cases (hover states, dropdowns, sidebar slide), define hover/focus interaction patterns for buttons, inputs, links, and nav items (FR-008), define easing curves for entrances vs exits (FR-007), and list when NOT to animate (checkbox toggles, radio selections, instant data updates per FR-009)

**Checkpoint**: User Story 3 complete — all transition and interaction patterns are documented.

---

## Phase 6: User Story 4 — Centralized API Communication (Priority: P2)

**Goal**: Create the typed API fetch wrapper that all future features use for client-side HTTP calls, with automatic auth, error handling, and 401 redirect.

**Independent Test**: Import `apiClient` from `@/lib/api/client`, call `apiClient.get<T>('/api/some-endpoint')` — verify it returns `{ data, error }` typed shape, includes credentials, and handles 401 redirect.

### Implementation for User Story 4

- [x] T010 [US4] Create `src/lib/api/client.ts` — implement the API fetch wrapper with:
  - Types: `ApiSuccessResponse<T>`, `ApiErrorResponse`, `ApiResponse<T>` discriminated union (from data-model.md)
  - Config: `ApiClientConfig` with `baseUrl` from `NEXT_PUBLIC_API_URL` env var (default empty string), default headers (`Content-Type: application/json`, `Accept: application/json`), `credentials: 'include'` (per R4)
  - Methods: `apiClient.get<T>(path, options?)`, `apiClient.post<T>(path, body?, options?)`, `apiClient.put<T>(path, body?, options?)`, `apiClient.delete<T>(path, options?)`
  - Behaviors: auto-prepend base URL, 401 → `window.location.href = '/sign-in'`, network error → `{ data: null, error: { code: 'NETWORK_ERROR', message: 'Network request failed' } }`, non-401 HTTP errors → parse JSON error body or return generic error shape
  - Support `options.headers` override for multipart requests (omit Content-Type)
  - Named export `apiClient` object, no default export, no barrel files
- [x] T011 [US4] Write Section 4 "API Call Patterns" in `docs/DESIGN_SYSTEM.md` — document the fetch wrapper usage (import path, method signatures), response shapes with TypeScript examples, error handling flow (401 redirect, network errors, validation errors), when to use each HTTP method, how to handle multipart/file uploads, and the rule that no raw `fetch()` calls are permitted (FR-018)

**Checkpoint**: User Story 4 complete — API wrapper exists, compiles cleanly, and is documented.

---

## Phase 7: User Story 5 — Clear Navigation Patterns (Priority: P3)

**Goal**: Document navigation patterns (active states, mobile sidebar, tab/pill patterns) so all future pages maintain consistent navigation UX.

**Independent Test**: A developer reads Section 5 of `DESIGN_SYSTEM.md` and can implement sidebar active states, mobile nav toggle, or in-page tabs following the documented patterns.

### Implementation for User Story 5

- [x] T012 [P] [US5] Write Section 5 "Navigation Patterns" in `docs/DESIGN_SYSTEM.md` — document sidebar active state styling (which tokens: `bg-accent text-accent-foreground` for active, `text-muted-foreground` for inactive per FR-019), mobile navigation behavior (hamburger → sidebar slide-in from left, `fixed inset-0 z-30 bg-black/40` overlay, `transition-transform duration-200` per FR-020), and tab/pill navigation pattern for in-page section switching (active tab styling, inactive tab styling, recommended implementation per FR-021)

**Checkpoint**: User Story 5 complete — navigation patterns are documented.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Build verification, visual verification, codebase hygiene checks, and final documentation assembly.

- [x] T013 [US1] Assemble `docs/DESIGN_SYSTEM.md` — ensure all 5 sections are present with a cohesive introduction, table of contents, and consistent formatting. Add a "Quick Reference" cheat sheet section at the top with the most commonly needed tokens and classes (FR-022)
- [x] T014 Run `tsc --noEmit` to verify TypeScript compilation passes with zero errors — specifically validates `src/lib/api/client.ts` types
- [x] T015 [P] Run `npm run lint` to verify zero ESLint warnings or errors across the codebase
- [x] T016 [P] Search codebase for raw `fetch()` calls in `src/components/` and `src/hooks/` directories — verify none exist (SC-004). Exclude `src/lib/api/client.ts` from the search since it is the wrapper itself
- [ ] T017 Start dev server (`npm run dev`) and visually verify: primary buttons show violet color, sidebar active states use violet-tinted accent, focus rings are violet, hover transitions use consistent timing (SC-002, SC-006)

**Checkpoint**: All verification items from quickstart.md are satisfied. Feature is complete.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Skipped — already complete from F001
- **Phase 2 (Foundational)**: No dependencies — start immediately. BLOCKS all user stories
- **Phase 3 (US1 - Visual Identity)**: Depends on Phase 2 completion (needs violet tokens in globals.css)
- **Phase 4 (US2 - Layout)**: Depends on Phase 2 completion. Can run in PARALLEL with Phase 3
- **Phase 5 (US3 - Transitions)**: Depends on Phase 2 completion. Can run in PARALLEL with Phase 3/4
- **Phase 6 (US4 - API Client)**: Depends on Phase 2 completion. Can run in PARALLEL with Phase 3/4/5 (independent TypeScript module)
- **Phase 7 (US5 - Navigation)**: Depends on Phase 2 completion. Can run in PARALLEL with other stories
- **Phase 8 (Polish)**: Depends on ALL user story phases being complete

### User Story Dependencies

- **US1 (Visual Identity)**: Depends only on Phase 2 tokens. No dependencies on other stories.
- **US2 (Layout)**: No dependencies on other stories. Documents existing layout.
- **US3 (Transitions)**: No dependencies on other stories. Pure documentation.
- **US4 (API Client)**: No dependencies on other stories. Independent TypeScript module + docs.
- **US5 (Navigation)**: No dependencies on other stories. Documents existing patterns.

### Parallel Opportunities

After Phase 2 completes, ALL user story phases (3-7) can run in parallel since they touch different files:
- Phase 3 (US1): `sidebar-nav-item.tsx` review + `DESIGN_SYSTEM.md` Section 1
- Phase 4 (US2): `DESIGN_SYSTEM.md` Section 3
- Phase 5 (US3): `DESIGN_SYSTEM.md` Section 2
- Phase 6 (US4): `src/lib/api/client.ts` + `DESIGN_SYSTEM.md` Section 4
- Phase 7 (US5): `DESIGN_SYSTEM.md` Section 5

Note: Sections 1-5 of `DESIGN_SYSTEM.md` can be written in parallel as they are independent sections, then assembled in T013.

---

## Implementation Strategy

### Recommended: Sequential Single-Developer

1. Complete Phase 2: Update `globals.css` tokens (T001-T005)
2. Complete Phase 6: Create API client (T010-T011) — this is the only new code file
3. Complete Phases 3-5, 7: Documentation tasks (T006-T009, T012) — write all DESIGN_SYSTEM.md sections
4. Complete Phase 8: Assemble docs, verify build, verify visuals (T013-T017)

### Rationale

Phase 2 and Phase 6 produce actual code changes; everything else is documentation. Prioritizing code changes first allows build verification to catch issues early.

---

## Notes

- No tests are included — specification did not request automated tests for this feature
- The API client (`src/lib/api/client.ts`) is the only new TypeScript file created
- `globals.css` modifications update existing tokens in place — no new `@theme inline` entries needed (R5)
- `sidebar-nav-item.tsx` uses `bg-accent text-accent-foreground` which auto-updates with new token values — likely no code changes
- `docs/DESIGN_SYSTEM.md` is the primary deliverable — it captures decisions from research.md in developer-friendly format
- Total new/modified files: `globals.css` (modify), `client.ts` (create), `DESIGN_SYSTEM.md` (create)
