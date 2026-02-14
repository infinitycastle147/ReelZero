# Research: F008 Remotion Rendering Pipeline

**Date**: 2026-02-12
**Branch**: `008-remotion-pipeline`

---

## 1. Remotion Packages Required

**Decision**: Install `remotion`, `@remotion/player`, `@remotion/media` in the main Next.js app. The render microservice (separate repo) installs `@remotion/bundler` and `@remotion/renderer`.

**Rationale**: No Remotion packages exist in `package.json` yet. The Player component runs fully client-side via `requestAnimationFrame` — safe in Next.js App Router. Server-side rendering belongs in the microservice only.

**New deps for main app**:
```
remotion               # core: useCurrentFrame, useVideoConfig, interpolate, Series, Sequence, AbsoluteFill, Img
@remotion/player       # <Player> component
@remotion/media        # <Audio> component
```

---

## 2. Ken Burns Effect Implementation

**Decision**: Use `interpolate(frame, [0, durationInFrames], [0, 1])` driving CSS `transform: scale(N) translateX(px) translateY(px)` on an `<Img>` inside `<AbsoluteFill style={{ overflow: "hidden" }}>`. No spring — pure linear interpolation.

**Rationale**: Spring adds bounce/overshoot, wrong for cinematic slow pan. Linear interpolation at constant velocity matches the Ken Burns aesthetic. Vary pan direction per scene (alternate +/- `panX`) for visual variety.

**Parameters**: `zoomFrom: 1.0`, `zoomTo: 1.08` (8% zoom over scene), `panX: 0.04` (4% of width), `panY: 0.02` (2% of height).

**Alternatives considered**: CSS animation (rejected — can't be frame-accurate with Remotion); `spring()` (rejected — adds undesired bounce).

---

## 3. Scene Sequencing

**Decision**: Use Remotion's `<Series>` + `<Series.Sequence durationInFrames={N}>` for sequential scenes. For crossfade transitions use `offset={-15}` (0.5s at 30fps) to create overlap.

**Rationale**: `<Series>` auto-advances start frames, making scene-by-scene composition declarative. The `durationInFrames` per scene is computed from audio alignment data at sync time.

**Key property**: `useCurrentFrame()` inside `<Series.Sequence>` returns 0-based local frame — so all per-scene animations are independent of global position.

---

## 4. Audio Track

**Decision**: Single `<Audio src={audioUrl} volume={1} />` at the top level of the composition, outside `<Series>`, using `@remotion/media`. Audio URL is a Supabase signed URL (1hr expiry).

**Rationale**: Placing Audio outside `<Series>` ensures it spans the full composition duration from frame 0. The signed URL approach is consistent with existing `storage.ts` patterns.

---

## 5. MP4 Validation

**Decision**: Check bytes 4–7 of the file buffer equal ASCII `"ftyp"` (`0x66 0x74 0x79 0x70`) AND file size > 0.

**Rationale**: Remotion/FFmpeg always writes the `ftyp` box first. Reading only 12 bytes is sufficient and cheap. A corrupt or empty file catches the most common renderer failure modes.

**Node.js implementation**: `buffer.subarray(4, 8).toString("ascii") === "ftyp"` on the first 12 bytes of the downloaded MP4.

---

## 6. Polling Architecture (Vercel Serverless Constraint)

**Decision**: Fire-and-forget `POST /api/video/render` (returns `202` with `videoId` immediately) + client-side `setInterval` polling `GET /api/video/render/status?videoId=X` every 3 seconds.

**Rationale**: Vercel serverless functions timeout at 10–60s. The render takes ~70–90s. Server-side streaming would exhaust the timeout. Client-side polling is zero server-side cost and survives page navigation (render continues on Render.com). The status route is a cheap Supabase single-row read.

**Alternatives considered**: Supabase Realtime subscription (rejected — adds complexity; 3s polling is sufficient per spec SC-005); server-sent events (rejected — still subject to Vercel timeout).

**120s timeout enforcement**: Implemented server-side in the render microservice using `AbortController`. On timeout the microservice calls `POST /api/video/render/complete` (webhook) with `{ videoId, status: "failed", error: "timeout" }` to trigger credit refund.

---

## 7. ElevenLabs Alignment → Frame Mapping

**Decision**: Use the already-implemented `aggregateCharToWordAlignment()` in `src/lib/ai/tts.ts`. Output is `WordAlignment[] = { word: string; start: number; end: number }` where `start`/`end` are seconds (float).

**Frame conversion**: `Math.round(seconds * VIDEO_FRAME_RATE)` gives absolute global frame. For per-scene local frames (inside `<Series.Sequence>`): subtract the scene's audio start offset in frames.

**Rationale**: The aggregation function already exists and is tested. Reuse it directly — only the frame-calculation step is new in F008.

---

## 8. Existing Infrastructure (Already Built — Reuse)

| Asset | Location | Notes |
|---|---|---|
| `generateAudio()` | `src/lib/ai/tts.ts` | Returns `{ storageUrl, alignment, durationSeconds }` |
| `WordAlignment` type | `src/lib/ai/types.ts` | `{ word, start, end }` in seconds |
| `uploadFile` / `getFileUrl` | `src/lib/db/storage.ts` | `videos` bucket for MP4 output |
| `createVideo` / `updateVideo` | `src/lib/db/queries/videos.ts` | Full CRUD + `updateVideo(id, { status, metadata })` |
| `createGenerationLog` / `updateGenerationLog` | `src/lib/db/queries/generation-logs.ts` | Stage/status logging |
| `reserveCredit` / `refundCredit` | Supabase RPC functions | Atomic, already in DB |
| Error codes | `src/lib/errors/codes.ts` + `messages.ts` | `RENDER_FAILED`, `RENDER_TIMEOUT`, `RENDER_SERVICE_UNAVAILABLE` all defined |
| Video constants | `src/lib/constants/video.ts` | `VIDEO_FRAME_RATE=30`, `MAX_SCENES=5`, `MIN_SCENES=3`, resolution, etc. |
| Scene/Video types | `src/types/scene.ts`, `src/types/video.ts` | `CaptionStyle`, `TransitionType`, `Scene`, `VideoStatus` |
| Zustand store | `src/store/video-store.ts` | Exposes `videoId`, `scenes`, `captionStyle`, `transitionType`, `selectedVoice` |

---

## 9. DB Schema Gap: `current_stage` Column

**Finding**: The existing `videos` table (from F003 migration) has `status TEXT CHECK (status IN ('processing', 'completed', 'failed'))` but no `current_stage` column. Clarification Q1 established that `current_stage` is a separate field.

**Decision**: Add a DB migration adding `current_stage TEXT CHECK (current_stage IN ('audio', 'sync', 'render', 'finalize')) DEFAULT NULL` to the `videos` table.

**Also needed**: `VideoStatus` in `src/types/video.ts` currently has `'draft' | 'generating' | 'rendering' | 'completed' | 'failed'` — this does not match the DB check constraint `('processing', 'completed', 'failed')`. The spec established `processing` as the canonical in-flight status. The TypeScript type needs aligning with the DB.

---

## 10. `VideoStatus` Type Alignment

**Finding**: `src/types/video.ts` defines `VideoStatus = "draft" | "generating" | "rendering" | "completed" | "failed"`. The DB schema uses `('processing', 'completed', 'failed')`. These are inconsistent.

**Decision**: Align both to `'processing' | 'completed' | 'failed'` as established by the spec and clarification Q1. Remove `'draft'`, `'generating'`, `'rendering'` from the TypeScript type. Update any callers.

---

## 11. Concurrent Render Guard

**Finding**: No existing mechanism prevents a user from having multiple in-flight renders. FR-018 requires a maximum of 1 concurrent render per user.

**Decision**: Add a DB query `getProcessingVideoByUserId(userId)` that checks for any video with `status = 'processing'` for the given user. Call this atomically before `reserveCredit` in the render route. If found, return `409 RESOURCE_CONFLICT` with message "generation already in progress".

---

## 12. Render Microservice Contract

The main app communicates with `ReelZero-Renderer` (Render.com) via:

```
POST ${RENDERER_SERVICE_URL}/render
Body: RenderJobPayload (see contracts/render-job.json)
Response: 202 { jobId: string }

POST ${RENDERER_SERVICE_URL}/status/:jobId  (called by main app's render route, not client)
OR: render microservice calls back POST /api/video/render/complete (webhook) on finish
```

**Decision**: Use callback/webhook pattern. The render microservice POSTs to `POST /api/video/render/complete` when done (success or failure), passing `{ videoId, status, outputUrl?, error? }`. This eliminates server-side polling from the main app entirely — the main app's `GET /api/video/render/status` route only reads from Supabase (updated by the webhook), not from the renderer directly.

**Rationale**: Pure polling from the main app to the renderer would require the main app to remember the `jobId` and make outbound calls every 3s — complex on serverless. The webhook callback is a single inbound call that updates DB state; the client-side poll only ever touches the DB (cheap, fast, no cross-service dependency on the polling hot path).
