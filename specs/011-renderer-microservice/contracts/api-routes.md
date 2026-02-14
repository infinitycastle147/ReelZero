# API Contracts: Renderer Microservice (F011)

**Service**: ReelZero-Renderer (Express, port 3001)
**Base URL**: `https://<renderer-domain>` (Render.com) or `http://localhost:3001` (dev)
**Auth**: All endpoints except `GET /health` require `x-render-secret: <RENDER_WEBHOOK_SECRET>` header

---

## POST /render

Accept a render job and begin async processing.

### Request

**Headers**:
```
Content-Type: application/json
x-render-secret: <RENDER_WEBHOOK_SECRET>
```

**Body** (`RenderJobPayload`):
```json
{
  "videoId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user_2abc123def",
  "audioUrl": "https://xxx.supabase.co/storage/v1/object/sign/audio/user_2abc/abc.mp3?token=...",
  "scenes": [
    {
      "sceneNumber": 1,
      "imageUrl": "https://xxx.supabase.co/storage/v1/object/sign/images/user_2abc/scene1.jpg?token=...",
      "durationInFrames": 270,
      "startFrame": 0,
      "wordTimings": [
        { "word": "Hello", "startFrame": 0, "endFrame": 15 },
        { "word": "world", "startFrame": 16, "endFrame": 30 }
      ]
    },
    {
      "sceneNumber": 2,
      "imageUrl": "https://xxx.supabase.co/storage/v1/object/sign/images/user_2abc/scene2.jpg?token=...",
      "durationInFrames": 300,
      "startFrame": 270,
      "wordTimings": [
        { "word": "This", "startFrame": 270, "endFrame": 285 }
      ]
    }
  ],
  "captionStyle": "word-by-word",
  "transitionType": "fade",
  "showWatermark": false,
  "callbackUrl": "https://reelzero.vercel.app/api/video/render/complete",
  "stageCallbackUrl": "https://reelzero.vercel.app/api/video/render/stage"
}
```

**Payload validation rules** (Zod schema):
- `videoId`: non-empty string (UUID format)
- `userId`: non-empty string
- `audioUrl`: valid URL
- `scenes`: array, min 3, max 5 items
  - `sceneNumber`: integer 1–5
  - `imageUrl`: valid URL
  - `durationInFrames`: positive integer
  - `startFrame`: non-negative integer
  - `wordTimings`: array of `{ word: string, startFrame: number, endFrame: number }`
- `captionStyle`: enum `"word-by-word" | "full-sentence" | "none"`
- `transitionType`: enum `"fade" | "crossfade"`
- `showWatermark`: boolean
- `callbackUrl`: valid URL
- `stageCallbackUrl`: valid URL

### Responses

**202 Accepted** — Job enqueued, processing started asynchronously:
```json
{ "jobId": "7f3d9a2e-8b4c-4f1d-9c5e-123456789abc" }
```

**401 Unauthorized** — Missing or wrong `x-render-secret`:
```json
{ "error": "Unauthorized" }
```

**409 Conflict** — Duplicate `videoId` already in job map:
```json
{ "error": "Job with this videoId already exists", "jobId": "existing-job-id" }
```

**422 Unprocessable Entity** — Zod validation failed:
```json
{
  "error": "Validation failed",
  "details": [
    { "path": "scenes", "message": "Array must contain at least 3 element(s)" }
  ]
}
```

**500 Internal Server Error** — Unexpected error:
```json
{ "error": "Internal server error" }
```

---

## GET /status/:jobId

Poll the current status of a render job.

### Request

**Headers**:
```
x-render-secret: <RENDER_WEBHOOK_SECRET>
```

**Path parameter**: `jobId` — UUID returned from `POST /render`

### Responses

**200 OK** — Job found:
```json
{
  "jobId": "7f3d9a2e-8b4c-4f1d-9c5e-123456789abc",
  "videoId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "stage": "render",
  "progress": 42
}
```

Status values:
| `status` | `stage` | `progress` | Description |
|----------|---------|------------|-------------|
| `queued` | `queued` | `0` | Accepted, not yet started |
| `processing` | `download` | `0` | Downloading assets |
| `processing` | `bundle` | `5` | Bundling Remotion (or instant if cached) |
| `processing` | `render` | `5–95` | Rendering frames (updates via `onProgress`) |
| `processing` | `upload` | `98` | Uploading MP4 to Supabase |
| `completed` | `done` | `100` | Done, callback fired |
| `failed` | *last stage* | *last value* | Error, failure callback fired |

**401 Unauthorized** — Missing or wrong secret:
```json
{ "error": "Unauthorized" }
```

**404 Not Found** — Unknown `jobId`:
```json
{ "error": "Job not found" }
```

---

## GET /health

Liveness check — no authentication required.

### Request

No headers or body required.

### Response

**200 OK**:
```json
{
  "status": "ok",
  "timestamp": "2026-02-14T12:00:00.000Z"
}
```

---

## Outbound Callbacks (Renderer → Main App)

These are HTTP requests the renderer makes TO the main app. They are not part of the renderer's API surface but are documented here for completeness.

### POST `{stageCallbackUrl}` — Stage Update

Fired at each pipeline stage transition. Fire-and-forget; failures are logged but do not block rendering.

**Body**:
```json
{
  "videoId": "550e8400-e29b-41d4-a716-446655440000",
  "stage": "render"
}
```

`stage` values sent: `"sync"` (during download), `"render"` (during render), `"finalize"` (during upload). These map to `RenderStage` in the main app's F008 implementation.

### POST `{callbackUrl}` — Completion

Fired once when the job finishes (success or failure).

**Body (success)**:
```json
{
  "videoId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "outputUrl": "https://xxx.supabase.co/storage/v1/object/sign/videos/user_2abc/550e8400.mp4?token=...",
  "fileSizeBytes": 12345678,
  "durationSeconds": 31.5
}
```

**Body (failure)**:
```json
{
  "videoId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "error": "Asset download failed: HTTP 403 from Supabase (signed URL expired)"
}
```

---

## Async Pipeline Flow

```
POST /render
  │  ► 202 { jobId }  (immediate)
  │
  ▼ (async, background)
  1. job.stage = "download"
     fire stageCallback("sync")
     download audio → /tmp/renders/{jobId}/audio.mp3
     download images → /tmp/renders/{jobId}/scene-{n}.jpg
  │
  ▼
  2. job.stage = "bundle"
     fire stageCallback("render")
     getServeUrl()  [uses cached bundle or calls bundle()]
  │
  ▼
  3. job.stage = "render"
     renderMedia({ ..., onProgress: p => job.progress = p*100 })
     output → /tmp/renders/{jobId}/output.mp4
  │
  ▼
  4. job.stage = "upload"
     fire stageCallback("finalize")
     supabase.storage.from('videos').upload(...)
     get signedUrl
  │
  ▼
  5. job.stage = "done" / job.status = "completed"
     fire callbackUrl({ status: "completed", outputUrl, ... })
     cleanup /tmp/renders/{jobId}/
```
