# Quickstart: F008 Remotion Rendering Pipeline

**Branch**: `008-remotion-pipeline`
**Date**: 2026-02-12

---

## Prerequisites

1. F007 (Video Generation Wizard) merged and working — `videoId` in Zustand store, wizard Step 4 complete
2. `RENDERER_SERVICE_URL` env var set to the ReelZero-Renderer URL (local or Render.com)
3. `RENDER_WEBHOOK_SECRET` env var set (shared with the renderer)

---

## 1. Install New Dependencies

```bash
npm install remotion @remotion/player @remotion/media
```

> `@remotion/bundler` and `@remotion/renderer` go in the **renderer repo** only — not here.

---

## 2. DB Migration

```bash
# Apply to local Supabase (or via Supabase dashboard for remote)
supabase migration new add_rendering_fields
# Edit the generated file with the SQL from data-model.md
supabase db push
```

**Migration SQL** (see `data-model.md`):
```sql
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS current_stage TEXT
    CHECK (current_stage IN ('audio', 'sync', 'render', 'finalize'))
    DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_videos_user_status ON videos(user_id, status);
```

---

## 3. New Files to Create

### Types (no dependencies)
```
src/types/render.ts         — RenderJobPayload, RenderScene, WordFrameTiming, RenderCompleteCallback, RenderStatusResponse, RenderStage
src/types/remotion.ts       — VideoCompositionProps
```

### Sync Service
```
src/lib/services/remotion/sync.ts     — calculateSceneTimings(scenes, wordAlignment) → RenderScene[]
```

### Render Service
```
src/lib/services/remotion/render.ts   — buildRenderPayload(), dispatchToRenderer(), validateMp4Buffer()
```

### DB Query
```
src/lib/db/queries/videos.ts          — ADD: getProcessingVideoByUserId(userId)
```

### Remotion Compositions (used by Player + renderer)
```
src/remotion/Root.tsx
src/remotion/VideoComposition.tsx
src/remotion/Scene.tsx                — KenBurnsImage
src/remotion/transitions/Fade.tsx
src/remotion/transitions/Crossfade.tsx
src/remotion/captions/WordByWord.tsx
src/remotion/captions/FullSentence.tsx
src/remotion/utils/timing.ts          — secondsToFrame(), distributeFrames()
```

### API Routes
```
src/app/api/video/render/route.ts           — POST (trigger render)
src/app/api/video/render/status/route.ts    — GET (poll status)
src/app/api/video/render/complete/route.ts  — POST (renderer webhook callback)
src/app/api/video/render/stage/route.ts     — POST (renderer stage update)
```

### UI Components
```
src/components/video/generation-progress.tsx   — 4-stage progress UI
src/components/video/video-player.tsx          — <Player> wrapper + download button
```

### Hook
```
src/hooks/use-render-polling.ts    — useRenderPolling(videoId, enabled)
```

---

## 4. Update Existing Files

| File | Change |
|---|---|
| `src/types/video.ts` | `VideoStatus` → `"processing" \| "completed" \| "failed"` |
| `src/store/video-store.ts` | Add `renderJobId`, `renderStatus`, `renderError` state + actions |
| `src/lib/db/queries/videos.ts` | Add `getProcessingVideoByUserId()` |
| `src/lib/errors/codes.ts` | Verify `RENDER_IN_PROGRESS` code exists (add if missing) |

---

## 5. Environment Variables

Add to `.env.local` (and `.env.example`):

```bash
RENDERER_SERVICE_URL=http://localhost:3001    # Local renderer dev
RENDER_WEBHOOK_SECRET=your-shared-secret-here
```

---

## 6. Test the Pipeline Locally

```bash
# Terminal 1: Main app
npm run dev

# Terminal 2: ReelZero-Renderer (separate repo, must be cloned)
npm run dev   # starts on port 3001 by default

# Then: complete the wizard through Step 4 and click "Generate Video"
# Watch the progress screen update as stages advance
```

---

## 7. Run Quality Gates

```bash
npm run pre-commit   # lint + type-check + build — must all pass
```

---

## Key Invariants

- Credit is **reserved before** any AI/render call; **refunded on any failure**; **deducted only on successful MP4 validation**
- `current_stage` is `null` when `status = 'completed'` or `status = 'failed'`
- The `<Player>` component must be in a `"use client"` file — it uses `requestAnimationFrame`
- All Remotion composition files in `src/remotion/` are shared between the Player (main app) and the renderer (renderer repo imports them via a shared package or copy)
- `videoId` comes from Zustand store (`useVideoStore().videoId`) — never from request body without auth verification
