# Tasks: Renderer Microservice (F011)

**Input**: Design documents from `specs/011-renderer-microservice/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/api-routes.md ✅ quickstart.md ✅

**Tests**: Not explicitly requested in spec — no test tasks generated.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

---

## Phase 1: Setup (Scaffold `renderer/` Project)

**Purpose**: Create the standalone `renderer/` project structure, package manifests, config files, and populate all shared source files copied from the main app.

- [x] T001 Create `renderer/` directory structure: `src/routes/`, `src/services/`, `src/middleware/`, `src/types/`, `src/remotion/`, `src/lib/constants/`, `scripts/` per plan.md
- [x] T002 Create `renderer/package.json` with dependencies: `express ^4`, `zod ^3`, `remotion ^4.0.421`, `@remotion/bundler ^4.0.421`, `@remotion/renderer ^4.0.421`, `@supabase/supabase-js ^2`; devDependencies: `tsx`, `typescript`, `tsc-alias`, `@types/express`, `@types/node`; scripts: `dev` (tsx), `build` (tsc + tsc-alias), `start` (node dist/index.js)
- [x] T003 [P] Create `renderer/tsconfig.json` with `strict: true`, `module: "commonjs"`, `outDir: "dist"`, `paths: { "@/*": ["./src/*"] }`, `include: ["src"]`
- [x] T004 [P] Create `renderer/.env.example` with all required variables: `PORT=3001`, `RENDER_WEBHOOK_SECRET=`, `SUPABASE_URL=`, `SUPABASE_SERVICE_KEY=`, `MAIN_APP_URL=`, `REMOTION_CONCURRENCY=2`, `REMOTION_OUTPUT_DIR=/tmp/renders`, `PUPPETEER_EXECUTABLE_PATH=`
- [x] T005 Create `renderer/scripts/sync-files.sh` — bash script to copy `src/remotion/` → `renderer/src/remotion/`, `src/types/remotion.ts|render.ts|scene.ts` → `renderer/src/types/`, `src/lib/constants/video.ts` → `renderer/src/lib/constants/video.ts`
- [x] T006 Run `renderer/scripts/sync-files.sh` from monorepo root to populate all copied files in `renderer/src/remotion/`, `renderer/src/types/`, `renderer/src/lib/constants/`
- [x] T007 Add `"renderer:sync-files": "bash renderer/scripts/sync-files.sh"` script to root `package.json`
- [x] T008 Run `npm install` inside `renderer/` to install all dependencies

**Checkpoint**: `renderer/` project is fully scaffolded. `renderer/src/remotion/Root.tsx`, `VideoComposition.tsx`, and all composition files are present. `npm install` succeeds.

---

## Phase 2: Foundational (Core Services — Blocking Prerequisites)

**Purpose**: Shared infrastructure that ALL three user stories depend on. Job map, Remotion bundler/renderer, Supabase storage, asset downloader, callbacks — all foundational for the async pipeline.

**⚠️ CRITICAL**: No user story routes can function until this phase is complete.

- [x] T009 Create `renderer/src/services/job-map.ts` — export `RenderJob` TypeScript type (`jobId`, `videoId`, `userId`, `status: "queued"|"processing"|"completed"|"failed"`, `stage: "queued"|"download"|"bundle"|"render"|"upload"|"done"`, `progress: number`, `createdAt: Date`, `completedAt?: Date`, `error?: string`); export module-level `Map<string, RenderJob>` as `jobMap`; export `createJob(jobId, videoId, userId): RenderJob`, `updateJob(jobId, partial: Partial<RenderJob>): void`, `getJob(jobId): RenderJob | undefined`
- [x] T010 [P] Create `renderer/src/services/assets.ts` — export `downloadFile(url: string, destPath: string, maxRetries?: number): Promise<void>` using native `fetch` with exponential backoff retry (500ms, 1s, 2s); export `ensureJobDir(jobId: string): Promise<string>` creates `{REMOTION_OUTPUT_DIR}/{jobId}/`; export `cleanupJobDir(jobId: string): Promise<void>` deletes the job temp dir with `fs.rm`
- [x] T011 [P] Create `renderer/src/services/storage.ts` — initialize Supabase client with `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (service role); export `uploadMp4(userId: string, videoId: string, filePath: string): Promise<string>` that uploads to `videos/{userId}/{videoId}.mp4` with `contentType: "video/mp4"`, `upsert: true`, retries up to 3 times on error, returns a 1-hour signed URL string
- [x] T012 [P] Create `renderer/src/services/callbacks.ts` — export `fireStageCallback(stageCallbackUrl: string, videoId: string, stage: "sync"|"render"|"finalize"): void` (fire-and-forget `fetch` POST, no `await`, errors silently logged); export `fireCompletionCallback(callbackUrl: string, payload: RenderCompleteCallback): Promise<void>` (awaited, retries once on failure, logs error)
- [x] T013 Create `renderer/src/services/remotion.ts` — module-level `let serveUrl: string | null = null`; export `getServeUrl(): Promise<string>` that calls `bundle({ entryPoint: path.resolve(__dirname, '../remotion/Root.tsx') })` on first call and caches result; export `renderComposition(jobId: string, inputProps: VideoCompositionProps, totalFrames: number, outputPath: string): Promise<void>` that calls `selectComposition({ serveUrl, id: "VideoComposition", inputProps })` then `renderMedia({ composition, serveUrl, codec: "h264", outputLocation: outputPath, inputProps, durationInFrames: totalFrames, concurrency: Number(process.env.REMOTION_CONCURRENCY ?? "2"), chromiumOptions: { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, gl: "swiftshader" }, onProgress: ({ progress }) => updateJob(jobId, { progress: Math.round(progress * 100) }) })`
- [x] T014 Create `renderer/src/services/pipeline.ts` — export `processJob(jobId: string, payload: RenderJobPayload): Promise<void>` that: (1) updates job to `processing/download`, fires stage callback `"sync"`, downloads audio to `{jobDir}/audio.mp3` and each scene image to `{jobDir}/scene-{n}.jpg`; (2) updates job to `processing/bundle`, calls `getServeUrl()`; (3) updates job to `processing/render`, fires stage callback `"render"`, builds `VideoCompositionProps` with `audioUrl: "file://{jobDir}/audio.mp3"`, wraps `renderComposition()` in `Promise.race([renderComposition(...), new Promise((_, reject) => setTimeout(() => reject(new Error("Render timeout after 10 minutes")), 10 * 60 * 1000))])` to satisfy SC-004; (4) updates job to `processing/upload`, fires stage callback `"finalize"`, calls `uploadMp4()` to get `outputUrl`; (5) updates job to `completed/done/progress:100`, fires `fireCompletionCallback` with `{ videoId, status: "completed", outputUrl, fileSizeBytes, durationSeconds }`; (6) calls `cleanupJobDir()`; catches ALL errors → updates job to `failed`, fires `fireCompletionCallback` with `{ videoId, status: "failed", error }`, calls `cleanupJobDir()` in `finally`

**Checkpoint**: All core services are implemented. `processJob()` can be called directly to test the full pipeline end-to-end without the HTTP layer.

---

## Phase 3: User Story 1 — Submit and Complete a Render Job (Priority: P1) 🎯 MVP

**Goal**: `POST /render` accepts a valid job, returns `202 { jobId }` immediately, and processes it asynchronously through the full pipeline to completion with callbacks.

**Independent Test**: `curl -X POST http://localhost:3001/render -H "x-render-secret: dev-secret" -H "Content-Type: application/json" -d '<valid payload>'` → returns `202 { jobId }` within 300ms; the main app receives a `POST` to its `callbackUrl` with `{ status: "completed", outputUrl }` and the MP4 is downloadable.

### Implementation for User Story 1

- [x] T015 [US1] Create `renderer/src/middleware/validate-secret.ts` — export Express `RequestHandler` `validateSecret` that checks `req.headers["x-render-secret"] === process.env.RENDER_WEBHOOK_SECRET`; returns `res.status(401).json({ error: "Unauthorized" })` on mismatch; calls `next()` on match
- [x] T016 [US1] Create `renderer/src/middleware/validate-payload.ts` — define Zod schema `renderJobSchema` matching `RenderJobPayload` type: `videoId` (string uuid), `userId` (string), `audioUrl` (url), `scenes` (array min 3 max 5 with `sceneNumber`, `imageUrl`, `durationInFrames`, `startFrame`, `wordTimings`), `captionStyle` (enum), `transitionType` (enum), `showWatermark` (boolean), `callbackUrl` (url), `stageCallbackUrl` (url); export `validatePayload` middleware that runs `renderJobSchema.safeParse(req.body)` and returns `422 { error: "Validation failed", details }` on failure
- [x] T017 [US1] Create `renderer/src/routes/render.ts` — `POST /render` route: apply `validateSecret` and `validatePayload` middleware; check if `payload.videoId` already exists in `jobMap` → return `409 { error: "Job with this videoId already exists", jobId }`; generate `jobId = crypto.randomUUID()`; call `createJob(jobId, videoId, userId)`; send `res.status(202).json({ jobId })`; then `processJob(jobId, payload).catch(...)` fire-and-forget
- [x] T018 [US1] Create `renderer/src/routes/health.ts` — `GET /health` route (no auth): returns `res.json({ status: "ok", timestamp: new Date().toISOString() })`
- [x] T019 [US1] Create `renderer/src/index.ts` — create Express app; add `express.json()` body parser; register `/health` route (no secret middleware); register `/render` and `/status` routes with router; `app.listen(PORT, ...)` with startup log; handle `process.on("SIGTERM", () => server.close(() => process.exit(0)))`
- [ ] T020 [US1] Verify end-to-end US1: run `npm run dev` inside `renderer/`; `curl http://localhost:3001/health` returns `{"status":"ok",...}`; send `POST /render` with a valid `RenderJobPayload` (real Supabase signed URLs); confirm `202` response; confirm pipeline completes and callback fires; confirm MP4 in Supabase `videos` bucket; run once per each of the 6 `captionStyle × transitionType` combinations (`word-by-word|full-sentence|none` × `fade|crossfade`) to satisfy SC-006 — confirm no visual artifacts in any combination

**Checkpoint**: User Story 1 fully functional. `POST /render` → async pipeline → completion callback → MP4 in Supabase.

---

## Phase 4: User Story 2 — Poll Job Status During Rendering (Priority: P2)

**Goal**: `GET /status/:jobId` returns real-time job state (`queued → processing/render/progress:42 → completed/100`) so the main app can display a live progress bar.

**Independent Test**: After `POST /render`, immediately and repeatedly call `GET /status/{jobId}` with `x-render-secret`; observe `stage` and `progress` updating from `queued → download → render (0→100) → done`; after completion observe `status: "completed"`, `progress: 100`; call with unknown `jobId` → `404`.

### Implementation for User Story 2

- [x] T021 [US2] Create `renderer/src/routes/status.ts` — `GET /status/:jobId` route: apply `validateSecret` middleware; look up `getJob(req.params.jobId)`; if not found → `res.status(404).json({ error: "Job not found" })`; otherwise → `res.json({ jobId, videoId, status, stage, progress })` (omit `error` field unless `status === "failed"`)
- [x] T022 [US2] Register `GET /status/:jobId` route in `renderer/src/index.ts` under the same router as `/render`
- [ ] T023 [US2] Verify end-to-end US2: start a render job; in a separate terminal, poll `GET /status/{jobId}` every 2 seconds; confirm `progress` increments during the `render` stage (Remotion `onProgress` is wired to `updateJob`); confirm final state is `{ status: "completed", stage: "done", progress: 100 }`; confirm `GET /status/unknown-id` returns `404`

**Checkpoint**: User Stories 1 AND 2 fully functional. Live progress polling works alongside the render pipeline.

---

## Phase 5: User Story 3 — Health Check for Deployment Monitoring (Priority: P3)

**Goal**: `GET /health` responds in <100ms with `{ status: "ok", timestamp }` without any authentication, allowing Render.com liveness probes and monitoring tools to work.

**Independent Test**: `curl http://localhost:3001/health` (no `x-render-secret` header) → HTTP `200` `{"status":"ok","timestamp":"..."}` in <100ms; also verify it returns `200` while a render is actively in progress (health check not blocked by render work).

### Implementation for User Story 3

> **Note**: `GET /health` route was already implemented in T018 as part of the Express server setup. This phase validates and hardens it.

- [x] T024 [US3] Confirm `GET /health` is mounted in `renderer/src/index.ts` BEFORE the `validateSecret` middleware chain, so it requires no `x-render-secret` header (it must be directly on `app.get("/health", ...)`, not behind the authenticated router)
- [ ] T025 [US3] Verify US3 acceptance criteria: `curl http://localhost:3001/health` with no headers → `200 {"status":"ok","timestamp":"..."}` in <100ms; start a render job and simultaneously curl `/health` multiple times — confirm it always returns `200` without blocking

**Checkpoint**: All three user stories independently functional. Full API surface is live.

---

## Phase 6: Docker + Render.com Deployment

**Purpose**: Package the renderer as a Docker image and configure Render.com deployment. Required to deliver the complete deliverable from spec.md.

- [x] T026 Create `renderer/Dockerfile` — `FROM node:20-slim`; `RUN apt-get update && apt-get install -y ffmpeg chromium fonts-noto --no-install-recommends && rm -rf /var/lib/apt/lists/*`; `ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`; set `WORKDIR /app`; `COPY renderer/package*.json ./`; `RUN npm ci --only=production`; `COPY renderer/dist ./dist`; `EXPOSE 3001`; `CMD ["node", "dist/index.js"]`
- [x] T027 Add `renderer:build` script to `renderer/package.json`: `"build": "tsc && tsc-alias"` — compile TypeScript to `renderer/dist/`; verify `npm run build` succeeds inside `renderer/`
- [x] T028 [P] Create `renderer/render.yaml` — Render.com web service config: `type: web`, `name: reelzero-renderer`, `runtime: docker`, `dockerfilePath: ./renderer/Dockerfile`, `dockerContext: .` (monorepo root), `healthCheckPath: /health`; envVars: `PORT=3001`, `REMOTION_CONCURRENCY=2`, `REMOTION_OUTPUT_DIR=/tmp/renders` (with values); `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `RENDER_WEBHOOK_SECRET`, `MAIN_APP_URL` (all with `sync: false`)
- [ ] T029 Test Docker build locally: from monorepo root run `docker build -f renderer/Dockerfile -t reelzero-renderer .`; confirm image builds successfully; note the start time, then run `docker run -p 3001:3001 --env-file renderer/.env reelzero-renderer`; poll `curl http://localhost:3001/health` every 2 seconds — confirm it returns `200` within 30 seconds of container start (SC-008); confirm startup time is logged in the terminal
- [ ] T030 Deploy to Render.com: push `render.yaml` to repo; connect Render.com to the repository; set secret env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `RENDER_WEBHOOK_SECRET`, `MAIN_APP_URL`) in Render.com dashboard; confirm Render.com health check passes and service is `Live`

**Checkpoint**: Docker image builds, passes health check, and deploys to Render.com. Service URL is available.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end integration, main app wiring, and documentation.

- [ ] T031 Set `RENDERER_SERVICE_URL=https://<render-com-url>` in main app's Vercel environment variables (and local `.env.local` for dev)
- [ ] T032 [P] Full end-to-end integration test: complete the video wizard in the browser (dev or staging), click "Generate Video", observe the generation progress screen cycle through `audio → sync → render → finalize` stages, confirm the video appears in the dashboard with a working Remotion Player preview and download button
- [ ] T033 [P] Update `CLAUDE.md` / docs with F011 implementation notes: Remotion bundle cache pattern, `gl: "swiftshader"` requirement, shared file copy strategy, Render.com tier recommendation
- [ ] T034 Validate all quickstart.md steps work end-to-end (local dev + Docker) as documented in `specs/011-renderer-microservice/quickstart.md`

**Checkpoint**: Full end-to-end video generation works from wizard to dashboard. F011 complete.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user story phases
- **Phase 3 (US1 — Render Job)**: Depends on Phase 2 — this is the MVP; includes HTTP layer
- **Phase 4 (US2 — Status Poll)**: Depends on Phase 2; independent of Phase 3 (uses `jobMap` directly); can be developed in parallel with Phase 3
- **Phase 5 (US3 — Health Check)**: Depends on Phase 3 (health route is in `index.ts`); hardening only
- **Phase 6 (Docker/Deploy)**: Depends on Phases 3+4+5 all passing; needs compiled `dist/`
- **Phase 7 (Polish)**: Depends on Phase 6 (Render.com URL needed for main app wiring)

### User Story Dependencies

- **US1 (P1)**: Requires Phase 2 complete — no dependency on US2 or US3
- **US2 (P2)**: Requires Phase 2 complete (`jobMap` and `updateJob`) — no dependency on US1 routes; `GET /status` is entirely separate from `POST /render`
- **US3 (P3)**: Requires US1 (`index.ts` created) — health route is added/verified in `index.ts`

### Within Each Phase

- Phase 2: T009 first (defines `RenderJob` type used by T010–T014); T010, T011, T012 can run in parallel after T009; T013 depends on T009 types; T014 depends on T009–T013 all complete
- Phase 3: T015, T016 can run in parallel (different files); T017 depends on T015+T016; T018, T019 can run in parallel with T017; T020 (E2E test) runs last
- Phase 4: T021 can run in parallel with Phase 3 tasks (different file); T022 depends on T021; T023 after T022

### Parallel Opportunities

All `[P]` tasks can run in parallel within their phase. Notable parallel sets:
- **Phase 1**: T003, T004 in parallel after T001+T002
- **Phase 2**: T010, T011, T012 in parallel after T009
- **Phase 3**: T015, T016 in parallel; T018 in parallel with T017
- **Phase 4**: T021 can start the moment Phase 2 is done (no dependency on Phase 3)
- **Phase 6**: T028 (`render.yaml`) can be written in parallel with T026 (Dockerfile)

---

## Parallel Example: Phase 2 (Foundational Services)

```text
After T009 (job-map.ts types defined):
  Parallel group A:
    Task: "Implement assets.ts downloadFile + cleanupJobDir (T010)"
    Task: "Implement storage.ts Supabase upload (T011)"
    Task: "Implement callbacks.ts fire-and-forget (T012)"

After T009-T012 complete:
    Task: "Implement remotion.ts bundle cache + renderMedia (T013)"

After T013 complete:
    Task: "Implement pipeline.ts full orchestration (T014)"
```

## Parallel Example: Phase 3+4 (Routes — US1 + US2)

```text
After Phase 2 complete:
  Parallel group:
    Task: "Implement validate-secret.ts middleware (T015)"
    Task: "Implement validate-payload.ts Zod middleware (T016)"
    Task: "Implement routes/status.ts GET /status/:jobId (T021)"

After T015+T016:
    Task: "Implement routes/render.ts POST /render (T017)"
After T017:
    Task: "Implement index.ts Express app + SIGTERM (T019)"
After T019:
    Task: "Register /status route in index.ts (T022)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup — scaffold project, copy shared files
2. Complete Phase 2: Foundational — all services including `pipeline.ts`
3. Complete Phase 3: US1 — `POST /render` + `GET /health` + `index.ts`
4. **STOP and VALIDATE**: Send a test render job, confirm MP4 appears in Supabase
5. Phase 6 minimal Docker: build image, confirm it starts and `/health` works

### Full Delivery

1. Phases 1 + 2 → Foundation ready
2. Phases 3 + 4 (parallel) → All 3 API endpoints live
3. Phase 5 → Health check hardened
4. Phase 6 → Docker + Render.com deployed
5. Phase 7 → Main app wired, full end-to-end validated

### Task Count Summary

| Phase | Tasks | Notes |
|-------|-------|-------|
| Phase 1: Setup | T001–T008 (8 tasks) | Scaffold + copy files |
| Phase 2: Foundational | T009–T014 (6 tasks) | Core services |
| Phase 3: US1 | T015–T020 (6 tasks) | POST /render pipeline |
| Phase 4: US2 | T021–T023 (3 tasks) | GET /status/:jobId |
| Phase 5: US3 | T024–T025 (2 tasks) | GET /health hardening |
| Phase 6: Docker | T026–T030 (5 tasks) | Dockerfile + render.yaml + deploy |
| Phase 7: Polish | T031–T034 (4 tasks) | Integration + docs |
| **Total** | **34 tasks** | |

---

## Notes

- `[P]` tasks = different files, no dependencies on incomplete tasks in same phase
- `[USn]` label maps task to specific user story for traceability
- The Remotion compositions in `renderer/src/remotion/` are COPIES — never edit them there; edit in `src/remotion/` then re-run `npm run renderer:sync-files`
- `processJob()` fire-and-forget in the render route: errors MUST be caught inside `pipeline.ts` — never let them propagate to Express unhandled
- `gl: "swiftshader"` in `chromiumOptions` is REQUIRED for Docker; omitting it causes headless Chromium to fail silently
- Bundle cache: do NOT call `bundle()` inside `processJob()` — it must be cached at module level via `getServeUrl()`
- Commit after each phase checkpoint using `feat(renderer): <description>` format
