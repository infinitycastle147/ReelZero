# Research: Renderer Microservice (F011)

**Phase**: 0 — Resolve technical unknowns before implementation planning
**Date**: 2026-02-14

---

## 1. Remotion v4 Server-Side Rendering API

### Decision: Use `bundle()` + `selectComposition()` + `renderMedia()` — the canonical Remotion render pipeline

**Rationale**: Remotion's `@remotion/bundler` and `@remotion/renderer` packages are purpose-built for server-side rendering. Using them correctly means: (1) bundle the entry point once, (2) select the composition to get its real duration/fps, (3) call renderMedia with overridden durationInFrames. This is exactly what the Remotion docs prescribe for dynamic-length compositions.

#### `@remotion/bundler` — `bundle()`

```typescript
import { bundle } from '@remotion/bundler';

const serveUrl = await bundle({
  entryPoint: path.resolve(__dirname, './remotion/Root.tsx'),
  // Optional: webpackOverride to add ts-paths plugin if aliases needed
  webpackOverride: (config) => config,
});
// Returns: string — a serve URL (local file:// path to the webpack bundle output)
```

- `entryPoint` must be an **absolute path** to `Root.tsx`
- Returns a local serve URL (file path) that `renderMedia()` consumes as `serveUrl`
- The bundle should be created **once** at startup and reused across jobs (cache it in a module-level variable) — re-bundling per job is slow (~10–30s)

**Path alias resolution**: The renderer's `tsconfig.json` must map `@/` to the correct base path. Since compositions are copied into `renderer/src/remotion/` and the shared types are also copied into `renderer/src/types/`, the `@/` alias maps to `renderer/src/`. Use `tsconfig-paths/register` at runtime (dev) and `tsc-alias` at build time (production) to resolve aliases in compiled output.

#### `@remotion/renderer` — `selectComposition()` + `renderMedia()`

```typescript
import { selectComposition, renderMedia } from '@remotion/renderer';

// Step 1: Select composition to get metadata (fps, width, height)
const composition = await selectComposition({
  serveUrl,
  id: 'VideoComposition',
  inputProps,           // Pass actual props so Remotion can calculate duration
});

// Step 2: Render
await renderMedia({
  composition,          // The composition object from selectComposition()
  serveUrl,
  codec: 'h264',
  outputLocation: outputPath,  // absolute path to output .mp4
  inputProps,           // VideoCompositionProps
  durationInFrames: totalFrames,  // OVERRIDE the composition's default (1800)
  fps: composition.fps, // 30 (from composition metadata)
  concurrency: Number(process.env.REMOTION_CONCURRENCY ?? '2'),
  chromiumOptions: {
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    disableWebSecurity: false,
    gl: 'swiftshader',  // software GL renderer for Docker (no GPU)
  },
  onProgress: ({ progress }) => {
    // progress is 0–1 (not 0–100), multiply by 100 for job map
    updateJobProgress(jobId, Math.round(progress * 100));
  },
  // Required for Docker no-sandbox environments:
  puppeteerTimeout: 120_000,
});
```

**Critical note on `durationInFrames`**: The `VideoComposition`'s `Root.tsx` registers with `durationInFrames={1800}` (60s max). For actual rendering, we pass `durationInFrames` as the computed sum of all scene durations to `renderMedia()`. This overrides the composition default. `selectComposition()` is still needed to get `fps`, `width`, `height` for the composition object.

**`onProgress` callback**: Receives `{ progress: number }` where `progress` is a float `0.0–1.0`. Multiply by 100 to get percentage.

#### Chromium flags for Docker (no-sandbox)

```typescript
chromiumOptions: {
  executablePath: '/usr/bin/chromium',  // set via PUPPETEER_EXECUTABLE_PATH env
  disableWebSecurity: false,
  gl: 'swiftshader',     // critical: software renderer, no GPU in Docker
  // Remotion internally passes --no-sandbox and --disable-setuid-sandbox
  // when it detects a non-root user or headless environment
}
```

The `gl: 'swiftshader'` option is the most important for Docker — it tells Chromium to use software-based OpenGL instead of requiring a GPU. Without it, rendering fails in containers.

#### Bundle caching strategy

```typescript
// Module-level singleton — bundle once at startup
let cachedServeUrl: string | null = null;

async function getServeUrl(): Promise<string> {
  if (!cachedServeUrl) {
    cachedServeUrl = await bundle({
      entryPoint: path.resolve(__dirname, '../remotion/Root.tsx'),
    });
  }
  return cachedServeUrl;
}
```

---

## 2. Express Async Job Queue Pattern

### Decision: In-memory `Map<jobId, RenderJob>` — no external queue for MVP

**Rationale**: For a single-instance Render.com deployment with low throughput (1–5 renders/day initially), an in-memory map is sufficient. BullMQ or Redis would add operational complexity (managing a Redis instance). The spec explicitly allows in-memory storage for MVP.

**Alternatives considered**: BullMQ + Redis (rejected: requires separate Redis service), PostgreSQL job table (rejected: overkill for MVP, adds DB coupling to the renderer).

#### Fire-and-forget pattern

```typescript
// Route handler: return 202 immediately, process async
router.post('/render', validateSecret, validatePayload, async (req, res) => {
  const jobId = crypto.randomUUID();
  jobMap.set(jobId, { jobId, status: 'queued', stage: 'queued', progress: 0 });
  res.status(202).json({ jobId });

  // Fire-and-forget: do NOT await, do NOT let errors bubble to Express
  processJob(jobId, req.body).catch((err) => {
    // Update job state — never crashes the server
    jobMap.set(jobId, { ...jobMap.get(jobId)!, status: 'failed', error: String(err) });
    fireFailureCallback(req.body.callbackUrl, req.body.videoId, String(err));
  });
});
```

#### Graceful shutdown

```typescript
process.on('SIGTERM', () => {
  // Let in-flight render finish (up to 10 min) before exiting
  server.close(() => process.exit(0));
});
```

---

## 3. Supabase Storage Upload from Node.js

### Decision: `supabase.storage.from('videos').upload()` with `service-role` key

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!  // service role — bypasses RLS
);

// Upload MP4
const storagePath = `${userId}/${videoId}.mp4`;
const fileBuffer = await fs.readFile(outputMp4Path);

const { error } = await supabase.storage
  .from('videos')
  .upload(storagePath, fileBuffer, {
    contentType: 'video/mp4',
    upsert: true,  // overwrite on retry
  });

if (error) throw error;

// Get signed URL (1 hour expiry)
const { data: { signedUrl } } = await supabase.storage
  .from('videos')
  .createSignedUrl(storagePath, 3600);
```

**Upload via stream** (for large files, avoids loading entire MP4 into memory):
```typescript
import { createReadStream } from 'fs';
// Supabase JS v2 accepts a ReadableStream in Node.js
const stream = createReadStream(outputMp4Path);
await supabase.storage.from('videos').upload(storagePath, stream, { contentType: 'video/mp4' });
```

---

## 4. Asset Download with Retry

### Decision: Native `fetch` with retry loop (Node.js 18+ built-in fetch)

```typescript
async function downloadFile(url: string, destPath: string, maxRetries = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(destPath, buffer);
      return;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await sleep(Math.pow(2, attempt) * 500); // 1s, 2s, 4s
    }
  }
}
```

---

## 5. TypeScript Path Alias Resolution in Standalone Node.js

### Decision: Copy shared types locally + `tsconfig.json` `paths` + `tsconfig-paths` for dev, `tsc-alias` for production build

The renderer is a **fully independent** Node.js service. It cannot use the main app's `@/` aliases directly. Strategy:

1. **Copy** `src/types/remotion.ts`, `src/types/render.ts`, `src/types/scene.ts` into `renderer/src/types/`
2. **Copy** `src/remotion/` into `renderer/src/remotion/`
3. **Copy** `src/lib/constants/video.ts` into `renderer/src/lib/constants/video.ts`
4. In `renderer/tsconfig.json`, set `"paths": { "@/*": ["./src/*"] }`
5. Dev: `tsx` handles paths natively via its built-in TypeScript support
6. Prod: `tsc` + `tsc-alias` to rewrite paths in compiled JS

This means `@/types/remotion` in a copied composition resolves to `renderer/src/types/remotion` — the local copy.

---

## 6. Render.com Docker Deployment

### Decision: Paid $7/month Docker web service (not free tier)

**Rationale**: Free tier spins down after 15 minutes of inactivity — a render job that starts right after spin-down will fail or timeout. A $7/month "Starter" instance stays up 24/7, has 512MB RAM (tight for Chromium), while the $25/month "Standard" instance has 2GB RAM (recommended for Chromium + FFmpeg).

**Alternatives considered**: Free tier (rejected: spin-down risk for async render jobs), Render.com background worker (rejected: no HTTP endpoints, needs to be web service for `/health` and `/status`).

#### render.yaml

```yaml
services:
  - type: web
    name: reelzero-renderer
    runtime: docker
    dockerfilePath: ./renderer/Dockerfile
    dockerContext: .   # monorepo root, so Dockerfile can COPY renderer/ and src/
    healthCheckPath: /health
    envVars:
      - key: PORT
        value: 3001
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_KEY
        sync: false
      - key: RENDER_WEBHOOK_SECRET
        sync: false
      - key: MAIN_APP_URL
        sync: false
      - key: REMOTION_CONCURRENCY
        value: 2
      - key: REMOTION_OUTPUT_DIR
        value: /tmp/renders
```

**`dockerContext: .`** is important: if the Dockerfile needs to `COPY renderer/` AND `src/remotion/` (for the shared compositions), the build context must be the monorepo root.

**`sync: false`** means "this env var is required but the value is set manually in the Render.com dashboard, not in YAML" — keeps secrets out of the repo.

---

## 7. Key Decisions Summary

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Bundle caching | Cache `bundle()` output at startup, reuse per job | Bundling takes 10–30s; re-bundling per job is too slow |
| `durationInFrames` | Computed as sum of scene durations, passed to `renderMedia()` as override | Composition default is 1800 (max); actual video is shorter |
| GL renderer | `gl: 'swiftshader'` in `chromiumOptions` | Required for Docker — no GPU available |
| Path aliases | Copy shared types + local `@/` mapping in `tsconfig.json` | Renderer is fully independent — cannot share main app's node_modules |
| Job storage | In-memory `Map` | MVP simplicity; no Redis dependency |
| Render.com tier | $7/month Starter (minimum), $25/month Standard (recommended) | Free tier spins down; Chromium needs ~1GB RAM |
| Upload | `supabase.storage.upload()` with stream | Service-role key bypasses RLS; stream avoids memory spike |
| Docker context | Monorepo root (`dockerContext: .`) | Allows Dockerfile to access both `renderer/` and `src/remotion/` |
