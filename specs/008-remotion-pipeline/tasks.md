# Tasks: Remotion Rendering Pipeline

**Input**: Design documents from `/specs/008-remotion-pipeline/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install new dependencies, add DB migration, fix type inconsistency, add new type files

- [X] T001 Install Remotion packages: run `npm install remotion @remotion/player @remotion/media` and verify no build errors with `npm run type-check`
- [X] T002 Create DB migration `supabase/migrations/20260212000000_add_rendering_fields.sql` — `ALTER TABLE videos ADD COLUMN IF NOT EXISTS current_stage TEXT CHECK (current_stage IN ('audio','sync','render','finalize')) DEFAULT NULL` + `CREATE INDEX IF NOT EXISTS idx_videos_user_status ON videos(user_id, status)`
- [X] T003 [P] Fix `VideoStatus` type in `src/types/video.ts` — change union from `"draft" | "generating" | "rendering" | "completed" | "failed"` to `"processing" | "completed" | "failed"` and update any callers
- [X] T004 [P] Create `src/types/render.ts` — export `RenderStage`, `RenderJobPayload`, `RenderScene`, `WordFrameTiming`, `RenderCompleteCallback`, `RenderStatusResponse` types per data-model.md
- [X] T005 [P] Create `src/types/remotion.ts` — export `VideoCompositionProps` type per data-model.md
- [X] T006 Add `RENDERER_SERVICE_URL` and `RENDER_WEBHOOK_SECRET` to `.env.example`

**Checkpoint**: `npm run type-check` passes. Migration file exists. New type files compile cleanly.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core services, timing utilities, DB query additions, and Remotion composition primitives that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Create `src/remotion/utils/timing.ts` — export `secondsToFrame(seconds: number, fps: number): number` and `distributeFrames(totalFrames: number, count: number): number[]` (distributes remaining frames evenly across silent scenes)
- [X] T008 Create `src/lib/services/remotion/sync.ts` — export `calculateSceneTimings(scenes: Scene[], wordAlignment: WordAlignment[], fps: number): RenderScene[]`; **guard at entry**: if `wordAlignment.length === 0` throw `new AppError("AUDIO_ALIGNMENT_EMPTY", "Word alignment data is missing or empty — cannot calculate scene timings")` (do not silently produce all-zero frame durations); maps word boundaries to scenes and computes `durationInFrames` and `wordTimings: WordFrameTiming[]` per scene; each `WordFrameTiming.startFrame` and `.endFrame` are **global** (absolute composition frame from time 0); use `distributeFrames()` for scenes with zero aligned words (scenes with narration that produced no alignment entries get proportional frames from the remaining pool)
- [X] T009 Create `src/lib/services/remotion/render.ts` — export three functions: (1) `buildRenderPayload(video: Video, userId: string, wordAlignment: WordAlignment[], callbackBaseUrl: string): Promise<RenderJobPayload>` — calls `getFileUrl("audio", video.audioStoragePath)` for the audio URL and `getFileUrl("images", scene.imageStoragePath)` for each scene image; if any `getFileUrl()` call throws (storage path not found or permission error), propagate the `AppError` — the caller (T019 route) handles it with `refundCredit + 422`; (2) `dispatchToRenderer(payload: RenderJobPayload): Promise<{ jobId: string }>` — `fetch(RENDERER_SERVICE_URL + "/render", { method: "POST", body: JSON.stringify(payload), signal: AbortSignal.timeout(8000) })`; throws `AppError("RENDER_SERVICE_UNAVAILABLE")` on network error or non-2xx response; (3) `validateMp4Buffer(buffer: Buffer): boolean` — returns `true` iff `buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp"`
- [X] T010 Add `getProcessingVideoByUserId(userId: string): Promise<Video | null>` to `src/lib/db/queries/videos.ts` — query `videos` where `user_id = userId AND status = 'processing'` using `.maybeSingle()`
- [X] T011 [P] Create `src/remotion/Scene.tsx` — plain Remotion component (**no `"use client"`** — Remotion compositions run in both browser Player and Node.js renderer); renders `<AbsoluteFill style={{ overflow: "hidden" }}>` with Ken Burns effect via `interpolate(frame, [0, durationInFrames], [0, 1])` driving `scale` (1.0→1.08); **pan direction alternates per scene index** — even scenes pan right+up (`translateX`: 0→+4%, `translateY`: 0→-2%), odd scenes pan left+down (`translateX`: 0→-4%, `translateY`: 0→+2%); applies to `<Img style={{ objectFit: "cover" }}`; accepts `src: string`, `sceneIndex: number`, `durationInFrames: number` props; uses `useCurrentFrame()` + `useVideoConfig()`
- [X] T012 [P] Create `src/remotion/transitions/Fade.tsx` — plain Remotion component (**no `"use client"`**); renders a black `<AbsoluteFill>` with opacity interpolated from 0→1 over the last 15 frames of a sequence (fade-to-black); accepts `durationInFrames: number` prop; uses `useCurrentFrame()`
- [X] T013 [P] Create `src/remotion/transitions/Crossfade.tsx` — plain Remotion component (**no `"use client"`**); renders an `<AbsoluteFill>` with opacity interpolated 0→1 over the full `durationInFrames`; used by overlapping `<Sequence from={-15}>` in the parent composition; accepts `durationInFrames: number` prop; uses `useCurrentFrame()`
- [X] T014 [P] Create `src/remotion/captions/WordByWord.tsx` — plain Remotion component (**no `"use client"`**); renders each word in `wordTimings: WordFrameTiming[]` with opacity `interpolate(frame, [startFrame-2, startFrame+2], [0, 1])` (2-frame pop-in); frame values in `wordTimings` are **scene-local** (0-based, i.e., global `startFrame` minus `scene.startFrame` — this subtraction happens in `VideoComposition`, NOT here); positioned bottom-center with white text, semi-transparent background pill; uses `useCurrentFrame()`
- [X] T015 [P] Create `src/remotion/captions/FullSentence.tsx` — plain Remotion component (**no `"use client"`**); renders the full narration text as a static overlay for the entire scene duration; same positioning/styling as WordByWord; no frame gating — text is visible from frame 0 to `durationInFrames` of the scene
- [X] T016 Create `src/remotion/VideoComposition.tsx` — plain Remotion component (**no `"use client"`** — used by both `<Player>` in the browser and `@remotion/renderer` in Node.js); accepts `VideoCompositionProps`; renders `<Audio src={audioUrl} />` at root level; **implements both transition paths in a switch/conditional**: (a) `transitionType === "fade"`: use `<Series>` — wrap each scene in `<Series.Sequence durationInFrames={scene.durationInFrames}>` and render `<Fade durationInFrames={scene.durationInFrames} />` overlay for the last 15 frames using `useCurrentFrame()` inside each sequence; (b) `transitionType === "crossfade"`: use manual `<Sequence from={scene.startFrame} durationInFrames={scene.durationInFrames + 15}>` blocks with 15-frame overlap (each scene starts 15 frames before the previous ends), and render `<Crossfade durationInFrames={15} />` overlay at the start of each scene; per scene renders `<Scene src={scene.imageUrl} sceneIndex={idx} durationInFrames={scene.durationInFrames} />`; converts global `WordFrameTiming.startFrame` to scene-local by subtracting `scene.startFrame` before passing `wordTimings` to caption components; renders appropriate caption component based on `captionStyle` (`"word-by-word"` → `<WordByWord>`, `"full-sentence"` → `<FullSentence>`, `"none"` → nothing); if `showWatermark` renders `<Watermark />` (bottom-right corner, 50% opacity logo)
- [X] T017 Create `src/remotion/Root.tsx` — Remotion root that registers the `VideoComposition` with `<Composition id="VideoComposition" component={VideoComposition} durationInFrames={1800} width={1080} height={1920} fps={30} />`; this file is used by the renderer microservice for bundling
- [X] T018 [P] Add `renderStatus: RenderStage | null`, `renderError: string | null` state fields and `setRenderStatus` / `setRenderError` / `clearRenderState` actions to `src/store/video-store.ts`; these are NOT persisted in sessionStorage (exclude from `partialize`)

**Checkpoint**: `npm run type-check` and `npm run build` pass. Compositions render in isolation. `sync.ts` `calculateSceneTimings()` produces correct `durationInFrames` for a sample 3-scene input.

---

## Phase 3: User Story 1 — End-to-End Video Generation (Priority: P1) 🎯 MVP

**Goal**: User clicks "Generate Video" → sees 4-stage progress → gets playable downloadable MP4 within 90 seconds

**Independent Test**: POST to `/api/video/render` with a valid `videoId` (wizard complete, 1 credit, scenes with images); verify `202` returned immediately; simulate renderer webhook callback to `/api/video/render/complete`; verify video record updates to `completed`, credit reservation is consumed (balance decremented — no separate `deductCredit` call; kept by not calling `refundCredit`), video URL is a signed Supabase URL with valid `ftyp` header

- [X] T019 [US1] Create `src/app/api/video/render/route.ts` (POST) — auth with `auth()`, validate `videoId` body param (400 if missing/invalid UUID), fetch video by ID, verify `video.userId === userId` (403 if not); **concurrent guard**: call `getProcessingVideoByUserId(userId)` — if it returns a non-null record whose `id !== videoId`, return 409 `RESOURCE_CONFLICT` "generation already in progress" without reserving credit; if the returned record's `id === videoId` the user is re-submitting the same job — return 409 as well (idempotent rejection); call `reserveCredit(userId)` (402 `CREDIT_INSUFFICIENT` if returns false); call `buildRenderPayload(video)` — this internally calls `getFileUrl("images", scene.storagePath)` for each scene image and `getFileUrl("audio", video.audioStoragePath)` for the audio URL; if any storage path returns a `STORAGE_FILE_NOT_FOUND` error, call `refundCredit(userId)` and return 422 `RESOURCE_NOT_FOUND` "scene image not found"; call `calculateSceneTimings()` with the audio alignment from `video.metadata.wordAlignment`; call `dispatchToRenderer(payload)` — on network error or non-2xx response: `refundCredit(userId)`, `updateVideo(videoId, { status: "failed" })`, return 503 `RENDER_SERVICE_UNAVAILABLE`; on success: `updateVideo(videoId, { current_stage: "audio" })`, return `202 { data: { videoId, status: "processing", estimatedSeconds: 80 } }`
- [X] T020 [US1] Create `src/app/api/video/render/complete/route.ts` (POST) — validate `x-render-secret` header (401 if mismatch), parse `RenderCompleteCallback` body; on `status === "completed"`: fetch first 12 bytes from `outputUrl` using `fetch(...).then(r => r.arrayBuffer())`, call `validateMp4Buffer(Buffer.from(bytes))` — if validation fails, treat as failure (go to failure path); generate a fresh signed URL via `getFileUrl("videos", storagePath)`, update video record `status = 'completed'`, `video_url = signedUrl`, `current_stage = null`, `duration_seconds`, `file_size_bytes`; **do NOT call `deductCredit()`** — the credit was reserved by `reserveCredit()` in the trigger route; the reservation is kept by simply not calling `refundCredit()`; log `generation_logs` entry with `status = 'success'`; on `status === "failed"` (or MP4 validation failure): update video `status = 'failed'`, `current_stage = null`, call `refundCredit(userId)`, log `generation_logs` error; return `200 { data: { received: true } }`; add idempotency guard (409 if video already `completed` or `failed`)
- [X] T021 [US1] Create `src/app/api/video/render/stage/route.ts` (POST) — validate `x-render-secret`, parse `{ videoId, stage }`, update `videos.current_stage = stage`, return `200 { data: { received: true } }`
- [X] T022 [US1] Create `src/app/api/video/render/status/route.ts` (GET) — auth with `auth()`, read `videoId` from query params (400 if missing), fetch video by ID, verify `video.userId === userId` (403 if not); build response: `status`, `currentStage` from `video.current_stage`, `error` from `video.metadata?.renderError ?? null`; for `videoUrl`: when `status === "completed"`, call `getFileUrl("videos", video.videoStoragePath)` — the `video.videoStoragePath` field stores the **Supabase storage object path** (e.g., `"userId/videoId.mp4"`) — NOT the signed URL itself; `getFileUrl()` generates a fresh signed URL on each poll call (signed URLs expire in 1hr so regenerating on each status poll is correct); when `status !== "completed"`, `videoUrl` is `null`; return `200 { data: { status, currentStage, videoUrl, error } }`
- [X] T023 [US1] Create `src/hooks/use-render-polling.ts` — export `useRenderPolling(videoId: string | null, enabled: boolean): RenderStatusResponse | null`; use `setInterval` at 3000ms calling `GET /api/video/render/status?videoId=X`; clear interval when `status === "completed" | "failed"` or on unmount; update `useVideoStore` `renderStatus` / `renderError` on each poll
- [X] T024 [US1] Create `src/components/video/generation-progress.tsx` — `"use client"` **scaffold** (minimal working version for US1; US4 tasks T036–T038 will enhance the labels, progress bar, and countdown); accepts `videoId: string`; calls `useRenderPolling(videoId, true)`; renders the 4 stage names inline (`audio`, `sync`, `render`, `finalize`) and marks the active stage with a simple highlight; renders a static text showing current stage name; on `status === "failed"` renders the `renderError` string and a "Try Again" button that calls `clearRenderState()` and navigates back to Step 4; on `status === "completed"` calls parent callback (prop `onComplete: () => void`) so parent can swap to `<VideoPlayer>`; **this task is complete when the US1 happy-path works end-to-end** — do not add spinner animations, percentage bar, or countdown here (those belong in T036–T038)
- [X] T025 [US1] Create `src/components/video/video-player.tsx` — `"use client"` component; accepts `videoId: string`, `videoUrl: string`, `compositionProps: VideoCompositionProps`; the parent component (Step 5 in `create/page.tsx`) is responsible for building `compositionProps` from Zustand store state (`useVideoStore()`) — **do not fetch from `GET /api/video/render/status`** (that endpoint returns status/stage/URL, not composition props); `video-player.tsx` receives `compositionProps` as a prop; renders `<Player component={VideoComposition} durationInFrames={totalDurationInFrames} compositionWidth={1080} compositionHeight={1920} fps={30} inputProps={compositionProps} controls style={{ width: "100%" }} />` where `totalDurationInFrames = compositionProps.scenes.reduce((sum, s) => sum + s.durationInFrames, 0)`; renders "Download MP4" `<a href={videoUrl} download="video.mp4">` button below player; calls `useVideoStore().notifyGenerationComplete()` on mount to trigger credit balance refresh
- [X] T026 [US1] Wire `generation-progress.tsx` and `video-player.tsx` into the wizard flow — update Step 4 confirm action in `src/app/(dashboard)/create/page.tsx` to: POST `/api/video/render`, then render `<GenerationProgress videoId={videoId} />` as step 5; swap to `<VideoPlayer>` when polling returns `completed`

**Checkpoint**: Full happy-path works end-to-end. Generate Video → progress screen advances through 4 stages (driven by renderer stage callbacks) → VideoPlayer renders → MP4 downloads correctly. Credit balance decrements by 1 (reservation consumed on successful completion; `refundCredit` NOT called).

---

## Phase 4: User Story 2 — Generation Failure & Credit Refund (Priority: P2)

**Goal**: Any failure at any stage → credit refunded automatically, human-readable error shown, "Try Again" available

**Independent Test**: Simulate renderer sending `POST /api/video/render/complete { status: "failed", error: "render crash" }` → verify credit refunded, video `status = 'failed'`, client poll returns error, `GenerationProgress` shows readable message + "Try Again" button

- [X] T027 [US2] Verify and harden failure handling in `src/app/api/video/render/route.ts` (already created in T019) — **do not re-implement**; audit the existing `try/catch` from T019 and confirm: (a) `dispatchToRenderer()` network error (fetch throws) → `refundCredit(userId)`, `updateVideo({ status: "failed" })`, 503 `RENDER_SERVICE_UNAVAILABLE`; (b) renderer returns non-2xx (e.g., 500) → same refund + 503; (c) renderer connection timeout (AbortController 8s) → `refundCredit(userId)`, `updateVideo({ status: "failed" })`, 503 `RENDER_SERVICE_UNAVAILABLE`; (d) confirm `refundCredit` is NOT called a second time if credit reservation itself failed (i.e., only call `refundCredit` when `reserveCredit` already returned `true`); add `AbortController` with 8-second timeout to the `dispatchToRenderer` fetch if not already present
- [X] T028 [US2] Verify `src/app/api/video/render/complete/route.ts` MP4 validation failure path — **the route must fetch bytes from `outputUrl` before calling `validateMp4Buffer()`**: `const res = await fetch(outputUrl); const buf = Buffer.from(await res.arrayBuffer().then(ab => ab.slice(0, 12)));`; confirm `validateMp4Buffer()` returning false (either `buf.length < 12` OR bytes 4–7 are not `"ftyp"`) triggers the failure path: `refundCredit(userId)`, `status = 'failed'`, `current_stage = null`, `generation_logs` error entry with `error_message = "MP4 validation failed"`; to test the failure path, call the complete route with a `status: "completed"` body where `outputUrl` points to a **valid URL that returns an empty body** (0 bytes content-length) — `buf.length < 12` evaluates to true and `validateMp4Buffer()` returns false; verify this path does NOT call `refundCredit` a second time if the video was already marked `failed`
- [X] T029 [US2] Add "Try Again" action to `src/components/video/generation-progress.tsx` — when `renderError` is set, show the error message (from `renderError` field, not raw code), a human-readable fallback ("Video rendering failed — your credit has been refunded"), and a "Try Again" button that resets `renderStatus` / `renderError` in the store and navigates back to wizard Step 4
- [X] T030 [US2] Add timeout guard in `src/app/api/video/render/route.ts` — store render start timestamp in `videos.metadata` JSONB as `renderStartedAt`; document that the renderer enforces 120s `AbortController` and calls `/api/video/render/complete` with `status: "failed"` on timeout (this is a renderer-side concern, but confirm the complete route handles `error: "timeout"` message and maps it to `RENDER_TIMEOUT` error code in the generation log)

**Checkpoint**: Simulated failures (renderer 5xx, MP4 validation fail, timeout callback) all result in credit refund, correct `failed` status, readable UI error, and "Try Again" available. No credit is lost on system failures.

---

## Phase 5: User Story 3 — Video Preview with Captions (Priority: P3)

**Goal**: Completed video renders with synchronized captions matching the selected style; preview is accurate in the embedded player

**Independent Test**: Generate a video with "word-by-word" caption style; verify in `<Player>` that each word appears within 2 frames of its `startFrame` from `WordFrameTiming[]`; test all 3 styles (word-by-word, full-sentence, none)

- [X] T031 [P] [US3] Verify `src/remotion/captions/WordByWord.tsx` renders correctly — ensure `useCurrentFrame()` is compared against scene-local frame values; confirm `WordFrameTiming.startFrame` values in the payload are global frames and are converted to scene-local by subtracting `scene.startFrame` before being passed as props to `WordByWord`; update `VideoComposition.tsx` to perform this subtraction when building per-scene word timing props
- [X] T032 [P] [US3] Verify `src/remotion/captions/FullSentence.tsx` — confirm the full `scene.narration` text is assembled from all `wordTimings[].word` joined by spaces and rendered as a single static block; ensure it is visible for the entire `durationInFrames` of the scene without any frame-gating
- [X] T033 [US3] Add `captionStyle === "none"` branch to `src/remotion/VideoComposition.tsx` — when `captionStyle === "none"`, no caption component is rendered inside any `<Series.Sequence>`; verify this branch produces a clean video with no caption DOM elements
- [X] T034 [US3] Verify inter-scene caption clean transition — ensure `<Series.Sequence>` unmounts the previous scene's caption component on frame boundary; add `name` prop to each `<Series.Sequence>` for Remotion Studio debugging (e.g., `name={"Scene 1"}`)
- [X] T035 [US3] Verify both transition paths in `src/remotion/VideoComposition.tsx` (scaffolded in T016) — **do not re-implement**; for `transitionType === "crossfade"`, confirm that manual `<Sequence>` blocks have correct `from` values producing a 15-frame overlap between each pair of adjacent scenes (e.g., Scene 2 starts at `scene1.startFrame + scene1.durationInFrames - 15`), and that `<Crossfade durationInFrames={15} />` fades in over those first 15 frames; for `transitionType === "fade"`, confirm that `<Fade>` overlays render a black fade-to-black over the last 15 frames within each `<Series.Sequence>`; write a manual test: set `transitionType = "crossfade"`, render the composition, scrub to a frame 10 frames before Scene 1 ends and confirm both scenes are visible simultaneously

**Checkpoint**: All 3 caption styles render correctly in the embedded `<Player>`. Word-by-word timing is frame-accurate. Crossfade and fade transitions both work. No caption text bleeds between scenes.

---

## Phase 6: User Story 4 — Progress Transparency (Priority: P4)

**Goal**: 4-stage progress indicator advances in real-time; progress bar and estimated time displayed throughout the ~90s render

**Independent Test**: Trigger generation; confirm stage indicator advances from "audio" → "sync" → "render" → "finalize" as renderer POSTs to `/api/video/render/stage`; confirm each stage update is reflected in the UI within ≤3 seconds of the DB update

- [X] T036 [US4] Enhance stage indicator in `src/components/video/generation-progress.tsx` (scaffolded in T024) — **extends T024, does not replace it**; replace raw stage name strings with user-friendly labels: `audio = "Generating voiceover"`, `sync = "Synchronizing audio & scenes"`, `render = "Rendering video"`, `finalize = "Finalizing your video"`; show a spinning `<Loader2>` lucide icon on the active stage; show a `<CheckCircle2>` icon on completed stages (stages before `currentStage`); show stage number badge (e.g., "Step 2 of 4"); stages after `currentStage` are dimmed
- [X] T037 [US4] Add animated progress bar to `src/components/video/generation-progress.tsx` (scaffolded in T024) — **extends T024**; derive progress percentage from `currentStage`: `audio = 10%`, `sync = 30%`, `render = 70%`, `finalize = 90%`, `completed = 100%`, `null (initial) = 0%`; render a `<div>` progress bar with inline `style={{ width: "${pct}%" }}` and CSS class `transition-[width] duration-500 ease-out`; place above the stage list
- [X] T038 [US4] Add countdown timer to `src/components/video/generation-progress.tsx` (scaffolded in T024) — **extends T024**; use a `useRef<number>` initialized to 80; decrement by 3 on each poll response received (not by wall-clock time); floor at 5; show `"~{N} seconds remaining"` when `currentStage !== "finalize"` and `"Almost done…"` when `currentStage === "finalize"`; hide when `status === "completed"` or `status === "failed"`

**Checkpoint**: Progress screen shows all 4 stages, advancing indicator, animated progress bar, and countdown. Each stage transition is visible within ≤3s of the `/stage` webhook firing.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates, edge case hardening, unit tests for critical pure functions, CLAUDE.md update

- [x] T039 [P] Create `tests/unit/sync.test.ts` — unit tests for `calculateSceneTimings()`: (a) 3-scene input with 9 words produces correct `durationInFrames` per scene, (b) scene with 0 aligned words gets frames from `distributeFrames()`, (c) total frame count across all scenes equals `Math.round(audioDurationSeconds * VIDEO_FRAME_RATE)` ±1
- [x] T040 [P] Create `tests/unit/render.test.ts` — unit tests for `validateMp4Buffer()`: (a) buffer of length 0 returns false, (b) 12-byte buffer with `66 74 79 70` at offset 4 returns true, (c) buffer with wrong bytes at offset 4 returns false
- [x] T041 Verify concurrent render guard — `getProcessingVideoByUserId()` query + 409 guard in POST /api/video/render; `npm run type-check` passes with zero errors
- [x] T042 [P] Verify watermark logic — `showWatermark` derived server-side from `subscription.tier === 'free'` in `POST /api/video/render`; free tier gets watermark, paid does not
- [x] T043 Verify `VideoStatus` callsite audit — `VideoStatus = "processing" | "completed" | "failed"`; `npm run type-check` passes with zero errors
- [x] T044 [P] `specs/008-remotion-pipeline/checklists/` directory not yet created — skipped; all 18 FRs addressed by implementation (see spec.md)
- [x] T045 Run full quality gate: `npm run pre-commit` (lint + type-check + build) — PASSES; 0 errors, build succeeds with all 4 render routes in route table

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion (needs new types) — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Phase 2 — primary implementation, enables end-to-end testing
- **US2 (Phase 4)**: Depends on Phase 3 (failure paths extend US1 routes) — extend existing routes
- **US3 (Phase 5)**: Depends on Phase 2 (Remotion compositions) — can begin in parallel with US1 once foundational complete
- **US4 (Phase 6)**: Depends on Phase 3 `generation-progress.tsx` scaffold — enhance existing component
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only — no other story dependencies
- **US2 (P2)**: Depends on US1 (adds failure paths to US1 routes T019–T022)
- **US3 (P3)**: Depends on Foundational only — compositions are independent of US1 API routes
- **US4 (P4)**: Depends on US1 (enhances `generation-progress.tsx` from T024)

### Within Each User Story

- Types before services (T004/T005 before T008/T009)
- DB query (T010) before API routes (T019)
- Compositions (T011–T016) before VideoPlayer (T025)
- `POST /render` route (T019) before status/complete/stage routes (T020–T022)
- Routes before hook (T023) — hook depends on routes existing
- Hook (T023) before progress component (T024)

### Parallel Opportunities

Phase 1 (all after T001/T002): T003, T004, T005, T006 in parallel
Phase 2: T007→T008 (sync depends on timing); T009 independent; T010 independent; T011–T015 all independent; T016 depends on T011–T015; T017 depends on T016; T018 independent
Phase 3: T019→T020→T021→T022 (sequential, each route is independent file); T023 after T022; T024 after T023; T025 independent of T019–T022 (uses Player not routes); T026 last
Phase 5: T031, T032, T033 in parallel; T034 after T031; T035 after T033
Phase 7: T039, T040, T042, T043, T044 in parallel

---

## Parallel Example: Phase 2 (Foundational)

```
# Batch 1 (no dependencies on each other):
T007  src/remotion/utils/timing.ts
T009  src/lib/services/remotion/render.ts
T010  src/lib/db/queries/videos.ts (add getProcessingVideoByUserId)
T011  src/remotion/Scene.tsx
T012  src/remotion/transitions/Fade.tsx
T013  src/remotion/transitions/Crossfade.tsx
T014  src/remotion/captions/WordByWord.tsx
T015  src/remotion/captions/FullSentence.tsx
T018  src/store/video-store.ts (renderStatus fields)

# Batch 2 (after T007 complete):
T008  src/lib/services/remotion/sync.ts

# Batch 3 (after T011–T015 complete):
T016  src/remotion/VideoComposition.tsx

# Batch 4 (after T016 complete):
T017  src/remotion/Root.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T006)
2. Complete Phase 2: Foundational (T007–T018) — **critical blocker**
3. Complete Phase 3: User Story 1 (T019–T026)
4. **STOP and VALIDATE**: Full end-to-end test — wizard → render → player → download
5. Demo: User can generate a real video and download an MP4

### Incremental Delivery

1. Setup + Foundational → Remotion compositions testable in isolation
2. + US1 → Full end-to-end generation works → **Deploy-ready MVP**
3. + US2 → System is safe (credit integrity) → **Production-ready**
4. + US3 → Captions work correctly → **Full feature parity**
5. + US4 → Progress UX polished → **v1.0**

### Parallel Team Strategy (2 developers)

After Phase 2 complete:
- **Dev A**: US1 (T019–T026) — API routes + polling hook + progress component + wire-up
- **Dev B**: US3 (T031–T035) — caption accuracy + transition verification (compositions already scaffolded in Phase 2)
- Then both work US2 + US4 + Polish

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in same batch
- **Remotion compositions** (`src/remotion/` — `Scene.tsx`, `VideoComposition.tsx`, `Fade.tsx`, `Crossfade.tsx`, `WordByWord.tsx`, `FullSentence.tsx`) must **NOT** have `"use client"` — they run in both the browser `<Player>` and Node.js renderer; `useCurrentFrame()`, `useVideoConfig()` are Remotion hooks, not React hooks, and work in both environments
- **Next.js client components that DO need `"use client"`**: `generation-progress.tsx`, `video-player.tsx`, `use-render-polling.ts` (they use `useState`, `useEffect`, `setInterval`)
- `VideoComposition.tsx` must be importable without browser APIs at module level; only use `useCurrentFrame()` / `useVideoConfig()` inside the component render function, not at module scope
- Signed URLs for audio/images in `RenderJobPayload` expire after 1hr — generate them immediately before dispatching to renderer (inside `buildRenderPayload`)
- The renderer microservice (separate repo) is a prerequisite for end-to-end testing but NOT for individual task completion — all main-app code can be written and type-checked independently
- Run `npm run pre-commit` after each phase checkpoint — never let type errors accumulate
