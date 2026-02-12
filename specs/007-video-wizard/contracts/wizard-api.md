# API Contracts: Video Generation Wizard

**Feature**: `007-video-wizard` | **Date**: 2026-02-12

All responses follow the Constitution Principle II standard:
- Success: `{ data: { ... } }`
- Error: `{ error: { code: string, message: string, details?: unknown } }`

Auth: all routes require a valid Clerk session (`auth()` from `@clerk/nextjs/server`). `userId` is NEVER accepted from the request body.

---

## NEW: POST /api/video

Creates a new `Video` DB record in `status: 'processing'`. Called on Step 1 submit before script generation.

**Request**
```http
POST /api/video
Content-Type: application/json
```

```typescript
type CreateVideoRequest = {
  prompt: string;          // 50–500 chars (validated server-side)
  theme: ScriptTheme;      // 'realistic' | 'anime' | 'artistic' | 'cinematic' | 'minimalist'
  voice: string;           // voice_id from VOICE_OPTIONS
  captionStyle: CaptionStyle; // 'word-by-word' | 'full-sentence' | 'none'
};
```

**Response 201**
```typescript
type CreateVideoResponse = {
  data: {
    videoId: string;       // UUID — store in Zustand + sessionStorage
  };
};
```

**Error Codes**
| Code | HTTP | Condition |
|------|------|-----------|
| `AUTH_UNAUTHORIZED` | 401 | No valid Clerk session |
| `VALIDATION_MISSING_FIELD` | 400 | Missing required field |
| `VALIDATION_INVALID_INPUT` | 400 | Prompt length < 50 or > 500 chars; invalid theme/voice |
| `INTERNAL_ERROR` | 500 | DB insert failed |

**Server behaviour**: derives `userId` from `auth()`, calls `createVideo({ user_id, title: prompt.substring(0, 100), prompt, metadata: { voice, theme, captionStyle } })`.

---

## PATCHED: POST /api/video/generate

Script generation. **Patch**: remove `userId` from body (now derived from `auth()`). Add prompt length validation (already in AI layer but missing from route guard).

**Request**
```http
POST /api/video/generate
Content-Type: application/json
```

```typescript
type GenerateScriptRequest = {
  prompt: string;           // 50–500 chars
  theme: ScriptTheme;
  videoId: string;          // from POST /api/video response
  // userId REMOVED — derived from auth() server-side
};
```

**Response 200**
```typescript
type GenerateScriptResponse = {
  data: {
    totalDuration: number;
    scenes: Array<{
      sceneNumber: number;
      narration: string;
      visualDescription: string;
      durationSeconds: number;
      keywords: string[];
    }>;
  };
};
```

**Wizard normalisation** (client-side, after receiving response):
- If `scenes.length > MAX_SCENES (5)`: truncate to first 5
- If `scenes.length < MIN_SCENES (3)`: pad with blank scene objects

**Error Codes**
| Code | HTTP | Condition |
|------|------|-----------|
| `AUTH_UNAUTHORIZED` | 401 | No valid Clerk session |
| `CREDIT_INSUFFICIENT` | 402 | No credits available |
| `VALIDATION_INVALID_INPUT` | 400 | Prompt out of 50–500 range or invalid theme |
| `GENERATION_SCRIPT_FAILED` | 422 | AI returned invalid/out-of-range script |

---

## PATCHED: POST /api/video/images

Generate AI image for one or more scenes. **Patch**: remove `userId` from body (security fix from F007 code review note). Scene count capped to `MAX_SCENES`.

The wizard calls this **per-scene** (not batch) to achieve parallel generation. Each call is a single-scene request from the client's `Promise.allSettled()` fan-out.

**Request**
```http
POST /api/video/images
Content-Type: application/json
```

```typescript
type GenerateImagesRequest = {
  scenes: Array<{
    visualDescription: string;
    sceneNumber: number;
  }>;
  theme: ScriptTheme;
  videoId: string;
  // userId REMOVED — derived from auth() server-side
};
```

**Response 200**
```typescript
type GenerateImagesResponse = {
  data: {
    results: Array<{
      sceneNumber: number;
      status: 'success' | 'error';
      output?: {
        storageUrl: string;    // signed URL (1hr expiry)
        storagePath: string;
      };
      error?: string;
    }>;
    successCount: number;
    errorCount: number;
  };
};
```

**Error Codes**
| Code | HTTP | Condition |
|------|------|-----------|
| `AUTH_UNAUTHORIZED` | 401 | No valid Clerk session |
| `VALIDATION_MISSING_FIELD` | 400 | Missing scenes/theme/videoId |
| `GENERATION_IMAGE_FAILED` | 422 | AI returned invalid image (per scene, not whole request) |

---

## EXISTING (unchanged): POST /api/upload/image

User image upload. No changes to interface needed (server already uses `auth()` to derive userId if the implementation is correct — verify and patch if not).

**Request**
```http
POST /api/upload/image
Content-Type: multipart/form-data
```

```
file: <File>           JPEG | PNG | WebP, max 10MB
videoId: <string>      optional — associates image with video record
```

**Response 200**
```typescript
type UploadImageResponse = {
  data: {
    storageUrl: string;   // signed URL
    storagePath: string;
    fileSizeBytes: number;
  };
};
```

**Client-side pre-validation** (before sending FormData):
1. `file.size <= MAX_UPLOAD_SIZE_BYTES` (10MB)
2. `ALLOWED_UPLOAD_MIME_TYPES.includes(file.type)` (png/jpeg/webp)
3. Extension is `.png`, `.jpg`, `.jpeg`, or `.webp`

**Error Codes**
| Code | HTTP | Condition |
|------|------|-----------|
| `AUTH_UNAUTHORIZED` | 401 | No valid Clerk session |
| `VALIDATION_INVALID_INPUT` | 400 | Wrong MIME type or oversized |
| `STORAGE_UPLOAD_FAILED` | 500 | Supabase storage error |

---

## NEW: POST /api/video/render

Dispatches the fully-configured video job to the rendering pipeline. Performs server-side credit reservation and dispatches to the Renderer microservice (`POST https://renderer.reelzero.app/render`). This is the final wizard submission.

**Request**
```http
POST /api/video/render
Content-Type: application/json
```

```typescript
type RenderVideoRequest = {
  videoId: string;
  scenes: Array<{
    order: number;
    narration: string;
    visualDescription: string;
    imageUrl: string;       // must be non-null
    imageSource: 'ai' | 'upload';
    duration: number | null;
  }>;
  voice: string;            // voice_id
  theme: ScriptTheme;
  captionStyle: CaptionStyle;
  transitionType: TransitionType;
};
```

**Response 202** (accepted, rendering is async)
```typescript
type RenderVideoResponse = {
  data: {
    videoId: string;
    status: 'processing';   // rendering is underway
    estimatedSeconds: number; // ~70–90
  };
};
```

**Server behaviour**:
1. `auth()` → get `userId`
2. Validate request body (all scenes have `imageUrl`, correct counts)
3. `reserveCredit(userId)` — if fails → `CREDIT_INSUFFICIENT`
4. Update `videos.metadata` with final wizard choices
5. `POST <renderer>/render` with job payload
6. If renderer call fails → `refundCredit(userId)` + `RENDER_SERVICE_UNAVAILABLE`
7. Return `202` with `videoId`

**Error Codes**
| Code | HTTP | Condition |
|------|------|-----------|
| `AUTH_UNAUTHORIZED` | 401 | No valid Clerk session |
| `CREDIT_INSUFFICIENT` | 402 | No credits available |
| `VALIDATION_MISSING_FIELD` | 400 | Missing required field or scene without imageUrl |
| `VALIDATION_INVALID_INPUT` | 400 | Scene count out of range |
| `RENDER_SERVICE_UNAVAILABLE` | 503 | Renderer microservice unreachable |
| `RENDER_FAILED` | 500 | Renderer returned error synchronously |

---

## NEW: GET /api/user/credits (existing from F006, used in wizard)

Used by `useCredits()` hook to gate the Step 4 submit button. No changes needed.

**Response 200**
```typescript
type CreditsResponse = {
  data: {
    creditsRemaining: number;
    creditsTotal: number;
    creditsUsed: number;
    canGenerate: boolean;   // false when creditsRemaining === 0 or status === 'canceled'
    tier: 'free' | 'basic' | 'pro' | 'enterprise';
    status: 'active' | 'past_due' | 'trialing' | 'canceled';
  };
};
```

---

## Route Security Summary

| Route | userId Source | Patched? |
|-------|--------------|----------|
| `POST /api/video` | `auth()` | NEW |
| `POST /api/video/generate` | `auth()` | ✅ already correct |
| `POST /api/video/images` | `auth()` | **PATCH** (remove body `userId`) |
| `POST /api/upload/image` | `auth()` | verify + patch if needed |
| `POST /api/video/render` | `auth()` | NEW |
| `GET /api/user/credits` | `auth()` | ✅ already correct |
