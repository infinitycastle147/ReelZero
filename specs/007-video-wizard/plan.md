# Implementation Plan: Video Generation Wizard

**Branch**: `007-video-wizard` | **Date**: 2026-02-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-video-wizard/spec.md`

## Summary

Build a 4-step multi-step wizard UI at `(dashboard)/create/` that guides authenticated users from a text prompt to a fully-configured video job submitted to the rendering pipeline. The wizard orchestrates three existing AI endpoints (script generation, image generation, image upload), enforces credit reservation before submission, persists in-progress state client-side across navigations, and redirects to the generation progress page on success.

The existing `video-store.ts` (Zustand), `Scene` type, `CaptionStyle`/`TransitionType` types, `useCredits` hook, and three AI API routes (`/api/video/generate`, `/api/video/images`, `/api/upload/image`) are already scaffolded. The `render/` directory exists but `route.ts` is **new** (created in T010). A second new route `POST /api/video` (T006) creates the initial video record. This feature wires all of these together into a complete user-facing UI.

## Technical Context

**Language/Version**: TypeScript 5+ strict mode
**Primary Dependencies**: Next.js 16+ (App Router), React 18+, Zustand (existing), shadcn/ui (new-york / neutral), Tailwind CSS v4, `@dnd-kit/core` + `@dnd-kit/sortable` (new — scene reordering), native HTML5 drag-and-drop file upload (no new library — see research.md Decision 3), `zustand/middleware` persist (new — draft persistence)
**Storage**: Supabase Storage (images bucket for scene images — already provisioned by F003)
**Testing**: `npm run lint` + `npm run type-check` + `npm run build` (pre-commit gate)
**Target Platform**: Vercel (Next.js serverless, App Router)
**Performance Goals**: Wizard step transitions < 100ms; script generation round-trip < 10s; image generation per scene < 15s (matches AI service SLAs)
**Constraints**: Vercel serverless timeout 30s per route — image generation calls are client-initiated (fan-out from browser, not proxied through a single long-running route); wizard state stored in `sessionStorage` (survives refresh, cleared on browser close)
**Scale/Scope**: Single user session at a time; max 5 concurrent image generation requests per wizard submission

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AI Provider Abstraction | ✅ PASS | All AI calls go through existing `/api/video/generate`, `/api/video/images`, `/api/upload/image` routes which wrap `src/lib/ai/`. The wizard UI calls these endpoints via the `src/lib/api/client.ts` fetch wrapper — never calls AI providers directly. |
| II. Strict Type Safety | ✅ PASS | All wizard state uses existing typed `Scene`, `CaptionStyle`, `TransitionType`. New components use named exports only. No `any`. Magic values use existing `MAX_SCENES`, `MIN_SCENES` constants. |
| III. Direct Imports Only | ✅ PASS | No barrel files. All imports direct from source. One primary export per file. |
| IV. Database Abstraction | ✅ PASS | The wizard creates a `Video` DB record server-side via the new `POST /api/video` route (T006). `POST /api/video/render` updates `videos.metadata` at submission time. All DB access goes through `src/lib/db/queries/`. No raw Supabase calls from components. |
| V. Microservice Boundary | ✅ PASS | Wizard only calls the Main App (Vercel) endpoints. Rendering pipeline dispatch is via `POST /api/video/render` which calls the Renderer service. Wizard does not call Renderer directly. |
| VI. Credit-Gated Operations | ✅ PASS | `useCredits()` hook gates the Step 4 submit button (client UX). `POST /api/video/render` performs server-side `reserveCredit()` before dispatching to renderer; `refundCredit()` on failure. Client-side gate is UX-only per constitution. |
| VII. Naming & Structure | ✅ PASS | New component files follow kebab-case; hooks use camelCase `use` prefix (`useVideoGeneration.ts`, `useCredits.ts`); booleans use `is/has/can` prefix; components use named exports only. |

**Gate result: PASS — all 7 principles satisfied. Proceeding to Phase 0.**

## Project Structure

### Documentation (this feature)

```text
specs/007-video-wizard/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── wizard-api.md    ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code (new files this feature)

```text
src/
├── app/
│   └── (dashboard)/
│       └── create/
│           └── page.tsx                        ← replace stub with wizard mount
│
├── components/
│   └── video/
│       ├── video-wizard.tsx                    ← step orchestrator (top-level client component)
│       ├── wizard-step-indicator.tsx           ← step progress bar
│       ├── steps/
│       │   ├── step-1-input.tsx               ← prompt + voice + theme + caption
│       │   ├── step-2-script.tsx              ← scene list editor
│       │   ├── step-3-images.tsx              ← per-scene image selector
│       │   └── step-4-settings.tsx            ← transition + summary + submit
│       ├── scene-card.tsx                      ← individual editable scene (used in steps 2 & 3)
│       ├── scene-list-sortable.tsx             ← dnd-kit sortable wrapper for scene list
│       ├── image-selector.tsx                  ← ai-generate vs upload toggle per scene
│       └── image-dropzone.tsx                  ← react-dropzone wrapper with validation
│
├── hooks/
│   └── useVideoGeneration.ts                   ← orchestration hook (script gen, image gen, submit)
│
└── store/
    └── video-store.ts                          ← EXTEND: add persist middleware + reorderScenes action
```

### Modified files

```text
src/store/video-store.ts        ← add zustand/middleware persist + reorderScenes action
src/app/(dashboard)/create/page.tsx  ← replace stub with <VideoWizard />
```

## Complexity Tracking

> No Constitution violations requiring justification.

## Implementation Phases

### Phase 0: Research (see research.md)

Unknowns resolved:
1. **Drag-and-drop library** — `@dnd-kit/sortable` (accessibility, React 18, no default exports, tree-shakeable)
2. **State persistence** — `zustand/middleware` `persist` with `sessionStorage` (survives refresh, cleared on close; SSR hydration pattern using `useStore` with `skip`)
3. **File upload pattern** — Native HTML5 drag-and-drop + `<input type="file">` (no new library); 3-step client-side validation (size → MIME → extension) before `FormData` POST to `/api/upload/image`
4. **Video record creation timing** — Option A: create `Video` DB record on Step 1 submit (server action or new `POST /api/video` route) so `videoId` exists for all subsequent AI calls

### Phase 1: Design & Contracts

See:
- `data-model.md` — Wizard state shape, VideoJob payload, Scene type extensions
- `contracts/wizard-api.md` — New `POST /api/video` (create record) + `POST /api/video/render` contract; updated `POST /api/video/images` (remove client-provided `userId`)
- `quickstart.md` — How to run and test the wizard locally

## Key Design Decisions

### 1. VideoId Lifecycle

**Decision**: Create the `Video` DB record on Step 1 submit (before script generation), using a new `POST /api/video` endpoint that returns a `videoId`. This `videoId` is stored in Zustand and sent to all subsequent AI API calls.

**Rationale**: The existing `/api/video/generate` and `/api/video/images` routes already require `videoId`. Creating the record early gives all AI calls a stable identifier for `generation_logs` and `uploaded_images` FK references. An incomplete video record (user abandons wizard) is handled by the `status: "processing"` default — the F009 dashboard will only show `completed` videos.

**Alternative rejected**: Client-generated UUID with lazy DB creation — would require all AI routes to create the record if missing (TOCTOU), complicates `generation_logs` FK integrity.

### 2. Security: userId from Auth Context

**Decision**: Remove `userId` from the `POST /api/video/images` and `POST /api/upload/image` request bodies. All routes derive `userId` from `auth()` (Clerk). The wizard never sends `userId` as a client body parameter.

**Rationale**: Constitution Principle VI + F007 code review note in `features.md`. Client-provided `userId` is a security vulnerability. Already correctly implemented in `/api/video/generate`; the images and upload routes need patching.

### 3. Parallel Image Generation

**Decision**: The wizard's `useVideoGeneration.ts` hook fires all image generation requests simultaneously using `Promise.allSettled()`. Each scene's loading/error state is tracked individually in Zustand (`Scene.imageStatus: 'idle' | 'loading' | 'success' | 'error'`).

**Rationale**: Clarification Q4: parallel is user-selected. `Promise.allSettled()` ensures one failure doesn't cancel others.

### 4. Scene Auto-Correct on Script Response

**Decision**: After receiving the script API response, the wizard normalises to [3, 5] scenes: truncate to first 5 if over, pad with blank `Scene` objects if under 3.

**Rationale**: Clarification Q3. Blank scenes have `narration: ""` and `visualDescription: ""` — user sees them in Step 2 and fills them in.

### 5. Back-Navigation with State Preservation

**Decision**: Wizard `currentStep` is decrementable freely. Advancing forward validates the current step; going back has no validation gate. All downstream data (generated scenes, images) is preserved on back-navigation. Edited visual descriptions do NOT auto-invalidate existing images (edge case in spec).

### 6. Persist Middleware Scope

**Decision**: Persist only `{ currentStep, prompt, selectedVoice, selectedTheme, captionStyle, transitionType, scenes }` — exclude `isGenerating`, `generationProgress`, `onGenerationComplete`. Use `sessionStorage`. Key: `reelzero-video-wizard-draft`.

**On successful submit**: call `reset()` (clears persisted state) then navigate to progress page.

### 7. Prompt Length Validation (FR-004 + F007 code review note)

**Decision**: Enforce 50–500 character validation both client-side (inline error before Step 1 can advance) and server-side (in `POST /api/video/generate` route, which currently only checks presence). The route needs a length guard added.

## Component Architecture

```
(dashboard)/create/page.tsx          [Server Component — auth check + render boundary]
  └── VideoWizard                    [Client Component — top-level orchestrator]
        ├── WizardStepIndicator      [Client — renders step 1-4 progress]
        ├── Step1Input               [Client — form: prompt, voice, theme, caption]
        ├── Step2Script              [Client — sortable scene list]
        │     └── SceneListSortable  [Client — dnd-kit DndContext + SortableContext]
        │           └── SceneCard    [Client — editable narration + visual desc]
        ├── Step3Images              [Client — per-scene image selector]
        │     └── ImageSelector (×N) [Client — toggle AI/Upload + preview]
        │           └── ImageDropzone[Client — native HTML5 file input + drag-and-drop]
        └── Step4Settings            [Client — transition picker + summary + submit]
```

## State Management

The existing `video-store.ts` is extended with:

1. **`reorderScenes(activeId, overId)`** — swap scene positions, re-index `.order`
2. **`setSceneImageStatus(id, status)`** — track per-scene generation state
3. **`videoId`** (string | null) — set after Step 1 submit / video record created
4. **Persist middleware** — `sessionStorage`, key `reelzero-video-wizard-draft`, `partialize` to exclude transient fields

New fields on `Scene` type:
- `imageStatus: 'idle' | 'loading' | 'success' | 'error'`

## API Surface (new/modified routes)

| Method | Route | Status | Change |
|--------|-------|--------|--------|
| `POST` | `/api/video` | **NEW** | Create video DB record; returns `{ data: { videoId } }` |
| `POST` | `/api/video/generate` | **PATCH** | Add prompt length validation (50–500 chars) |
| `POST` | `/api/video/images` | **PATCH** | Remove `userId` from body; derive from `auth()` |
| `POST` | `/api/upload/image` | **PATCH** | Remove `userId` from body (if present); derive from `auth()` |
| `POST` | `/api/video/render` | **NEW** | Accept VideoJob payload; reserve credit; dispatch to renderer |

## Error Handling

All wizard API calls use the existing `src/lib/api/client.ts` fetch wrapper which returns `{ data }` or `{ error: { code, message } }`. The `useVideoGeneration.ts` hook maps error codes to user-friendly messages:

| Error Code | User Message |
|---|---|
| `CREDIT_INSUFFICIENT` | "You have no credits remaining. [Upgrade plan]" |
| `GENERATION_SCRIPT_FAILED` | "Script generation failed. Please try again." |
| `GENERATION_IMAGE_FAILED` | "Image generation failed for this scene. [Retry]" |
| `RENDER_SERVICE_UNAVAILABLE` | "Video generation is temporarily unavailable. Please try again shortly." |
| `VALIDATION_INVALID_INPUT` | Inline field error on the relevant form field |

## Testing Strategy

Pre-commit (automated):
- `npm run type-check` — catches all type errors in new components and store extensions
- `npm run lint` — catches import order, naming violations
- `npm run build` — catches missing exports, bad RSC/client boundary usage

Manual acceptance tests (from spec User Stories):
1. **US1 happy path**: Enter prompt → generate script → generate all images → submit → redirected to progress page
2. **US2 script edit**: Edit narration, add scene, delete scene, drag to reorder → values persist to Step 4 summary
3. **US3 image upload**: Drop valid image → preview shown; drop oversized → inline error; replace → new image shown
4. **US4 credit gate**: Zero-credit user → "Generate Video" disabled + billing link visible
5. **US5 resume**: Partially complete wizard → navigate away → return → state restored at correct step
