# Data Model: F008 Remotion Rendering Pipeline

**Branch**: `008-remotion-pipeline`
**Date**: 2026-02-12

---

## DB Changes Required

### Migration: Add `current_stage` to `videos` table

```sql
-- 20260212000000_add_rendering_fields.sql

ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS current_stage TEXT
    CHECK (current_stage IN ('audio', 'sync', 'render', 'finalize'))
    DEFAULT NULL;

-- Index for the concurrent-render guard query
CREATE INDEX IF NOT EXISTS idx_videos_user_status
  ON videos(user_id, status);
```

### Aligned `videos.status` constraint (already correct in DB)

The DB already has `status IN ('processing', 'completed', 'failed')`. No change needed to the constraint. The TypeScript type `VideoStatus` in `src/types/video.ts` must be updated (see TypeScript Changes below).

---

## TypeScript Type Changes

### `src/types/video.ts` — align `VideoStatus` with DB

```typescript
// BEFORE (inconsistent with DB):
export type VideoStatus = "draft" | "generating" | "rendering" | "completed" | "failed";

// AFTER (aligned with DB CHECK constraint):
export type VideoStatus = "processing" | "completed" | "failed";
```

### New types — `src/types/render.ts` (new file)

```typescript
import type { CaptionStyle, Scene, TransitionType } from "@/types/scene";

/** Stage of an in-progress render */
export type RenderStage = "audio" | "sync" | "render" | "finalize";

/** Payload sent from main app to ReelZero-Renderer microservice */
export type RenderJobPayload = {
  videoId: string;
  userId: string;
  audioUrl: string;           // Signed Supabase URL for the generated MP3
  scenes: RenderScene[];
  captionStyle: CaptionStyle;
  transitionType: TransitionType;
  callbackUrl: string;        // POST /api/video/render/complete URL
};

/** Per-scene data sent to renderer */
export type RenderScene = {
  sceneNumber: number;
  imageUrl: string;           // Signed Supabase URL for scene image
  durationInFrames: number;   // Pre-calculated from audio alignment
  wordTimings: WordFrameTiming[];
};

/**
 * Word timing in GLOBAL (absolute) frames from composition start (frame 0).
 * NOT scene-local. Convert to scene-local inside VideoComposition by subtracting scene.startFrame
 * before passing to WordByWord / FullSentence caption components.
 */
export type WordFrameTiming = {
  word: string;
  startFrame: number;  // global frame (from composition start)
  endFrame: number;    // global frame (from composition start)
};

/** Render complete callback body from microservice → main app */
export type RenderCompleteCallback = {
  videoId: string;
  status: "completed" | "failed";
  outputUrl?: string;     // Supabase storage path when completed
  fileSizeBytes?: number;
  durationSeconds?: number;
  error?: string;         // Human-readable error when failed
};

/** Response from GET /api/video/render/status */
export type RenderStatusResponse = {
  status: "processing" | "completed" | "failed";
  currentStage: RenderStage | null;
  videoUrl: string | null;
  error: string | null;
};
```

### New types — `src/types/remotion.ts` (new file)

```typescript
import type { CaptionStyle, TransitionType } from "@/types/scene";
import type { RenderScene } from "@/types/render";

/** Props passed to the Remotion VideoComposition component */
export type VideoCompositionProps = {
  audioUrl: string;
  scenes: RenderScene[];
  captionStyle: CaptionStyle;
  transitionType: TransitionType;
  showWatermark: boolean;
};
```

---

## Audio Sync Data Flow

```
ElevenLabs API
  → normalized_alignment (character-level, seconds)
  → aggregateCharToWordAlignment() [exists in src/lib/ai/tts.ts]
  → WordAlignment[] { word, start: seconds, end: seconds }
  → calculateSceneTimings(scenes, wordAlignment)
  → SceneTiming[] { sceneNumber, startFrame, endFrame, durationInFrames, wordTimings: WordFrameTiming[] }
  → included in RenderJobPayload sent to microservice
```

### `calculateSceneTimings()` logic

Located in `src/lib/services/remotion/sync.ts`:

1. Each scene has `narration` text. Assign words from `WordAlignment[]` to scenes by matching word boundaries to scene text.
2. A scene's `startFrame` = `Math.round(firstWordOfScene.start * VIDEO_FRAME_RATE)`.
3. A scene's `endFrame` = `Math.round(lastWordOfScene.end * VIDEO_FRAME_RATE)`.
4. `durationInFrames` = `endFrame - startFrame`.
5. `WordFrameTiming.startFrame` and `endFrame` are **global** (absolute composition frame from time 0), NOT scene-local. For example, if Scene 2 starts at frame 90, a word that begins at second 3.5 in Scene 2 has `startFrame = Math.round(3.5 * 30) = 105` (global). When passing `wordTimings` to caption components inside `<VideoComposition>`, subtract `scene.startFrame` (e.g., `105 - 90 = 15`) so the caption component receives scene-local frame 15. Caption components (`WordByWord`, `FullSentence`) only see `useCurrentFrame()` values starting from 0 within their `<Sequence>`.

**Edge case — silence/no words in a scene**: If a scene has 0 matched words, distribute the remaining composition frames evenly across silent scenes using `Math.floor(remainingFrames / silentSceneCount)`.

---

## Entity Summary

| Entity | Storage | Key Fields Added by F008 |
|---|---|---|
| Video (DB) | `videos` table | `current_stage` column (nullable) |
| RenderJobPayload | In-memory / HTTP | New TS type — not persisted |
| RenderScene | In-memory / HTTP | New TS type — not persisted |
| WordFrameTiming | In-memory / HTTP | New TS type — not persisted |
| RenderCompleteCallback | HTTP inbound | New TS type — not persisted |
| VideoCompositionProps | Remotion / in-memory | New TS type — not persisted |
