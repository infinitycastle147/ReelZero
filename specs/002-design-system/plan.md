# Implementation Plan: Design System & Frontend Standards

**Branch**: `002-design-system` | **Date**: 2026-02-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-design-system/spec.md`

## Summary

Establish ReelZero's visual identity and frontend standards by: (1) extending the existing shadcn/ui neutral oklch tokens with a violet/purple brand palette, (2) defining shadow, radius, and transition standards, (3) creating a centralized API fetch wrapper with typed responses and automatic auth, (4) documenting layout patterns ("empty box" grid approach), and (5) producing a comprehensive `docs/DESIGN_SYSTEM.md` reference. The feature modifies `globals.css` for new tokens, creates `src/lib/api/client.ts` for the fetch wrapper, and documents all decisions. Existing F001 dashboard layout components from `001-clerk-auth` already follow grid patterns and serve as the reference implementation.

## Technical Context

**Language/Version**: TypeScript 5+ (strict mode), Next.js 16+ (App Router)
**Primary Dependencies**: Tailwind CSS v4, shadcn/ui (new-york style, neutral base), oklch color system
**Storage**: N/A (no database in this feature)
**Testing**: Manual visual testing + TypeScript compilation check; API wrapper tested via build verification
**Target Platform**: Web (Vercel deployment), responsive down to 375px
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: All transitions complete in <300ms; API wrapper adds negligible overhead to requests
**Constraints**: Must extend existing oklch tokens (not replace); must use Tailwind CSS v4 `@theme` syntax; no external HTTP libraries
**Scale/Scope**: ~3 new/modified files, 1 new documentation file, updates to existing layout components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AI Provider Abstraction | N/A | No AI services in this feature |
| II. Strict Type Safety | PASS | API wrapper uses typed generics `ApiResponse<T>`, no `any`; error responses follow `{ error: { code, message } }` pattern |
| III. Direct Imports Only | PASS | No barrel files; direct imports from `@/lib/api/client` |
| IV. Database Abstraction | N/A | No database access in this feature |
| V. Microservice Boundary | N/A | Single service; no renderer interaction |
| VI. Credit-Gated Operations | N/A | No credit operations in design system feature |
| VII. Consistent Naming & Structure | PASS | All files kebab-case; named exports only; API client in `src/lib/api/` following existing `src/lib/` pattern |

**Gate Result**: PASS — No violations. No complexity justifications needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-design-system/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── globals.css                    # MODIFY: extend oklch tokens with violet/purple palette, add gradient tokens
├── lib/
│   └── api/
│       └── client.ts                  # CREATE: centralized fetch wrapper with typed responses
├── components/
│   └── layout/
│       ├── sidebar-nav-item.tsx       # MODIFY: update active state tokens to use new violet accent
│       ├── dashboard-sidebar.tsx      # EXISTS: no changes needed
│       └── dashboard-header.tsx       # EXISTS: no changes needed

docs/
└── DESIGN_SYSTEM.md                   # CREATE: comprehensive reference document
```

**Structure Decision**: Next.js App Router with existing project layout. New code lives in `src/lib/api/` for the fetch wrapper. Design tokens are defined in `src/app/globals.css` within the existing `@theme` and `:root` / `.dark` blocks. Documentation goes in `docs/DESIGN_SYSTEM.md`.

## Complexity Tracking

No violations to justify. All implementations follow existing patterns.
