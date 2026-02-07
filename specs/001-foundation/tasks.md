# Tasks: Project Foundation & Scaffolding

**Input**: Design documents from `/specs/001-foundation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Project type**: Next.js web app with `src/` directory
- All source under `src/` with `@/` alias mapped to `src/`

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Initialize Next.js project, install dependencies, and create the base directory tree

- [x] T001 Initialize Next.js 14+ project with App Router, TypeScript, Tailwind CSS, ESLint, `src/` directory, and `@/*` import alias using `npx create-next-app@latest`
- [x] T002 Initialize shadcn/ui with `npx shadcn@latest init` and install base components (button, card, input, label, sonner, select, textarea) in `src/components/ui/`
- [x] T003 Install Zustand dependency via `npm install zustand`
- [x] T004 Add `"engines": { "node": ">=20.0.0" }` to `package.json`
- [x] T005 Create full directory structure with `.gitkeep` files for stub directories per plan.md:
  - `src/app/(auth)/sign-in/[[...sign-in]]/`
  - `src/app/(auth)/sign-up/[[...sign-up]]/`
  - `src/app/(dashboard)/dashboard/`
  - `src/app/(dashboard)/create/`
  - `src/app/(dashboard)/videos/[id]/`
  - `src/app/(dashboard)/settings/`
  - `src/app/(dashboard)/billing/`
  - `src/app/api/auth/webhook/`
  - `src/app/api/video/generate/`
  - `src/app/api/video/images/`
  - `src/app/api/video/audio/`
  - `src/app/api/video/render/`
  - `src/app/api/video/[id]/`
  - `src/app/api/upload/`
  - `src/app/api/subscription/webhook/`
  - `src/app/api/user/credits/`
  - `src/components/layout/`
  - `src/components/video/`
  - `src/components/dashboard/`
  - `src/components/billing/`
  - `src/lib/ai/`
  - `src/lib/db/queries/`
  - `src/lib/prompts/`
  - `src/lib/services/remotion/`
  - `src/lib/auth/`
  - `src/lib/stripe/`
  - `src/lib/utils/`
  - `src/hooks/`
  - `src/remotion/`
  - `public/fonts/`
  - `public/images/`
  - `tests/unit/`
  - `tests/integration/`
  - `tests/e2e/`

**Checkpoint**: Next.js project runs with `npm run dev`, all directories exist, shadcn/ui components installed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the error handling system and shared type definitions that ALL user stories depend on

**CRITICAL**: US2, US3, and US4 cannot begin until this phase is complete. US1 can start after Phase 1 (it only needs a running project, not the error system or types).

- [x] T006 Create `ERROR_CODES` constant object in `src/lib/errors/codes.ts` with all error code categories (AUTH, VALIDATION, CREDIT, GENERATION, RENDER, STORAGE, EXTERNAL, RESOURCE, INTERNAL) per contracts/error-system.md
- [x] T007 Create error code to message/statusCode mapping in `src/lib/errors/messages.ts` per contracts/error-system.md
- [x] T008 Create `AppError` class in `src/lib/errors/app-error.ts` extending `Error` with `code`, `statusCode`, `message`, `details` properties and `toJSON()` method per contracts/error-system.md
- [x] T009 Create `withErrorHandler` middleware wrapper in `src/lib/errors/middleware.ts` that catches `AppError` and unknown errors, returning standardized JSON responses per contracts/error-system.md
- [x] T010 [P] Create video entity types (`Video`, `VideoStatus`, `VideoMetadata`) in `src/types/video.ts` per data-model.md
- [x] T011 [P] Create scene structure types (`Scene`, `CaptionStyle`, `TransitionType`) in `src/types/scene.ts` per data-model.md
- [x] T012 [P] Create API response types (`ApiSuccessResponse<T>`, `ApiErrorResponse`, `ApiResponse<T>`, `PaginatedResponse<T>`) in `src/types/api.ts` per data-model.md
- [x] T013 [P] Create database record types (`DbUser`, `DbVideo`, `DbSubscription`, `DbGenerationLog`) in `src/types/database.ts` per data-model.md

**Checkpoint**: Error system and all shared types compile under TypeScript strict mode. Foundation ready for user story implementation.

---

## Phase 3: User Story 1 - Developer Starts the Application (Priority: P1) MVP

**Goal**: A developer clones the repo, runs `npm install && npm run dev`, and sees a running ReelZero application at `localhost:3000`.

**Independent Test**: Run `npm run dev` and verify the browser shows "ReelZero" at `http://localhost:3000`. Run `npm run build` and verify the production build completes without errors.

### Implementation for User Story 1

- [x] T014 [US1] Update `src/app/page.tsx` to display a placeholder landing page with the project name "ReelZero" and a brief tagline, using Tailwind CSS styling
- [x] T015 [US1] Update `src/app/layout.tsx` to set proper HTML metadata (title: "ReelZero", description, lang attribute) and configure font loading (Inter via `next/font`)
- [x] T016 [US1] Review and update `src/app/globals.css` to ensure Tailwind directives and shadcn/ui CSS variables are correctly configured
- [x] T017 [US1] Create `.env.example` at project root with all required environment variable placeholders and comments explaining each variable's purpose (Clerk, Supabase, Stripe, ElevenLabs, Gemini, Renderer URL) per spec FR-011
- [x] T018 [US1] Create environment variable validation utility in `src/lib/utils/env.ts` that checks for required env vars at startup and throws a clear error message listing any missing variables (satisfies SC-007 runtime validation)
- [x] T019 [US1] Update `.gitignore` to cover Next.js build output, Supabase local files, environment files (`.env`, `.env.local`), node_modules, and IDE files
- [x] T020 [US1] Verify `npm run dev` starts without errors and serves the placeholder page at `http://localhost:3000`
- [x] T021 [US1] Verify `npm run build` completes the production build without errors

**Checkpoint**: US1 complete. Developer can clone, install, and run the application successfully.

---

## Phase 4: User Story 2 - Developer Runs Quality Checks (Priority: P2)

**Goal**: All three quality checks (lint, type-check, build) pass independently and as a combined pre-commit command.

**Independent Test**: Run `npm run pre-commit` and verify all three checks (lint, type-check, build) execute sequentially and all pass with zero errors and zero warnings.

### Implementation for User Story 2

- [x] T022 [US2] Update `.eslintrc.json` (or `eslint.config.mjs`) to extend `next/core-web-vitals` and `next/typescript`, add `@typescript-eslint/no-explicit-any` as `error`, configure import ordering rules, add `no-restricted-exports` or equivalent to discourage default exports (with overrides for Next.js `page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`, `not-found.tsx` files which require default exports), and add `no-restricted-imports` to flag barrel file (`index.ts`) imports per Constitution Principle III
- [x] T023 [US2] Verify `tsconfig.json` has `"strict": true` and all strict mode sub-options enabled, path alias `@/*` maps to `src/*` (FR-012)
- [x] T024 [US2] Add `"type-check": "tsc --noEmit"` and `"pre-commit": "npm run lint && npm run type-check && npm run build"` scripts to `package.json`
- [x] T025 [US2] Run `npm run lint` and fix any warnings or errors until clean (zero warnings, zero errors)
- [x] T026 [US2] Run `npm run type-check` and fix any TypeScript errors until clean
- [x] T027 [US2] Run `npm run pre-commit` to verify all three checks pass sequentially

**Checkpoint**: US2 complete. All quality gates pass. Pre-commit workflow verified.

---

## Phase 5: User Story 3 - Developer Uses Error Handling System (Priority: P3)

**Goal**: A developer can import `AppError` and `ERROR_CODES`, throw a structured error, and the middleware automatically formats it into the standard response shape.

**Independent Test**: Import `AppError` and `ERROR_CODES`, create an error with `new AppError(ERROR_CODES.VALIDATION_FAILED)`, call `toJSON()`, and verify the output matches `{ error: { code: "VALIDATION_FAILED", message: "Validation failed" } }`.

### Implementation for User Story 3

- [x] T028 [US3] Verify `AppError` instantiation with each error code category works correctly (import from `@/lib/errors/app-error` and `@/lib/errors/codes`)
- [x] T029 [US3] Verify `AppError.toJSON()` returns the standardized shape `{ error: { code, message, details? } }` for errors with and without `details`
- [x] T030 [US3] Verify `withErrorHandler` middleware catches `AppError` and returns correct HTTP status code and formatted JSON body
- [x] T031 [US3] Verify `withErrorHandler` middleware catches unknown `Error` instances and returns `500` with `INTERNAL_ERROR` code
- [x] T032 [US3] Run `npm run type-check` to confirm all error system files compile without errors under strict mode

**Checkpoint**: US3 complete. Error handling system is fully functional and importable.

---

## Phase 6: User Story 4 - Developer Uses Shared Types and Constants (Priority: P4)

**Goal**: A developer can import shared types, constants, and store skeletons with full IDE autocompletion and compile-time safety.

**Independent Test**: Import video types, constants, and a Zustand store in a TypeScript file and verify the compiler accepts them with correct shapes and autocompletion works.

### Implementation for User Story 4

- [x] T033 [P] [US4] Create video specification constants (`VIDEO_RESOLUTION_WIDTH`, `VIDEO_RESOLUTION_HEIGHT`, `VIDEO_FRAME_RATE`, `VIDEO_DURATION_RANGE`, `MAX_SCENES`, `MIN_SCENES`, `VIDEO_CODEC`, `VIDEO_CONTAINER`, `VIDEO_ASPECT_RATIO`) in `src/lib/constants/video.ts` with `as const` and `Object.freeze()` per data-model.md
- [x] T034 [P] [US4] Create pricing tier constants (`PRICING_TIERS` array with Free/Basic/Pro/Enterprise tiers containing id, name, monthlyPrice, annualPrice, creditsPerMonth, storageQuotaMb, features) in `src/lib/constants/pricing.ts` with `as const` and `Object.freeze()` per data-model.md
- [x] T035 [P] [US4] Create voice option constants (`VOICE_OPTIONS` array with id, name, gender, accent, tier, previewUrl) in `src/lib/constants/voices.ts` with `as const` and `Object.freeze()` per data-model.md
- [x] T036 [P] [US4] Create video creation Zustand store skeleton in `src/store/video-store.ts` with typed state (currentStep, prompt, selectedVoice, selectedTheme, captionStyle, transitionType, scenes, isGenerating, generationProgress) and action stubs per data-model.md
- [x] T037 [P] [US4] Create user/subscription Zustand store skeleton in `src/store/user-store.ts` with typed state (user, subscription, isLoaded) and action stubs per data-model.md
- [x] T038 [P] [US4] Create UI state Zustand store skeleton in `src/store/ui-store.ts` with typed state (isSidebarOpen, activeModal, notifications) and action stubs per data-model.md
- [x] T039 [US4] Verify all constants are importable via `@/lib/constants/*` paths and have correct literal types
- [x] T040 [US4] Verify all Zustand stores are importable via `@/store/*` paths and TypeScript infers correct state/action types
- [x] T041 [US4] Run `npm run pre-commit` to verify everything compiles and passes all quality checks

**Checkpoint**: US4 complete. All types, constants, and stores are ready for use by subsequent features.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup across all user stories

- [x] T042 Verify all directory structure exists per [docs/ARCHITECTURE.md Section 2](../../docs/ARCHITECTURE.md#2-directory-structure) (100% directory coverage per SC-004)
- [x] T043 Verify `.env.example` documents every required environment variable key with placeholder values and comments (SC-007)
- [x] T044 Verify no barrel files (`index.ts`) exist anywhere in the project (Constitution Principle III)
- [x] T045 Verify no `any` types exist in any source file (Constitution Principle II)
- [x] T046 Verify all file names use kebab-case convention (Constitution Principle VII)
- [x] T047 Run `npm run pre-commit` as final validation (SC-002, SC-003)
- [x] T048 Run quickstart.md validation checklist to confirm all setup steps are satisfied

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion (T001-T005) - BLOCKS US2, US3, US4 (US1 can start after Phase 1 only)
- **US1 (Phase 3)**: Depends on Phase 1 completion (needs running project)
- **US2 (Phase 4)**: Depends on Phase 1 + Phase 2 (needs all files to lint/type-check)
- **US3 (Phase 5)**: Depends on Phase 2 (error system is built in foundational)
- **US4 (Phase 6)**: Depends on Phase 2 (types built in foundational)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 1 - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Phase 2 - Validates output of all other phases
- **User Story 3 (P3)**: Can start after Phase 2 - Verifies error system from foundational phase
- **User Story 4 (P4)**: Can start after Phase 2 - Adds constants and stores, then verifies

### Within Each User Story

- Core implementation before verification
- Story complete before moving to next priority

### Parallel Opportunities

- T001-T003 are sequential (project init → shadcn → zustand)
- T004-T005 can run after T001 (package.json exists)
- T006-T009 are sequential (codes → messages → AppError → middleware)
- T010-T013 can all run in parallel (independent type files)
- T033-T038 can all run in parallel (independent constant/store files)
- US3 and US4 can run in parallel after Phase 2 completes

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Sequential: Error system (dependency chain)
T006 → T007 → T008 → T009

# Parallel: All type files (independent files)
T010, T011, T012, T013  # All run simultaneously
```

## Parallel Example: User Story 4

```bash
# Parallel: Constants + Stores (all independent files)
T033, T034, T035, T036, T037, T038  # All run simultaneously

# Sequential: Verification after all parallel tasks complete
T039 → T040 → T041
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T013)
3. Complete Phase 3: User Story 1 (T014-T021)
4. **STOP and VALIDATE**: `npm run dev` shows "ReelZero" at localhost:3000
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Project compiles and runs
2. Add US1 → App serves placeholder page (MVP!)
3. Add US2 → Quality gates verified and passing
4. Add US3 → Error system verified and documented
5. Add US4 → Types, constants, stores ready for F002+
6. Polish → Full validation against spec success criteria

### Single Developer Strategy (Recommended)

Execute phases sequentially: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7. Within each phase, leverage parallel opportunities for independent files.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No test tasks generated (not explicitly requested in spec)
- Commit after each completed phase with format: `feat(foundation): <phase description>`
- Stop at any checkpoint to validate story independently
- Total tasks: 48
