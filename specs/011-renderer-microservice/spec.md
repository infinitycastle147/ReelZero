# Feature Specification: Renderer Microservice (F011)

**Feature Branch**: `011-renderer-microservice`
**Created**: 2026-02-14
**Status**: Draft
**Input**: User description: "F011 from docs/features.md. Plan this feature properly and precisely. As this is the core functionality of the application it must be properly implemented, precisely accurate and efficient. Efficient use of the remotion library. Proper follow docs of remotion. Rather than implementing manually, mostly things will be provided by the remotion library only."

---

## Overview

The Renderer Microservice is the rendering backend for ReelZero. It is a standalone Express server that lives at `renderer/` in the monorepo but is deployed independently to Render.com as a Docker container. It receives render job payloads from the main Next.js app, downloads scene assets from Supabase Storage, uses `@remotion/bundler` + `@remotion/renderer` to render a 9:16 MP4 (1080×1920 @ 30fps), uploads the result to Supabase Storage, and fires a completion callback to the main app.

The Remotion compositions already exist in `src/remotion/` (F008). The renderer copies and uses them directly — it does **not** reimplement any animation or composition logic.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Submit and Complete a Render Job (Priority: P1)

A user in the main app has completed the video wizard and clicked "Generate Video". The main app dispatches a `POST /render` request to the renderer microservice with a `RenderJobPayload` (image URLs, audio URL, word timings, caption style, transition type). The microservice accepts it, processes it asynchronously, uploads the final MP4, and POSTs the result back to the main app's callback URL.

**Why this priority**: This is the entire reason the microservice exists — without successful end-to-end rendering, no video is ever produced. All other stories are operational concerns around this core flow.

**Independent Test**: Send a valid `RenderJobPayload` to `POST /render` via curl or Postman; the job is acknowledged immediately with a `202 { jobId }` response; within a reasonable time the main app's mock callback URL receives a POST with `{ videoId, status: "completed", outputUrl, fileSizeBytes, durationSeconds }` and the MP4 can be downloaded from the `outputUrl`.

**Acceptance Scenarios**:

1. **Given** the renderer is running and has valid env vars, **When** a `POST /render` with a valid `RenderJobPayload` and `x-render-secret` header is sent, **Then** the service returns HTTP `202` with `{ jobId: "<uuid>" }` within 300ms.
2. **Given** a valid job has been accepted, **When** the async pipeline completes successfully, **Then** a `POST` to `callbackUrl` is made with `{ videoId, status: "completed", outputUrl, fileSizeBytes, durationSeconds }` and the video is accessible at `outputUrl`.
3. **Given** a valid job has been accepted, **When** any step in the async pipeline fails, **Then** a `POST` to `callbackUrl` is made with `{ videoId, status: "failed", error: "<message>" }` within a reasonable timeout.
4. **Given** a render job for a free-tier user with `showWatermark: true`, **When** rendering completes, **Then** the output MP4 contains the ReelZero watermark overlay in the bottom-right corner of every frame.
5. **Given** a job payload with `captionStyle: "word-by-word"`, **When** rendering completes, **Then** captions appear word-by-word in sync with the audio, using the word-frame timings from the payload.
6. **Given** a job payload with `transitionType: "crossfade"`, **When** rendering completes, **Then** adjacent scenes blend via a 15-frame crossfade; `transitionType: "fade"` produces a fade-to-black at scene boundaries.

---

### User Story 2 — Poll Job Status During Rendering (Priority: P2)

The main app polls `GET /status/:jobId` at regular intervals to display a progress indicator to the user (the "Generating Video…" screen with stage labels: download → bundle → render → upload).

**Why this priority**: Without progress visibility, the user-facing generation screen stalls and appears broken. The poll endpoint is lightweight but essential for UX.

**Independent Test**: After sending a valid `POST /render`, immediately poll `GET /status/:jobId` in a loop; responses should transition through `queued → processing → completed` (or `failed`) with `stage` field reflecting the current pipeline step and `progress` incrementing.

**Acceptance Scenarios**:

1. **Given** a job has just been accepted, **When** `GET /status/:jobId` is called immediately, **Then** response is `{ jobId, status: "queued", stage: "queued", progress: 0 }`.
2. **Given** a job is in the `render` stage, **When** `GET /status/:jobId` is called, **Then** `status` is `"processing"`, `stage` is `"render"`, and `progress` is a numeric percentage between 0 and 100.
3. **Given** a job has completed, **When** `GET /status/:jobId` is called, **Then** `status` is `"completed"` and `progress` is `100`.
4. **Given** an unknown `jobId`, **When** `GET /status/:jobId` is called, **Then** response is HTTP `404`.

---

### User Story 3 — Health Check for Deployment Monitoring (Priority: P3)

Render.com and DevOps tooling calls `GET /health` to verify the service is alive before routing traffic and during rolling deployments.

**Why this priority**: Operational necessity; the Docker service is pointless if Render.com cannot determine liveness.

**Independent Test**: `curl https://<renderer-url>/health` returns HTTP `200` with `{ status: "ok", timestamp: "<ISO>" }` with no auth required.

**Acceptance Scenarios**:

1. **Given** the service is running, **When** `GET /health` is called without any auth header, **Then** HTTP `200` with `{ status: "ok", timestamp: "<ISO-8601>" }` is returned within 100ms.
2. **Given** the service is starting up before processing any jobs, **When** `GET /health` is called, **Then** it still returns `200` (no dependency on job state).

---

### Edge Cases

- **Malformed payload**: `POST /render` with a payload that fails Zod validation returns HTTP `422` with a descriptive error; the job is not enqueued.
- **Missing or wrong `x-render-secret`**: Any protected endpoint called without the correct secret returns HTTP `401`; no work is performed.
- **Asset download failure**: If a signed Supabase URL has expired or is unreachable, the job transitions to `failed` and the failure callback fires with a clear error message.
- **Render process crash**: If the Remotion renderer throws an unhandled error (OOM, Chromium crash), the job is marked `failed` and the callback fires — the job never hangs indefinitely.
- **Duplicate `jobId`**: If the same `jobId` is submitted twice (retry from main app), the second request receives HTTP `409` and the existing job is not re-queued.
- **Large video**: A 5-scene video with full narration at 30fps can be up to 1800 frames (60 s). The service must handle this without crashing.
- **Supabase upload failure after successful render**: The service retries the upload up to 3 times before firing the failure callback; the local rendered MP4 is not deleted until upload succeeds or retries are exhausted.
- **Container restart with in-flight jobs**: Jobs tracked in-memory are lost on restart; acceptable for MVP — no persistent job queue required.

---

## Requirements *(mandatory)*

### Functional Requirements

**Core API**

- **FR-001**: The service MUST expose `POST /render`, `GET /status/:jobId`, and `GET /health` on the configured `PORT` (default `3001`).
- **FR-002**: `POST /render` MUST validate the `x-render-secret` header against the `RENDER_WEBHOOK_SECRET` env var; requests with missing or incorrect secrets MUST be rejected with HTTP `401`.
- **FR-003**: `POST /render` MUST validate the request body against the `RenderJobPayload` schema (matching `specs/008-remotion-pipeline/contracts/render-job.json`) using Zod; invalid payloads MUST return HTTP `422` with a human-readable validation error.
- **FR-004**: `POST /render` MUST return HTTP `202 { jobId }` immediately (within 300ms) and process the render job asynchronously in the background.
- **FR-005**: If the same `videoId` already exists in the job map (i.e., a job for this video is already queued or processing), `POST /render` MUST return HTTP `409` and not re-queue the job. Note: `jobId` is always freshly generated by the renderer; the deduplication key is `videoId` from the payload.
- **FR-006**: `GET /status/:jobId` MUST return `{ jobId, status, stage, progress }` where `status ∈ { "queued", "processing", "completed", "failed" }` and `stage ∈ { "queued", "download", "bundle", "render", "upload", "done" }`.
- **FR-007**: `GET /status/:jobId` for an unknown job MUST return HTTP `404`.
- **FR-008**: `GET /health` MUST be accessible without any authentication header and MUST return HTTP `200 { status: "ok", timestamp }`.

**Asset Pipeline**

- **FR-009**: The service MUST download each scene's `imageUrl` (signed Supabase URL, 1080×1920) and the `audioUrl` (MP3) to a local temp directory (`REMOTION_OUTPUT_DIR`) before rendering starts.
- **FR-010**: Asset downloads MUST implement retry with exponential backoff (up to 3 attempts) to handle transient network errors.
- **FR-011**: Downloaded assets and the rendered MP4 MUST be cleaned up from disk after the job completes or fails, regardless of outcome.

**Remotion Rendering — Correct and Efficient Library Use**

- **FR-012**: The service MUST use `@remotion/bundler` (`bundle()`) to create a Webpack bundle of the Remotion compositions. The bundle entry point MUST be `renderer/src/remotion/Root.tsx`.
- **FR-013**: The service MUST use `@remotion/renderer`: first call `selectComposition({ serveUrl, id: "VideoComposition", inputProps })` to obtain the composition object, then pass it as the `composition` argument to `renderMedia()` with `codec: "h264"` to render the MP4.
- **FR-014**: `renderMedia()` MUST receive the full `VideoCompositionProps` as `inputProps`: `audioUrl` (local `file://` path), `scenes`, `captionStyle`, `transitionType`, `showWatermark`. The `durationInFrames` passed to `renderMedia()` MUST be the sum of all scene `durationInFrames` values.
- **FR-015**: The service MUST pass an `onProgress` callback to `renderMedia()` to update the job's `progress` field (0–100) in the in-memory job map, so `GET /status/:jobId` reflects real-time rendering progress.
- **FR-016**: Rendering MUST use the `REMOTION_CONCURRENCY` env var (default: `2`) as the `concurrency` option for `renderMedia()`.
- **FR-017**: The service MUST NOT reimplement any animation logic (Ken Burns, Fade, Crossfade, WordByWord, FullSentence, Watermark). All visual output is produced by the shared Remotion compositions copied from `src/remotion/`.
- **FR-018**: The output MP4 MUST be written to `{REMOTION_OUTPUT_DIR}/{jobId}/output.mp4` (inside a per-job subdirectory) before upload to Supabase. All downloaded assets for the same job also live in this subdirectory, making cleanup atomic.

**Stage Callbacks to Main App**

- **FR-019**: The service MUST POST stage-update notifications to `stageCallbackUrl` (a separate field in `RenderJobPayload`, distinct from `callbackUrl`) at each pipeline transition. The body is `{ videoId, stage }` where `stage` maps to F008's `RenderStage` type: `"sync"` (during asset download), `"render"` (during Remotion rendering), `"finalize"` (during Supabase upload). These are fire-and-forget and MUST NOT block the pipeline.
- **FR-020**: On successful completion, the service MUST POST `{ videoId, status: "completed", outputUrl, fileSizeBytes, durationSeconds }` to `callbackUrl`.
- **FR-021**: On any unrecoverable failure, the service MUST POST `{ videoId, status: "failed", error: "<message>" }` to `callbackUrl`.
- **FR-022**: Supabase MP4 upload MUST be retried up to 3 times before triggering the failure callback.

**Security**

- **FR-023**: All endpoints except `GET /health` MUST require the `x-render-secret` header matching `RENDER_WEBHOOK_SECRET`.
- **FR-024**: The Dockerfile and `render.yaml` MUST NOT expose any secrets as build-time args or in image layers; all secrets are injected at runtime via environment variables.

**Infrastructure**

- **FR-025**: `renderer/Dockerfile` MUST use `node:20-slim`, install `ffmpeg` and `chromium` via apt, set `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`, run `npm ci --only=production`, and `EXPOSE 3001`.
- **FR-026**: `renderer/render.yaml` MUST declare `type: web`, `runtime: docker`, `healthCheckPath: /health`, and all required env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `RENDER_WEBHOOK_SECRET`, `MAIN_APP_URL`, `PORT`, `REMOTION_CONCURRENCY`, `REMOTION_OUTPUT_DIR`.
- **FR-027**: `renderer/` MUST have its own `package.json`, `tsconfig.json`, and `node_modules` — independent from the main Next.js app. Dependencies MUST include `express`, `zod`, `@supabase/supabase-js`, `remotion`, `@remotion/bundler`, `@remotion/renderer`.
- **FR-028**: The service MUST start with `npm run dev` (using `tsx` for local development) and `npm start` (compiled JS) in production.

### Key Entities

- **RenderJob**: An in-flight or completed render job. Attributes: `jobId` (UUID), `videoId` (UUID), `status` (`queued | processing | completed | failed`), `stage` (current pipeline step), `progress` (0–100), `createdAt`, `error?`. Stored in-memory only — no persistent store for MVP.
- **RenderJobPayload**: The inbound contract from the main app, defined in `src/types/render.ts`. Key fields: `videoId`, `userId`, `audioUrl`, `scenes[]` (with `imageUrl`, `durationInFrames`, `startFrame`, `wordTimings[]`), `captionStyle`, `transitionType`, `showWatermark`, `callbackUrl` (POST target for completion), `stageCallbackUrl` (POST target for stage updates — a separate field, not derived from `callbackUrl`).
- **VideoCompositionProps**: Props passed to the Remotion `VideoComposition` component (shared type from `src/types/remotion.ts`). The renderer maps `RenderJobPayload` → `VideoCompositionProps` before calling `renderMedia()`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A valid render job for a 3-scene, 30-second video completes the full pipeline (download → bundle → render → upload → callback) within 5 minutes on the deployed Render.com instance.
- **SC-002**: `POST /render` responds with HTTP `202` within 300ms for any valid payload, regardless of how many jobs are queued.
- **SC-003**: `GET /health` responds within 100ms at all times, including during active rendering.
- **SC-004**: Render jobs that fail at any stage fire the failure callback within 30 seconds of the error — no job hangs indefinitely.
- **SC-005**: The rendered MP4 plays correctly in a standard video player: audio is in sync with captions, scene transitions are smooth, watermark appears on free-tier videos.
- **SC-006**: All 6 combinations of `captionStyle × transitionType` (`word-by-word | full-sentence | none` × `fade | crossfade`) render correctly without visual artifacts.
- **SC-007**: `GET /status/:jobId` returns a monotonically increasing `progress` value (0–100) across successive polls during an active render.
- **SC-008**: The Docker image builds successfully and the container starts and passes the `/health` check within 30 seconds of container start.
- **SC-009**: A request with a missing or incorrect `x-render-secret` header is rejected with HTTP `401` and no rendering work begins.
- **SC-010**: A 5-scene, 60-second video (1800 frames) renders to completion without process crash or OOM error.

---

## Dependencies & Assumptions

### Dependencies

- **F008 (Remotion Rendering Pipeline)**: Remotion compositions (`src/remotion/`) are stable and correct. The renderer copies them to `renderer/src/remotion/` verbatim.
- **F007 (Video Generation Wizard)**: Produces the `RenderJobPayload` dispatched by the main app's `POST /api/video/render` route.
- **Supabase Storage**: `images`, `audio`, and `videos` buckets exist and the Supabase service-role key has read/write access.
- **Render.com**: Docker deployment target with sufficient RAM for Chromium (minimum 1 GB recommended).

### Assumptions

- The main app already has the callback routes `POST /api/video/render/complete` and `POST /api/video/render/stage` implemented (F008).
- Signed Supabase URLs in the payload have at least 1-hour expiry — long enough to survive asset download before rendering starts.
- The Remotion package version in `renderer/package.json` MUST match the version installed in the main app to avoid composition incompatibilities.
- `ffmpeg` and `chromium` installed via apt in the Docker image are compatible with the installed Remotion version's headless rendering requirements.
- In-memory job storage (a `Map<jobId, RenderJob>`) is acceptable for MVP; no Redis or persistent queue is required.
- The service runs as a single instance on Render.com for MVP; concurrent render jobs share the same process using Remotion's built-in `concurrency` option.
- The `renderer/src/remotion/` directory is a copy of `src/remotion/` (not a symlink), since the renderer is a fully independent Node.js service without access to the main app's TypeScript path aliases (`@/`).
- Path aliases in the copied compositions (`@/types/remotion`, `@/lib/constants/video`, etc.) MUST be resolved by configuring `"paths": { "@/*": ["./src/*"] }` in the renderer's `tsconfig.json`, pointing `@/` to `renderer/src/` where the copied types and constants live.
