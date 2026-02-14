# Implementation Plan: Renderer Microservice (F011)

**Branch**: `011-renderer-microservice` | **Date**: 2026-02-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/011-renderer-microservice/spec.md`

---

## Summary

Build the `renderer/` microservice — a standalone Express.js server that performs Remotion-based video rendering. It receives a `RenderJobPayload` from the main app via `POST /render`, downloads scene assets from Supabase, uses `@remotion/bundler` to bundle the existing compositions from `src/remotion/` and `@remotion/renderer` to render an MP4 with headless Chromium + FFmpeg, uploads the result to Supabase Storage, and fires a completion callback to the main app. Deployed to Render.com as a Docker container.

Key technical decisions from research:
- **Bundle once, reuse**: `bundle()` output is cached at startup; subsequent jobs reuse the same serve URL (avoids 10–30s re-bundling per job)
- **`gl: 'swiftshader'`**: Required for Docker — software OpenGL since no GPU is available
- **`durationInFrames` override**: `renderMedia()` receives the computed sum of scene durations, overriding the composition's 1800-frame default
- **Shared files as copies**: `src/remotion/` and shared types are copied into `renderer/src/` (not symlinked) since the renderer is a fully independent Node.js service
- **In-memory job map**: `Map<jobId, RenderJob>` — no Redis/database for MVP

---

## Technical Context

**Language/Version**: TypeScript 5+ (strict mode), Node.js 20
**Primary Dependencies**: `express` ^4, `zod` ^3, `remotion` ^4.0.421, `@remotion/bundler` ^4.0.421, `@remotion/renderer` ^4.0.421, `@supabase/supabase-js` ^2, `tsx` (dev), `tsc-alias` (build)
**Storage**: Supabase Storage (`videos` bucket for MP4 output; reads from `images` and `audio` buckets via signed URLs)
**Testing**: Manual integration tests via curl / Postman for MVP (no automated test runner configured in renderer)
**Target Platform**: Linux Docker container (Render.com), node:20-slim + ffmpeg + chromium
**Project Type**: Standalone microservice (`renderer/` — independent from main Next.js app)
**Performance Goals**: 3-scene 30s video renders in <5 minutes; `POST /render` responds in <300ms; `GET /health` responds in <100ms
**Constraints**: Single Render.com instance (no horizontal scaling); Chromium needs ~1GB RAM (use $7–$25/month tier); in-memory job state lost on restart
**Scale/Scope**: MVP — 1–5 renders/day, single instance, no queue persistence

---

## Constitution Check

*GATE: Pre-design check against ReelZero Constitution v1.0.0*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. AI Provider Abstraction** | ✅ N/A | Renderer has no AI calls — it only renders Remotion compositions |
| **II. Strict Type Safety** | ✅ Required | TypeScript strict mode. All job state typed. No `any`. Zod for runtime validation of inbound payload. |
| **III. Direct Imports Only** | ✅ Required | No barrel files. Named exports only. Direct imports from file paths. |
| **IV. Database Abstraction** | ✅ N/A | Renderer has no database. Supabase Storage calls are direct (acceptable — no query abstraction layer needed for storage-only access in a microservice). |
| **V. Microservice Boundary** | ✅ Defines this feature | This IS the renderer microservice. Video specs are fixed: 1080×1920, 30fps, H.264 MP4, max 60s. |
| **VI. Credit-Gated Operations** | ✅ N/A | Credits are managed by main app (F006/F008). Renderer receives a job and processes it — no credit logic. |
| **VII. Naming & Structure** | ✅ Required | kebab-case files, SCREAMING_SNAKE for constants, camelCase functions. `type(scope): description` commits. |

**GATE RESULT: PASS** — No violations. The renderer is an independent service; Principles I, IV, VI are not applicable to it.

**Post-design re-check**: The bundle cache singleton is a module-level variable — acceptable pattern for a single-instance service. The in-memory `Map` is documented as non-persistent per constitution's simplicity mandate.

---

## Project Structure

### Documentation (this feature)

```text
specs/011-renderer-microservice/
├── plan.md              ← This file
├── spec.md              ← Feature specification
├── research.md          ← Phase 0: Remotion API, Docker, patterns
├── data-model.md        ← Phase 1: RenderJob entity, shared types, env vars
├── quickstart.md        ← Phase 1: Local dev and Docker setup guide
├── contracts/
│   └── api-routes.md    ← Phase 1: Full API contract (POST /render, GET /status, GET /health)
├── checklists/
│   └── requirements.md  ← Spec quality checklist (all pass)
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (renderer/)

```text
renderer/
├── src/
│   ├── index.ts                      # Express app entry point + server startup
│   ├── middleware/
│   │   ├── validate-secret.ts        # x-render-secret header check middleware
│   │   └── validate-payload.ts       # Zod schema validation middleware
│   ├── routes/
│   │   ├── render.ts                 # POST /render — enqueue job, 202 response
│   │   ├── status.ts                 # GET /status/:jobId — poll job state
│   │   └── health.ts                 # GET /health — liveness check
│   ├── services/
│   │   ├── job-map.ts                # In-memory Map<jobId, RenderJob> + helpers
│   │   ├── remotion.ts               # bundle() cache + selectComposition() + renderMedia()
│   │   ├── assets.ts                 # downloadFile() with retry, cleanup helpers
│   │   ├── storage.ts                # Supabase upload + signed URL generation
│   │   ├── callbacks.ts              # fireStageCallback() + fireCompletionCallback()
│   │   └── pipeline.ts               # Orchestrates full async render pipeline
│   ├── remotion/                     # Copied from src/remotion/ (DO NOT EDIT HERE)
│   │   ├── Root.tsx
│   │   ├── VideoComposition.tsx
│   │   ├── Scene.tsx
│   │   ├── captions/
│   │   │   ├── WordByWord.tsx
│   │   │   └── FullSentence.tsx
│   │   ├── transitions/
│   │   │   ├── Fade.tsx
│   │   │   └── Crossfade.tsx
│   │   └── utils/
│   │       └── timing.ts
│   ├── types/                        # Copied from src/types/ (DO NOT EDIT HERE)
│   │   ├── remotion.ts               # VideoCompositionProps
│   │   ├── render.ts                 # RenderJobPayload, RenderScene, etc.
│   │   └── scene.ts                  # CaptionStyle, TransitionType
│   └── lib/
│       └── constants/
│           └── video.ts              # Copied from src/lib/constants/video.ts
├── package.json
├── tsconfig.json
├── Dockerfile
├── render.yaml
├── .env.example
└── scripts/
    └── sync-files.sh                 # Copies src/remotion/ + types into renderer/src/
```

**Also required in monorepo root `package.json`**:
```json
"renderer:sync-files": "bash renderer/scripts/sync-files.sh"
```

---

## Implementation Phases

### Phase A: Scaffold renderer/ project

1. Create `renderer/package.json` with all dependencies (Express, Zod, Remotion, Supabase JS, tsx, tsc-alias)
2. Create `renderer/tsconfig.json` with `"paths": { "@/*": ["./src/*"] }` and `strict: true`
3. Create `renderer/.env.example` with all required env vars
4. Create `renderer/scripts/sync-files.sh` to copy shared files from main app
5. Run sync script to populate `renderer/src/remotion/`, `renderer/src/types/`, `renderer/src/lib/constants/`

### Phase B: Core services

6. `job-map.ts` — `RenderJob` TypeScript type + `Map<string, RenderJob>` singleton + `createJob()`, `updateJob()`, `getJob()` helpers
7. `assets.ts` — `downloadFile(url, destPath, maxRetries)` with exponential backoff, `cleanupJobDir(jobId)`
8. `storage.ts` — Supabase client init (service-role key), `uploadMp4(userId, videoId, filePath)` → returns `outputUrl`, retry wrapper
9. `callbacks.ts` — `fireStageCallback(stageCallbackUrl, videoId, stage)` and `fireCompletionCallback(callbackUrl, payload)` (fire-and-forget fetch calls)
10. `remotion.ts` — `getServeUrl()` (cached `bundle()`), `renderComposition(jobId, inputProps, durationInFrames, outputPath)` using `selectComposition()` + `renderMedia()` with `gl: 'swiftshader'`, `onProgress` updating job map
11. `pipeline.ts` — `processJob(jobId, payload)` orchestrates: download → bundle → render → upload → callback. Error handling marks job failed and fires failure callback.

### Phase C: Express routes + middleware

12. `middleware/validate-secret.ts` — checks `x-render-secret` header, returns `401` on mismatch
13. `middleware/validate-payload.ts` — Zod schema for `RenderJobPayload`, returns `422` with details on failure
14. `routes/health.ts` — `GET /health` → `{ status: "ok", timestamp }`
15. `routes/status.ts` — `GET /status/:jobId` → job state or `404`
16. `routes/render.ts` — `POST /render` → check duplicate jobId (409), create job, `res.status(202)`, fire-and-forget `processJob()`
17. `index.ts` — Express app setup, JSON body parser, route registration, `listen(PORT)`, `SIGTERM` handler

### Phase D: Docker + deployment

18. `renderer/Dockerfile` — `node:20-slim`, install `ffmpeg chromium fonts-noto` via apt, set `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`, `npm ci --only=production`, `EXPOSE 3001`, `CMD ["node", "dist/index.js"]`
19. `renderer/render.yaml` — Render.com web service config (dockerContext: monorepo root, healthCheckPath: /health, env vars with `sync: false` for secrets)

### Phase E: End-to-end validation

20. Local test: `npm run dev` in `renderer/`, `curl /health`, send test `POST /render` with real Supabase signed URLs
21. Docker test: `docker build` from monorepo root, `docker run`, verify `/health` and a test render
22. Update main app `RENDERER_SERVICE_URL` env var to point to Render.com deployment
23. Full end-to-end: complete wizard in browser → video generation → MP4 in Supabase → video appears in dashboard

---

## Key Implementation Notes

### Remotion bundle caching

The bundle is created **once** at the module level and cached. Do NOT bundle inside `processJob()`:

```typescript
// services/remotion.ts
let serveUrl: string | null = null;

export async function getServeUrl(): Promise<string> {
  if (!serveUrl) {
    serveUrl = await bundle({
      entryPoint: path.resolve(__dirname, '../remotion/Root.tsx'),
    });
  }
  return serveUrl;
}
```

### `durationInFrames` computation

```typescript
const totalFrames = payload.scenes.reduce((sum, s) => sum + s.durationInFrames, 0);
// Pass totalFrames to renderMedia() to override Root.tsx default of 1800
```

### Stage callback → main app stage mapping

| Renderer stage | Stage callback value | Main app `RenderStage` |
|---------------|---------------------|------------------------|
| `download` | `"sync"` | `"sync"` |
| `render` | `"render"` | `"render"` |
| `upload` | `"finalize"` | `"finalize"` |

### Temp directory structure per job

```
/tmp/renders/{jobId}/
├── audio.mp3          # Downloaded from audioUrl
├── scene-1.jpg        # Downloaded scene images
├── scene-2.jpg
├── scene-3.jpg
└── output.mp4         # Remotion render output (deleted after Supabase upload)
```

### File naming in Supabase Storage

Upload path: `{userId}/{videoId}.mp4` in the `videos` bucket. This matches the pattern used by the main app to reference the video.

### Zod schema matches F008 contract

The Zod schema in `validate-payload.ts` must match `specs/008-remotion-pipeline/contracts/render-job.json`. Key: `stageCallbackUrl` is required (the actual type in `src/types/render.ts` has it; the JSON schema in F008 docs uses `callbackUrl` only — use the TypeScript type as ground truth).

---

## Complexity Tracking

No constitution violations. No complexity exceptions required.
