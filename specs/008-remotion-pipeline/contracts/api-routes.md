# API Contracts: F008 Remotion Rendering Pipeline

**Date**: 2026-02-12

All routes follow the project's standard response envelope:
- Success: `{ data: { ... } }`
- Error: `{ error: { code: string, message: string } }`

Auth: All routes require a valid Clerk session (`auth()` from `@clerk/nextjs/server`).

---

## POST /api/video/render

Trigger video rendering for a completed wizard session.

**Auth**: Required

**Request body**:
```typescript
{
  videoId: string;   // UUID — must belong to the authenticated user
}
```

**Processing** (performed server-side, synchronously up to dispatch):
1. Authenticate user (`auth()`)
2. Fetch video record; verify it belongs to user and is in `processing` status
3. Check for concurrent render: query videos where `user_id = userId AND status = 'processing'` count — if > 1 (i.e., another video is already rendering), return 409
4. Call `reserveCredit(userId)` atomically — if returns false, return 402
5. Load scene images and audio URL from DB / storage
6. Calculate scene timings from audio alignment data (stored in video metadata)
7. POST to `${RENDERER_SERVICE_URL}/render` with `RenderJobPayload` — expect 202 immediately
8. Update video record: `current_stage = 'audio'`
9. Return 202

**Response 202**:
```typescript
{
  data: {
    videoId: string;
    status: "processing";
    estimatedSeconds: 80;
  }
}
```

**Errors**:
- `400 VALIDATION_FAILED` — invalid videoId
- `402 CREDIT_INSUFFICIENT` — no credits available
- `403 AUTH_FORBIDDEN` — video does not belong to user
- `409 RESOURCE_CONFLICT` — "generation already in progress"
- `503 RENDER_SERVICE_UNAVAILABLE` — renderer unreachable

---

## GET /api/video/render/status

Poll render progress for a video. Called by client every 3 seconds.

**Auth**: Required

**Query params**: `?videoId=<uuid>`

**Response 200**:
```typescript
{
  data: {
    status: "processing" | "completed" | "failed";
    currentStage: "audio" | "sync" | "render" | "finalize" | null;
    videoUrl: string | null;   // signed URL, present when status === "completed"
    error: string | null;      // human-readable, present when status === "failed"
  }
}
```

**Errors**:
- `400 VALIDATION_MISSING_FIELD` — missing videoId param
- `403 AUTH_FORBIDDEN` — video does not belong to user
- `404 RESOURCE_NOT_FOUND` — no video with that ID

---

## POST /api/video/render/complete  *(inbound webhook from renderer)*

Called by the ReelZero-Renderer microservice when a render job finishes or fails. This is an internal callback — not called by the client.

**Auth**: Shared secret header `x-render-secret: ${RENDER_WEBHOOK_SECRET}` (env var). Not Clerk auth.

**Request body** (`RenderCompleteCallback`):
```typescript
{
  videoId: string;
  status: "completed" | "failed";
  outputUrl?: string;       // Supabase storage path of the rendered MP4
  fileSizeBytes?: number;
  durationSeconds?: number;
  error?: string;
}
```

**Processing on `status === "completed"`**:
1. Validate `x-render-secret` header
2. Download first 12 bytes of MP4 from `outputUrl`; check `ftyp` signature and size > 0
3. If validation fails → treat as failure (go to failure path)
4. Update video record: `status = 'completed'`, `video_url = signedUrl`, `current_stage = null`, `duration_seconds`, `file_size_bytes`
5. Call `deductCredit(userId)` (finalize the reservation)
6. Create `generation_logs` entry for `render` stage with `status = 'success'`
7. Return 200

**Processing on `status === "failed"`**:
1. Update video record: `status = 'failed'`, `current_stage = null`
2. Call `refundCredit(userId)`
3. Create `generation_logs` entry with `status = 'error'`, `error_message`
4. Return 200

**Response 200**:
```typescript
{ data: { received: true } }
```

**Errors**:
- `401` — invalid or missing render secret
- `404 RESOURCE_NOT_FOUND` — unknown videoId
- `409 RESOURCE_CONFLICT` — video already completed/failed (idempotency guard)

---

## Render Microservice Contracts (ReelZero-Renderer — separate repo)

These are documented here for reference; implemented in the renderer, not the main app.

### POST /render

```typescript
// Request body: RenderJobPayload (see render-job.json)
// Response 202:
{ jobId: string }
```

### GET /health

```typescript
// Response 200:
{ status: "ok"; timestamp: string }
```

---

## Stage Progression (updated via current_stage field)

The renderer calls back once on completion/failure. Stage updates during rendering are posted as interim callbacks:

```
Main app sets current_stage = "audio"      (after dispatching render job)
Renderer calls POST /api/video/render/stage { videoId, stage: "sync" }
Renderer calls POST /api/video/render/stage { videoId, stage: "render" }
Renderer calls POST /api/video/render/stage { videoId, stage: "finalize" }
Renderer calls POST /api/video/render/complete { videoId, status: "completed", ... }
```

### POST /api/video/render/stage  *(inbound from renderer)*

Lightweight stage update — no credit changes.

**Auth**: `x-render-secret` header

**Request body**:
```typescript
{ videoId: string; stage: "sync" | "render" | "finalize" }
```

**Processing**: Update `videos.current_stage = stage`

**Response 200**: `{ data: { received: true } }`
