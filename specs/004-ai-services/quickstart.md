# Quickstart: AI Service Integration

**Feature**: 004-ai-services
**Date**: 2026-02-08

## Prerequisites

- F001 (Foundation) completed — error system, constants, types (video.ts, scene.ts, voices.ts, video.ts)
- F002 (Design System) completed — UI components, API client
- F003 (Database & User Sync) completed — Supabase client, schema types, query layer, storage helper, storage buckets
- Branch `004-ai-services` checked out
- Environment variables set: `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`

## Implementation Steps

### Step 1: Create AI Constants

Add AI-specific constants to `src/lib/constants/ai.ts` — prompt length limits, TTS character limit, image sizes, upload limits, retry configuration.

**Files**: `src/lib/constants/ai.ts`

### Step 2: Create AI Config Module

Create `src/lib/ai/config.ts` with provider configuration — Gemini text/image endpoints and model names, ElevenLabs base URL and default model. Reads from environment variables.

**Files**: `src/lib/ai/config.ts`

### Step 3: Create AI Type Definitions

Create `src/lib/ai/types.ts` with all input/output types for text generation, image generation, and TTS. Include `WordAlignment`, provider types, and retry option types.

**Files**: `src/lib/ai/types.ts`

### Step 4: Create Retry Utility

Create `src/lib/ai/retry.ts` with a generic `withRetry` function implementing exponential backoff with jitter. Accepts any async function and retry options. Distinguishes retryable (429, 500, 503) from non-retryable (400, 401, 403) errors.

**Files**: `src/lib/ai/retry.ts`

### Step 5: Create Prompt Templates

Create `src/lib/prompts/types.ts` with `ScriptPromptInput` and `ImagePromptInput` types. Create `src/lib/prompts/script-generation.ts` with `buildScriptPrompt()` that constructs the full Gemini prompt with JSON schema instructions. Create `src/lib/prompts/image-generation.ts` with `buildImagePrompt()` that combines visual description, theme style guide, and aspect requirements.

**Files**: `src/lib/prompts/types.ts`, `src/lib/prompts/script-generation.ts`, `src/lib/prompts/image-generation.ts`

### Step 6: Create Voice ID Mapping

Create `src/lib/ai/voice-map.ts` mapping application voice IDs (from `voices.ts`) to actual ElevenLabs voice IDs. Export a `resolveVoiceId()` function.

**Files**: `src/lib/ai/voice-map.ts`

### Step 7: Implement Text Generation (Gemini)

Create `src/lib/ai/text-generation.ts` with `generateText()` function. Calls the Gemini 2.5 Flash `generateContent` endpoint with `responseMimeType: "application/json"` and `responseJsonSchema`. Parses the JSON response from `candidates[0].content.parts[0].text`. Uses `withRetry` for resilience. Logs to `generation_logs` via the query layer.

**Files**: `src/lib/ai/text-generation.ts`

### Step 8: Implement Script Generation

Create `src/lib/ai/script-generation.ts` with `generateScript()` that orchestrates: validates prompt length → builds prompt via template → calls `generateText()` → parses and validates the script output (scene count 3-5, duration 50-60s) → logs to generation_logs → returns typed `GeneratedScript`.

**Files**: `src/lib/ai/script-generation.ts`

### Step 9: Implement Image Generation (Gemini Flash Image)

Create `src/lib/ai/image-generation.ts` with `generateImage()` function. Calls Gemini 2.5 Flash Image `generateContent` endpoint with `responseModalities: ["IMAGE"]` and `imageConfig.aspectRatio: "1:1"`. Extracts base64 PNG from `inlineData.data`. Uses `withRetry`.

**Files**: `src/lib/ai/image-generation.ts`

### Step 10: Implement Image Processing (Sharp)

Create `src/lib/ai/image-processing.ts` with `processImage()` (resize to 1080x1920 with `fit: 'cover'`) and `validateImage()` (check format, dimensions, integrity via Sharp metadata). Centre crop for AI images, attention crop for user uploads.

**Files**: `src/lib/ai/image-processing.ts`

### Step 11: Implement Scene Image Generation Pipeline

Create `src/lib/ai/scene-image-generation.ts` with `generateSceneImage()` (single scene: generate → validate → resize → upload to storage → log) and `generateSceneImages()` (batch: sequential with per-scene error isolation, partial success). Each scene image stored as `{userId}/scene-{videoId}-{sceneNumber}.jpg`.

**Files**: `src/lib/ai/scene-image-generation.ts`

### Step 12: Implement TTS Generation (ElevenLabs)

Create `src/lib/ai/tts.ts` with `generateAudio()` function. Calls the `/v1/text-to-speech/{voice_id}/with-timestamps` endpoint. Extracts `audio_base64` and `normalized_alignment`. Aggregates character-level timing into word-level `WordAlignment[]`. Uploads MP3 to storage. Logs to generation_logs.

**Files**: `src/lib/ai/tts.ts`

### Step 13: Implement User Image Upload

Create `src/lib/ai/image-upload.ts` with `uploadUserImage()` function. Validates file size (≤ 10MB), MIME type (PNG/JPEG/WebP), and image integrity (Sharp metadata). Resizes to 1080x1920 with `position: 'attention'`. Uploads to storage. Creates `uploaded_images` DB record.

**Files**: `src/lib/ai/image-upload.ts`

### Step 14: Create API Route — Script Generation

Create `src/app/api/video/generate/route.ts` with POST handler. Validates auth → validates prompt length → calls `generateScript()` → returns standardized JSON response.

**Files**: `src/app/api/video/generate/route.ts`

### Step 15: Create API Route — Image Generation

Create `src/app/api/video/images/route.ts` with POST handler. Validates auth → accepts scene descriptions + theme → calls `generateSceneImages()` → returns batch results.

**Files**: `src/app/api/video/images/route.ts`

### Step 16: Create API Route — Audio Generation

Create `src/app/api/video/audio/route.ts` with POST handler. Validates auth → validates narration length → calls `generateAudio()` → returns audio URL + alignment.

**Files**: `src/app/api/video/audio/route.ts`

### Step 17: Create API Route — Image Upload

Create `src/app/api/upload/images/route.ts` with POST handler. Validates auth → validates file → calls `uploadUserImage()` → returns image URL.

**Files**: `src/app/api/upload/images/route.ts`

### Step 18: Build Verification

Run `tsc --noEmit`, `npm run lint`, and `npm run build` to verify no errors.

## Verification Checklist

1. [ ] `src/lib/ai/config.ts` exports `AI_CONFIG` with Gemini and ElevenLabs settings
2. [ ] `src/lib/ai/types.ts` exports all AI input/output types, no `any` types
3. [ ] `src/lib/ai/retry.ts` — `withRetry` retries on 429/500/503, does not retry on 400/401/403
4. [ ] `src/lib/prompts/script-generation.ts` — `buildScriptPrompt()` returns a well-formed prompt string
5. [ ] `src/lib/prompts/image-generation.ts` — `buildImagePrompt()` includes theme style guide
6. [ ] `src/lib/ai/text-generation.ts` — calls Gemini 2.5 Flash with JSON response mode
7. [ ] `src/lib/ai/script-generation.ts` — validates scene count (3-5) and duration (50-60s)
8. [ ] `src/lib/ai/image-generation.ts` — calls Gemini 2.5 Flash Image, extracts base64 from inlineData
9. [ ] `src/lib/ai/image-processing.ts` — resizes to 1080x1920 with `fit: 'cover'`; centre for AI, attention for uploads
10. [ ] `src/lib/ai/scene-image-generation.ts` — batch generates sequentially, partial success supported
11. [ ] `src/lib/ai/tts.ts` — calls ElevenLabs with-timestamps, aggregates char-level to word-level alignment
12. [ ] `src/lib/ai/image-upload.ts` — validates size ≤ 10MB, validates MIME, validates integrity, resizes
13. [ ] All AI service functions auto-log to `generation_logs` (stage, status, duration_ms, error_message)
14. [ ] `POST /api/video/generate` returns structured script JSON
15. [ ] `POST /api/video/images` returns batch image results with per-scene status
16. [ ] `POST /api/video/audio` returns audio URL + word-level alignment
17. [ ] `POST /api/upload/images` returns stored image URL
18. [ ] All prompts live in `src/lib/prompts/`, no inline prompt strings
19. [ ] No direct AI API calls outside `src/lib/ai/`
20. [ ] `tsc --noEmit` passes with zero errors
21. [ ] `npm run lint` passes with zero warnings
22. [ ] `npm run build` succeeds
