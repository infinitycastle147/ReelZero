# Research: Project Foundation & Scaffolding

**Feature**: 001-foundation
**Date**: 2026-02-07
**Status**: Complete (no NEEDS CLARIFICATION items)

## Research Summary

No unknowns required resolution. All technology choices are prescribed by the PRD v2.0 and ARCHITECTURE.md v1.1. Research below documents best practices for each technology decision relevant to F001.

---

## 1. Next.js 14+ with App Router

**Decision**: Next.js 14+ with App Router, TypeScript strict mode
**Rationale**: Prescribed by PRD Section 4.1. App Router provides server components, streaming, and file-system routing. Deployed on Vercel free tier.
**Alternatives considered**:
- Pages Router: Legacy, lacks server components and streaming.
- Remix: Viable but less Vercel integration and smaller ecosystem for this stack.

**Best practices for foundation**:
- Use `src/` directory to keep root clean.
- Configure `@/` path alias in `tsconfig.json` pointing to `src/`.
- Enable TypeScript strict mode (`"strict": true`) from day one.
- Set `engines` field in `package.json` to enforce Node.js 20+.
- Use `app/layout.tsx` as the root layout with HTML lang attribute and font loading.

---

## 2. Tailwind CSS + shadcn/ui

**Decision**: Tailwind CSS 3.x with shadcn/ui (Radix primitives)
**Rationale**: Prescribed by PRD. Utility-first CSS with pre-built accessible components. shadcn/ui copies components into the project (not a dependency), enabling full customization.
**Alternatives considered**:
- MUI: Heavier, opinionated styling, not utility-first.
- Chakra UI: Good but less tree-shakeable than Tailwind + Radix approach.

**Best practices for foundation**:
- Initialize shadcn/ui with `npx shadcn@latest init` which sets up `components.json`, `tailwind.config.ts`, CSS variables, and `cn()` utility.
- Install base components needed early: `button`, `card`, `input`, `label`, `toast`, `toaster`, `select`, `textarea`.
- Use CSS variables for theming (dark mode support from the start via shadcn/ui default config).
- Keep `globals.css` minimal: Tailwind directives + CSS custom properties only.

---

## 3. ESLint Configuration

**Decision**: ESLint 8.x with Next.js recommended rules, no Prettier (Tailwind handles formatting concerns)
**Rationale**: Constitution Principle VII mandates consistent naming. ESLint catches code quality issues. Zero warnings/zero errors policy per constitution.
**Alternatives considered**:
- Biome: Faster but less Next.js ecosystem integration.
- Prettier + ESLint: Adds complexity. Tailwind class sorting via `eslint-plugin-tailwindcss` is sufficient.

**Best practices for foundation**:
- Extend `next/core-web-vitals` and `next/typescript`.
- Add rule: `no-restricted-imports` to warn on barrel file patterns.
- Add rule: `@typescript-eslint/no-explicit-any` set to `error`.
- Configure import ordering via `eslint-plugin-import` or `@typescript-eslint/consistent-type-imports`.

---

## 4. Error Handling System

**Decision**: Custom `AppError` class + `ERROR_CODES` constant object + error middleware wrapper
**Rationale**: Constitution Principle II mandates `AppError` with `ERROR_CODES` as the sole error pattern. Standardized response format: `{ error: { code, message, details? } }`.
**Alternatives considered**:
- `http-errors` package: Generic, doesn't support custom code taxonomy.
- Next.js built-in error handling: Insufficient for API route error standardization.

**Best practices for foundation**:
- `AppError` extends `Error` with `code`, `statusCode`, `message`, `details` properties.
- `ERROR_CODES` is a frozen constant object organized by category (AUTH, VALIDATION, CREDIT, GENERATION, RENDER, STORAGE, EXTERNAL, RESOURCE, INTERNAL).
- Each error code maps to `{ statusCode, message }` in a separate messages file.
- Middleware wraps API route handlers: catches `AppError` and formats response; catches unknown errors as `INTERNAL_ERROR`.
- `toJSON()` method on `AppError` returns the standardized shape.

---

## 5. Zustand State Management

**Decision**: Zustand 4.x for client-side state management
**Rationale**: Prescribed by PRD. Lightweight, TypeScript-friendly, no boilerplate. Three stores: video creation, user/subscription, UI state.
**Alternatives considered**:
- Redux Toolkit: More boilerplate, overkill for MVP scope.
- Jotai: Atomic model less suited for the store shapes defined in spec.

**Best practices for foundation**:
- Create typed store skeletons with initial state and action stubs.
- Use `create<T>()` with explicit type parameter for full type safety.
- Keep stores in `src/store/` with kebab-case file names.
- Video store: wizard step, scenes, selected voice, theme, caption style.
- User store: user info, subscription tier, credit balance.
- UI store: active modals, notifications, sidebar state.

---

## 6. TypeScript Type Definitions

**Decision**: Shared types in `src/types/` with four files: video.ts, scene.ts, api.ts, database.ts
**Rationale**: Constitution Principle II requires strict types everywhere. Spec FR-009 mandates shared type definitions.
**Alternatives considered**:
- Zod schemas as source of truth: Good for runtime validation but adds dependency not needed in foundation. Can be layered in F003+.
- Single types file: Violates separation of concerns and grows unwieldy.

**Best practices for foundation**:
- Use `type` for data shapes, `interface` for contracts that may be extended.
- Export named types only (no default exports per constitution).
- Video types: `VideoStatus` union type, `Video` entity, `VideoMetadata`.
- Scene types: `Scene`, `SceneImage`, `CaptionStyle` union.
- API types: `ApiResponse<T>`, `ApiError`, `PaginatedResponse<T>`.
- Database types: `DbUser`, `DbVideo`, `DbSubscription`, `DbGenerationLog`.

---

## 7. Constants Architecture

**Decision**: Constants in `src/lib/constants/` with three files: video.ts, pricing.ts, voices.ts
**Rationale**: Constitution Principle II forbids magic numbers/strings. Spec FR-008 defines the exact constants needed.
**Alternatives considered**:
- Single constants file: Would grow too large across features.
- Environment variables for constants: These are fixed specs, not deployment config.

**Best practices for foundation**:
- Use `as const` assertions for literal types.
- Video constants: `VIDEO_RESOLUTION`, `VIDEO_FRAME_RATE`, `VIDEO_DURATION_RANGE`, `MAX_SCENES`, `VIDEO_CODEC`, `VIDEO_ASPECT_RATIO`.
- Pricing constants: `PRICING_TIERS` array with `name`, `monthlyPrice`, `annualPrice`, `credits`, `features` per tier.
- Voice constants: `VOICE_OPTIONS` array with `id`, `name`, `previewUrl`, `description`.

---

## 8. Package Scripts

**Decision**: Five npm scripts: `dev`, `build`, `lint`, `type-check`, `pre-commit`
**Rationale**: Spec FR-004 and FR-005 require independent quality checks and a combined pre-commit command. Constitution mandates all three checks pass before every commit.
**Alternatives considered**:
- Husky + lint-staged: Good for automated hooks but adds complexity. Can be added later.
- Turbo: Overkill for single-project monorepo.

**Best practices for foundation**:
- `dev`: `next dev`
- `build`: `next build`
- `lint`: `next lint`
- `type-check`: `tsc --noEmit`
- `pre-commit`: `npm run lint && npm run type-check && npm run build`
- Sequential execution in pre-commit to fail fast on first error.
