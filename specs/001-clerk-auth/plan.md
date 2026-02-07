# Implementation Plan: Authentication (Clerk)

**Branch**: `001-clerk-auth` | **Date**: 2026-02-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-clerk-auth/spec.md`

## Summary

Implement Clerk-based authentication with Google OAuth, protected dashboard routes, a responsive dashboard shell (header + collapsible sidebar), sign-out flow, and a webhook endpoint placeholder for future user sync. The feature uses `@clerk/nextjs` which provides middleware-based route protection, pre-built UI components (`SignIn`, `SignUp`, `UserButton`), and server-side auth helpers. The existing Next.js App Router scaffolding from F001 already has route groups `(auth)/` and `(dashboard)/` in place.

## Technical Context

**Language/Version**: TypeScript 5+ (strict mode), Next.js 16+ (App Router)
**Primary Dependencies**: `@clerk/nextjs` (auth SDK), `svix` (webhook verification), `lucide-react` (icons), `shadcn/ui` (UI components)
**Storage**: N/A for this feature (webhook placeholder only; no database writes until F004)
**Testing**: Manual testing against Clerk dev instance; webhook signature verification testable via curl
**Target Platform**: Web (Vercel deployment), responsive down to 320px
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Sign-up flow completes in <30s (excluding Google consent); route protection via middleware adds negligible latency
**Constraints**: Clerk free tier (10,000 monthly active users); Google OAuth only for MVP
**Scale/Scope**: Single user role, ~6 new files, ~4 modified files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AI Provider Abstraction | N/A | No AI services in this feature |
| II. Strict Type Safety | PASS | All components use TypeScript strict; API responses follow `{ data }` / `{ error: { code, message } }` pattern; webhook uses `AppError` with `ERROR_CODES` |
| III. Direct Imports Only | PASS | No barrel files; direct imports from `@clerk/nextjs`, `@/components/ui/button`, etc. |
| IV. Database Abstraction | N/A | No database access in this feature (webhook is placeholder only) |
| V. Microservice Boundary | N/A | Single service; no renderer interaction |
| VI. Credit-Gated Operations | N/A | No credit operations in auth feature |
| VII. Consistent Naming & Structure | PASS | All files kebab-case; components named exports; hooks use `use` prefix |

**Gate Result**: PASS - No violations. No complexity justifications needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-clerk-auth/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── webhook-api.md   # Webhook endpoint contract
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx                              # MODIFY: wrap with ClerkProvider
│   ├── (auth)/
│   │   ├── layout.tsx                          # CREATE: centered auth layout
│   │   ├── sign-in/[[...sign-in]]/page.tsx     # CREATE: Clerk SignIn component
│   │   └── sign-up/[[...sign-up]]/page.tsx     # CREATE: Clerk SignUp component
│   ├── (dashboard)/
│   │   ├── layout.tsx                          # CREATE: dashboard shell (header + sidebar)
│   │   ├── dashboard/page.tsx                  # CREATE: placeholder dashboard page
│   │   ├── create/page.tsx                     # CREATE: placeholder page
│   │   ├── billing/page.tsx                    # CREATE: placeholder page
│   │   └── videos/[id]/page.tsx                # EXISTS: placeholder page
│   └── api/
│       └── auth/
│           └── webhook/route.ts                # CREATE: Clerk webhook handler
├── components/
│   └── layout/
│       ├── dashboard-header.tsx                # CREATE: header with UserButton + hamburger
│       ├── dashboard-sidebar.tsx               # CREATE: sidebar navigation
│       └── sidebar-nav-item.tsx                # CREATE: nav link with active state
├── lib/
│   └── auth/
│       └── middleware.ts                       # CREATE: auth helper utilities
├── hooks/
│   └── use-sidebar.ts                          # CREATE: sidebar toggle hook (or use ui-store)
└── middleware.ts                                # CREATE: Clerk route protection middleware
```

**Structure Decision**: Next.js App Router with route groups. Auth pages under `(auth)/` layout, protected pages under `(dashboard)/` layout. Clerk middleware at root level for route protection. Dashboard layout components in `src/components/layout/`.

## Complexity Tracking

No violations to justify. All implementations follow existing patterns.
