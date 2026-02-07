# Implementation Plan: Project Foundation & Scaffolding

**Branch**: `001-foundation` | **Date**: 2026-02-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-foundation/spec.md`

## Summary

Scaffold the ReelZero project from scratch: initialize a Next.js 14+ application with App Router and TypeScript strict mode, configure Tailwind CSS with shadcn/ui, establish the full directory structure per ARCHITECTURE.md, set up ESLint and path aliases, create npm scripts for development workflow and quality gates, build the error handling foundation (AppError, ERROR_CODES, error middleware), define shared constants (video specs, pricing tiers, voice options), create base TypeScript type definitions (video, scene, API, database), set up Zustand store skeletons, and provide an `.env.example` template.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 20+
**Primary Dependencies**: Next.js 14+ (App Router), React 18+, Tailwind CSS 3.x, shadcn/ui (Radix primitives), Zustand 4.x, ESLint 8.x
**Storage**: N/A for this feature (Supabase PostgreSQL configured in F003)
**Testing**: Deferred (no test framework installed in F001; Vitest recommended for future features with collocated `.test.ts` files)
**Target Platform**: Web (Vercel serverless deployment), Node.js 20+ runtime
**Project Type**: Web application (Next.js full-stack with App Router)
**Performance Goals**: Dev server starts in <10s, production build completes in <30s, pre-commit checks complete in <30s
**Constraints**: No `any` types, no barrel files, no default exports, strict ESLint with zero warnings/errors, Node.js 20+ enforced via `engines` field
**Scale/Scope**: Single developer MVP, ~50 initial files, foundation for 9 features

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AI Provider Abstraction | N/A | No AI calls in foundation. Directory stubs created at `src/lib/ai/` and `src/lib/prompts/` for future features. |
| II. Strict Type Safety | PASS | TypeScript strict mode enabled. No `any` types. All constants in `src/lib/constants/`. Error responses follow `{ error: { code, message, details? } }` format. `AppError` with `ERROR_CODES` is the sole error pattern. |
| III. Direct Imports Only | PASS | No barrel files created. All imports use `@/` path alias directly to source files. Named exports only, one primary export per file. |
| IV. Database Abstraction | N/A | No database access in foundation. Directory stubs created at `src/lib/db/queries/` for future features. |
| V. Microservice Boundary | PASS | Foundation is for the Main App (Vercel) only. Video specs defined as fixed constants (1080x1920, 30fps, H.264, max 5 scenes, 50-60s). No configurability. |
| VI. Credit-Gated Operations | N/A | No credit operations in foundation. Store skeleton created at `src/store/user-store.ts` for future use. |
| VII. Consistent Naming & Structure | PASS | All files use kebab-case. Constants use SCREAMING_SNAKE_CASE. Booleans use is/has/can prefix. Named exports only. Commit convention `type(scope): description`. |

**Gate Result**: PASS - All applicable principles satisfied. N/A principles have directory stubs prepared.

## Project Structure

### Documentation (this feature)

```text
specs/001-foundation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx                    # Root layout (HTML shell, font loading)
│   ├── page.tsx                      # Placeholder landing page
│   ├── globals.css                   # Tailwind directives + CSS variables
│   ├── (auth)/                       # Auth route group (stub dirs)
│   │   ├── sign-in/[[...sign-in]]/
│   │   └── sign-up/[[...sign-up]]/
│   ├── (dashboard)/                  # Protected route group (stub dirs)
│   │   ├── dashboard/
│   │   ├── create/
│   │   ├── videos/
│   │   │   └── [id]/
│   │   ├── settings/
│   │   └── billing/
│   └── api/                          # API route stubs
│       ├── auth/webhook/
│       ├── video/
│       │   ├── generate/
│       │   ├── images/
│       │   ├── audio/
│       │   ├── render/
│       │   └── [id]/
│       ├── upload/
│       ├── subscription/
│       │   └── webhook/
│       └── user/credits/
├── components/
│   ├── ui/                           # shadcn/ui base components
│   ├── layout/                       # Layout components (stub dir)
│   ├── video/                        # Video components (stub dir)
│   ├── dashboard/                    # Dashboard components (stub dir)
│   └── billing/                      # Billing components (stub dir)
├── lib/
│   ├── ai/                           # AI abstraction (stub dir)
│   ├── db/
│   │   └── queries/                  # Database queries (stub dir)
│   ├── errors/
│   │   ├── app-error.ts              # AppError class
│   │   ├── codes.ts                  # ERROR_CODES constant object
│   │   ├── messages.ts               # Error code → message mapping
│   │   └── middleware.ts             # API route error handler wrapper
│   ├── prompts/                      # Prompt templates (stub dir)
│   ├── services/                     # Business logic (stub dir)
│   │   └── remotion/                 # Remotion services (stub dir)
│   ├── auth/                         # Auth helpers (stub dir)
│   ├── stripe/                       # Stripe integration (stub dir)
│   ├── utils/                        # Utility functions (stub dir)
│   └── constants/
│       ├── video.ts                  # Video spec constants
│       ├── pricing.ts                # Pricing tier constants
│       └── voices.ts                 # Voice option constants
├── store/
│   ├── video-store.ts                # Video creation state skeleton
│   ├── user-store.ts                 # User/subscription state skeleton
│   └── ui-store.ts                   # UI state skeleton (modals, notifications)
├── hooks/                            # Custom hooks (stub dir)
├── types/
│   ├── video.ts                      # Video entity types
│   ├── scene.ts                      # Scene structure types
│   ├── api.ts                        # API request/response types
│   └── database.ts                   # Database record types
└── remotion/                         # Remotion compositions (stub dir)

public/
├── fonts/
└── images/

tests/
├── unit/
├── integration/
└── e2e/
```

**Structure Decision**: Next.js App Router single-project structure following ARCHITECTURE.md Section 2. All source code under `src/` with path alias `@/` mapped to `src/`. This feature creates the full directory tree with stub directories for future features, and implements concrete files only for error handling, constants, types, stores, and project configuration.

## Complexity Tracking

> No constitution violations. All principles either pass or are N/A for this foundation feature.

No entries needed.
