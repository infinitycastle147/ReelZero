# Implementation Plan: Remotion Rendering Pipeline

**Branch**: `008-remotion-pipeline` | **Date**: 2026-02-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-remotion-pipeline/spec.md`

---

## Summary

F008 adds the complete video rendering pipeline to ReelZero: Remotion compositions for in-browser preview and server-side rendering, an audio-scene synchronization engine that converts word-level timing to frame-accurate composition data, a render orchestration layer that dispatches to the `ReelZero-Renderer` microservice via HTTP and handles the async completion callback, a 4-stage progress UI with client-side polling every 3 seconds, and a video player component with download support. Credit is reserved before dispatch and deducted only after MP4 signature validation passes on the callback.

---

## Technical Context

**Language/Version**: TypeScript 5+ (strict mode), Node.js ≥20
**Primary Dependencies**: Next.js 16.1.6 (App Router), React 19, `remotion` (new), `@remotion/player` (new), `@remotion/media` (new), `@clerk/nextjs` ^6 (existing), `@supabase/supabase-js` ^2 (existing), `zustand` ^5 (existing)
**Storage**: Supabase PostgreSQL (`videos` table + new `current_stage` column via migration) + Supabase Storage (`videos` bucket for MP4, `audio` bucket for MP3)
**Testing**: TypeScript strict + `npm run build` (compile-time) + manual end-to-end test against local renderer
**Target Platform**: Vercel (main app, serverless), Render.com (renderer microservice — separate repo)
**Performance Goals**: End-to-end generation ≤90s (SC-001); status poll response ≤200ms (single DB read); stage UI update ≤3s (SC-005)
**Constraints**: Vercel serverless 10s timeout → fire-and-forget POST to renderer, webhook callback for completion; No Remotion packages currently in package.json — 3 packages to install
**Scale/Scope**: 1 concurrent render per user (FR-018); 3–5 scenes per video (FR-016); ~3 new API routes, ~8 new components/services, 1 DB migration

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. AI Provider Abstraction | ✅ PASS | TTS call reuses existing `src/lib/ai/tts.ts`. No new direct AI calls in this feature. |
| II. Strict Type Safety | ✅ PASS | New types in `src/types/render.ts` and `src/types/remotion.ts`. `VideoStatus` aligned with DB constraint. No `any`. |
| III. Direct Imports Only | ✅ PASS | No barrel files. Each new file has one primary export. |
| IV. Database Abstraction | ✅ PASS | All DB access through `src/lib/db/queries/`. New `getProcessingVideoByUserId()` added to `videos.ts`. |
| V. Microservice Boundary | ✅ PASS | Main app communicates with renderer via `POST /render` + webhook callback. Remotion compositions shared via `src/remotion/` (copied to renderer during deploy). Fixed spec: 9:16, 1080×1920, 30fps, H.264, max 5 scenes. |
| VI. Credit-Gated Operations | ✅ PASS | `reserveCredit()` before render dispatch; `refundCredit()` on any failure; `deductCredit()` after MP4 validation. Server-side only. |
| VII. Consistent Naming | ✅ PASS | Files: `kebab-case`. Hooks: `use-render-polling.ts`. Constants: `RENDER_WEBHOOK_SECRET`. Components: named exports. |

**Post-design re-check**: ✅ All principles hold. No violations requiring justification.

---

## Project Structure

### Documentation (this feature)

```text
specs/008-remotion-pipeline/
├── plan.md              ← this file
├── spec.md
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   ├── api-routes.md
│   └── render-job.json
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── api/
│       └── video/
│           └── render/
│               ├── route.ts            # POST — trigger render (F008 NEW)
│               ├── status/
│               │   └── route.ts        # GET  — poll status (F008 NEW)
│               ├── complete/
│               │   └── route.ts        # POST — renderer webhook callback (F008 NEW)
│               └── stage/
│                   └── route.ts        # POST — renderer stage update (F008 NEW)
│
├── components/
│   └── video/
│       ├── generation-progress.tsx     # 4-stage progress UI (F008 NEW)
│       └── video-player.tsx            # <Player> wrapper + download button (F008 NEW)
│
├── hooks/
│   └── use-render-polling.ts           # Client-side 3s polling hook (F008 NEW)
│
├── lib/
│   └── services/
│       └── remotion/
│           ├── sync.ts                 # Audio → frame timing (F008 NEW)
│           └── render.ts               # Build payload + dispatch + validate MP4 (F008 NEW)
│   └── db/
│       └── queries/
│           └── videos.ts               # ADD: getProcessingVideoByUserId() (F008 MODIFY)
│
├── remotion/
│   ├── Root.tsx                        # Remotion root component (F008 NEW)
│   ├── VideoComposition.tsx            # Main composition (F008 NEW)
│   ├── Scene.tsx                       # Scene with Ken Burns (F008 NEW)
│   ├── transitions/
│   │   ├── Fade.tsx                    # Fade-to-black (F008 NEW)
│   │   └── Crossfade.tsx               # Crossfade (F008 NEW)
│   ├── captions/
│   │   ├── WordByWord.tsx              # Word-by-word pop-in (F008 NEW)
│   │   └── FullSentence.tsx            # Static sentence captions (F008 NEW)
│   └── utils/
│       └── timing.ts                   # secondsToFrame(), distributeFrames() (F008 NEW)
│
├── store/
│   └── video-store.ts                  # ADD: renderStatus, renderError state (F008 MODIFY)
│
└── types/
    ├── render.ts                        # New render types (F008 NEW)
    ├── remotion.ts                      # Remotion composition props (F008 NEW)
    └── video.ts                         # VideoStatus alignment fix (F008 MODIFY)

supabase/
└── migrations/
    └── 20260212000000_add_rendering_fields.sql   # ADD current_stage column (F008 NEW)

tests/
└── unit/
    ├── sync.test.ts                     # calculateSceneTimings() unit tests (F008 NEW)
    └── render.test.ts                   # validateMp4Buffer() unit tests (F008 NEW)
```

**Structure Decision**: Single Next.js project (Option 1). Remotion compositions live in `src/remotion/` — shared with the renderer microservice (renderer imports them via a path alias or file copy during CI). All services in `src/lib/services/remotion/` following existing pattern from F004/F005.

---

## Complexity Tracking

No constitution violations requiring justification. All patterns are standard for this project.

---

## Design Decisions

### A. Webhook Callback vs. Main-App Polling to Renderer

The main app does **not** poll the renderer. Instead the renderer calls back via `POST /api/video/render/complete` and `POST /api/video/render/stage`. This avoids main-app serverless timeout issues and keeps outbound HTTP calls minimal.

The **client** polls `GET /api/video/render/status` every 3s — a cheap single-row Supabase read. This separates the hot path (client ↔ main app) from the slow path (renderer → main app callback).

### B. Audio Generation Timing

Audio is generated **before** the render job is dispatched. The `sync.ts` service receives the completed `WordAlignment[]` from the TTS call (already stored in the video's `metadata` JSONB field by the wizard step), computes frame timings, and includes them in the `RenderJobPayload`. The renderer does not call ElevenLabs.

### C. Remotion Compositions as Shared Code

`src/remotion/` compositions are used by both:
- The main app: `<Player component={VideoComposition} inputProps={...} />` for in-browser preview
- The renderer microservice: `@remotion/renderer` bundles and renders the composition server-side

For MVP, the renderer repo copies or symlinks `src/remotion/`. A shared package can be extracted later.

### D. `VideoStatus` Type Fix

`src/types/video.ts` currently has `"draft" | "generating" | "rendering" | "completed" | "failed"` which is inconsistent with the DB constraint `('processing', 'completed', 'failed')`. F008 fixes this to `"processing" | "completed" | "failed"`. Any callers using `"draft"` or `"generating"` (if any) will be updated.

### E. Free-Tier Watermark

The `showWatermark` boolean is derived server-side from the user's subscription tier before building `RenderJobPayload`. It is sent to the renderer and rendered into the video at the composition level (`<Watermark />` component visible only when `showWatermark === true`).
