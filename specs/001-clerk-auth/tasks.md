# Tasks: Authentication (Clerk)

**Input**: Design documents from `/specs/001-clerk-auth/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in feature specification. No test tasks included.

**Organization**: Tasks are grouped by user story. US1/US2/US3 (all P1) share foundational auth infrastructure and are sequenced so each builds on the prior. US4/US5 (P2) handle the dashboard shell. US6 (P3) is fully independent.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Install dependencies and configure CSS layer compatibility

- [x] T001 Install `@clerk/nextjs` and `svix` packages via `npm install @clerk/nextjs svix`
- [x] T002 Add Clerk CSS layer declaration to `src/app/globals.css` — add `@layer clerk;` after existing imports for Tailwind v4 compatibility (see research.md R4)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core Clerk infrastructure that ALL user stories depend on — ClerkProvider and route protection middleware

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Wrap root layout with ClerkProvider in `src/app/layout.tsx` — import `ClerkProvider` from `@clerk/nextjs`, wrap `{children}` inside `<ClerkProvider appearance={{ cssLayerName: 'clerk' }}>`, keep existing `<html>` and `<body>` structure intact, preserve Inter font and metadata
- [x] T004 Create Clerk route protection middleware in `src/middleware.ts` — import `clerkMiddleware` and `createRouteMatcher` from `@clerk/nextjs/server`, define public routes (`/`, `/sign-in(.*)`, `/sign-up(.*)`, `/api/auth/webhook`), call `auth.protect()` for non-public routes, export Next.js middleware `config.matcher` that skips static files and `_next` internals (see research.md R2 for pattern)
- [x] T005 Create auth helper utility in `src/lib/auth/middleware.ts` — export `getAuthUser()` async function that calls Clerk's `auth()` from `@clerk/nextjs/server`, returns `{ userId }` if authenticated, throws `AppError(ERROR_CODES.AUTH_UNAUTHORIZED)` if no userId present. Import `AppError` from `@/lib/errors/app-error` and `ERROR_CODES` from `@/lib/errors/codes`

**Checkpoint**: ClerkProvider wraps the app, middleware protects routes, auth helper is ready. `npm run build` should pass.

---

## Phase 3: User Story 1 — Sign Up with Google (Priority: P1)

**Goal**: New visitors can create an account via Google OAuth and land on the dashboard

**Independent Test**: Navigate to `/sign-up`, click "Continue with Google", complete OAuth consent, verify redirect to `/dashboard` with session active

### Implementation for User Story 1

- [x] T006 [US1] Create auth layout in `src/app/(auth)/layout.tsx` — minimal centered layout with `min-h-screen flex items-center justify-center bg-background` wrapper. Accept `{ children }` prop. This layout applies to both sign-in and sign-up pages
- [x] T007 [US1] Create sign-up page in `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` — import `SignUp` from `@clerk/nextjs`, render `<SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />`. The `redirectUrl` to `/dashboard` is handled by the `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` env var or Clerk's default behavior
- [x] T008 [US1] Create placeholder dashboard page in `src/app/(dashboard)/dashboard/page.tsx` — simple page component that renders an `<h1>` with "Welcome to ReelZero" text. This is the redirect target after sign-up. Add a `<p>` with "You are signed in." as confirmation text

**Checkpoint**: User Story 1 functional — sign up via Google lands on `/dashboard` placeholder page

---

## Phase 4: User Story 2 — Sign In to Existing Account (Priority: P1)

**Goal**: Returning users can sign in via Google OAuth and access their dashboard

**Independent Test**: Navigate to `/sign-in`, authenticate with previously registered Google account, verify redirect to `/dashboard`

### Implementation for User Story 2

- [x] T009 [US2] Create sign-in page in `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` — import `SignIn` from `@clerk/nextjs`, render `<SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />`. Clerk handles session restoration and account deduplication automatically

**Checkpoint**: User Story 2 functional — both sign-in and sign-up flows work. Existing accounts sign in without duplicates.

---

## Phase 5: User Story 3 — Access Protected Routes (Priority: P1)

**Goal**: Unauthenticated users are redirected to sign-in when accessing protected pages. After auth, they return to the originally requested page.

**Independent Test**: While logged out, navigate to `/billing` — should redirect to `/sign-in`. After signing in, should land on `/billing` (not `/dashboard`).

### Implementation for User Story 3

- [x] T010 [P] [US3] Create placeholder billing page in `src/app/(dashboard)/billing/page.tsx` — simple page component with `<h1>Billing</h1>` heading. Needed to test redirect-back behavior for a non-dashboard protected route
- [x] T011 [P] [US3] Create placeholder create page in `src/app/(dashboard)/create/page.tsx` — simple page component with `<h1>Create Video</h1>` heading. Needed as a navigation target for the sidebar

**Checkpoint**: User Story 3 functional — middleware from T004 already handles redirects. Placeholder pages confirm that protected routes redirect unauthenticated users and preserve the original URL through the auth flow.

---

## Phase 6: User Story 4 — Dashboard Shell Navigation (Priority: P2)

**Goal**: Authenticated users see a consistent dashboard layout with header (profile + hamburger) and sidebar (4 navigation links). Mobile viewport hides sidebar and shows hamburger toggle.

**Independent Test**: Sign in, verify header shows user avatar/name, sidebar has 4 nav links, clicking links navigates correctly. Resize to mobile (<1024px) — sidebar hidden, hamburger visible, toggle works.

### Implementation for User Story 4

- [x] T012 [P] [US4] Create sidebar nav item component in `src/components/layout/sidebar-nav-item.tsx` — accepts `{ href, icon, label }` props (matching NavigationItem type from data-model.md). Uses `next/link` and `usePathname()` from `next/navigation` to detect active state. Active state uses `bg-accent text-accent-foreground` tokens. Renders icon (LucideIcon) + label text. Named export `SidebarNavItem`
- [x] T013 [P] [US4] Create dashboard sidebar component in `src/components/layout/dashboard-sidebar.tsx` — imports `SidebarNavItem` from `@/components/layout/sidebar-nav-item`. Defines navigation items array: Dashboard (`/dashboard`, `LayoutDashboard`), Create Video (`/create`, `PlusCircle`), My Videos (`/videos`, `Video`), Billing (`/billing`, `CreditCard`) — all icons from `lucide-react`. Renders `<nav>` with the 4 nav items. Accepts `className` prop for positioning. Named export `DashboardSidebar`
- [x] T014 [P] [US4] Create dashboard header component in `src/components/layout/dashboard-header.tsx` — fixed-height header bar (`h-16`). Left side: hamburger menu button (visible only below `lg` breakpoint, uses `Menu` icon from `lucide-react`, calls `toggleSidebar` from `useUIStore`). Center/left: app name "ReelZero" or logo placeholder. Right side: `UserButton` from `@clerk/nextjs` (handles profile display + sign-out). Use `flex items-center justify-between` layout. Named export `DashboardHeader`
- [x] T015 [US4] Create dashboard layout in `src/app/(dashboard)/layout.tsx` — imports `DashboardHeader` and `DashboardSidebar`. Uses CSS Grid for page structure: `grid grid-cols-[256px_1fr]` on desktop (`lg:`), single column on mobile. Sidebar: fixed width 256px on desktop, absolutely positioned overlay on mobile when open (controlled by `isSidebarOpen` from `useUIStore`). Transition: `transition-transform duration-200` for sidebar slide. Header: spans full width at top. Main content: `<main>` with `overflow-y-auto` and padding. Add `"use client"` directive since it uses Zustand store. Mobile overlay: semi-transparent backdrop when sidebar is open, clicking backdrop closes sidebar

**Checkpoint**: User Story 4 functional — dashboard shell renders with header and sidebar on desktop. Mobile shows hamburger, toggles sidebar. Nav links navigate to correct pages.

---

## Phase 7: User Story 5 — Sign Out (Priority: P2)

**Goal**: Authenticated users can sign out via the UserButton in the header. Session terminates and user is redirected to `/sign-in`.

**Independent Test**: Sign in, click UserButton > "Sign out", verify redirect to `/sign-in` and that accessing `/dashboard` now redirects to sign-in.

### Implementation for User Story 5

- [x] T016 [US5] Configure sign-out redirect in `src/app/layout.tsx` — add `afterSignOutUrl="/sign-in"` prop to the `<ClerkProvider>` component. This ensures Clerk redirects to `/sign-in` after sign-out instead of the default `/`. No new files needed — this is a one-line addition to the existing ClerkProvider

**Checkpoint**: User Story 5 functional — sign-out via UserButton terminates session and redirects to `/sign-in`. The UserButton component from T014 already provides the sign-out UI.

---

## Phase 8: User Story 6 — Webhook User Sync Placeholder (Priority: P3)

**Goal**: A webhook endpoint exists at `/api/auth/webhook` that verifies Svix signatures and acknowledges Clerk user lifecycle events. No database writes — placeholder for F004.

**Independent Test**: Send a test webhook from Clerk Dashboard > Webhooks, verify server logs the event. Send a request with invalid/missing svix headers, verify 400 response.

### Implementation for User Story 6

- [x] T017 [US6] Create webhook route handler in `src/app/api/auth/webhook/route.ts` — export async `POST` function wrapped with `withErrorHandler` from `@/lib/errors/middleware`. Implementation: (1) read raw body via `request.text()`, (2) extract `svix-id`, `svix-timestamp`, `svix-signature` from request headers, (3) verify using `new Webhook(CLERK_WEBHOOK_SECRET).verify(body, headers)` from `svix` — if verification fails, throw `AppError(ERROR_CODES.VALIDATION_FAILED)`, (4) parse event type from verified payload (`user.created`, `user.updated`, `user.deleted`), (5) `console.log` the event type and user ID, (6) return `NextResponse.json({ data: { success: true } })`. Get `CLERK_WEBHOOK_SECRET` from `process.env` — if undefined, throw `AppError(ERROR_CODES.INTERNAL_ERROR)`. See contracts/webhook-api.md for full request/response format

**Checkpoint**: User Story 6 functional — webhook endpoint accepts valid Clerk events and rejects invalid signatures. Ready for F004 to add database writes inside the handler.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, already-authenticated redirect, and build verification

- [x] T018 Handle already-authenticated redirect — in `src/middleware.ts`, extend the middleware callback to check if user is authenticated AND accessing `/sign-in` or `/sign-up`, and redirect them to `/dashboard`. Use `auth().userId` to check auth status, `NextResponse.redirect()` for the redirect. This addresses FR-012 and the edge case from spec.md
- [x] T019 Verify build passes — run `npm run build` to confirm no TypeScript errors, no missing imports, and all pages render correctly. Fix any issues found
- [x] T020 Verify all acceptance scenarios from quickstart.md — manually test all 10 verification items listed in `specs/001-clerk-auth/quickstart.md` (sign-up, sign-in, route protection, post-auth redirect, dashboard shell, mobile sidebar, sign-out, already-authed redirect, webhook valid, webhook invalid). Document any failures and fix

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 Sign Up (Phase 3)**: Depends on Phase 2 — creates auth layout + sign-up page
- **US2 Sign In (Phase 4)**: Depends on Phase 3 (shares auth layout from T006)
- **US3 Protected Routes (Phase 5)**: Depends on Phase 2 (middleware handles protection). Placeholder pages can be created in parallel
- **US4 Dashboard Shell (Phase 6)**: Depends on Phase 2. Can run in parallel with US1/US2/US3
- **US5 Sign Out (Phase 7)**: Depends on Phase 6 (needs UserButton in header from T014)
- **US6 Webhook (Phase 8)**: Depends on Phase 1 only (svix installed). Fully independent of other stories
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1 (Setup)
  │
  ├── Phase 2 (Foundational: ClerkProvider + Middleware)
  │     │
  │     ├── Phase 3 (US1: Sign Up)
  │     │     └── Phase 4 (US2: Sign In) — shares auth layout
  │     │
  │     ├── Phase 5 (US3: Protected Routes) — parallel with US1/US2
  │     │
  │     ├── Phase 6 (US4: Dashboard Shell) — parallel with US1/US2/US3
  │     │     └── Phase 7 (US5: Sign Out) — needs header from US4
  │     │
  │     └── Phase 8 (US6: Webhook) — fully independent
  │
  └── Phase 9 (Polish) — after all stories complete
```

### Within Each User Story

- Layout/shared components before page components
- Core UI before integration details
- Each story checkpoint validates independent functionality

### Parallel Opportunities

- T010 + T011 (US3 placeholder pages) can run in parallel
- T012 + T013 + T014 (US4 sidebar-nav-item, sidebar, header) can run in parallel
- US3 (Phase 5) can run in parallel with US4 (Phase 6)
- US6 (Phase 8) can run in parallel with everything after Phase 1

---

## Parallel Example: User Story 4 (Dashboard Shell)

```bash
# Launch all layout components in parallel (different files, no dependencies):
Task: "Create sidebar nav item component in src/components/layout/sidebar-nav-item.tsx"
Task: "Create dashboard sidebar component in src/components/layout/dashboard-sidebar.tsx"
Task: "Create dashboard header component in src/components/layout/dashboard-header.tsx"

# Then sequentially (depends on all three components):
Task: "Create dashboard layout in src/app/(dashboard)/layout.tsx"
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3 — Core Auth)

1. Complete Phase 1: Setup (install deps)
2. Complete Phase 2: Foundational (ClerkProvider + middleware)
3. Complete Phase 3: US1 Sign Up
4. Complete Phase 4: US2 Sign In
5. Complete Phase 5: US3 Protected Routes
6. **STOP and VALIDATE**: Test auth flow end-to-end — sign up, sign in, route protection, redirect-back
7. Deploy/demo if ready — app has working auth even without dashboard shell

### Full Feature Delivery

1. MVP (above) + Phase 6 (US4 Dashboard Shell) + Phase 7 (US5 Sign Out)
2. Add Phase 8 (US6 Webhook) — can happen in parallel with US4/US5
3. Complete Phase 9 (Polish) — edge cases, build verification, manual QA
4. All acceptance scenarios pass

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in same phase
- [Story] label maps task to specific user story for traceability
- No test tasks included (not requested in spec). Add test phases if TDD is desired
- US1 and US2 are almost identical in implementation (one renders `<SignUp>`, the other `<SignIn>`) but kept as separate phases for story traceability
- The `useUIStore` Zustand store from F001 already provides `isSidebarOpen` and `toggleSidebar()` — no new store needed
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
