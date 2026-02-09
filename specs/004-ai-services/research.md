# Research: AI Service Integration

**Feature**: 004-ai-services
**Date**: 2026-02-08

## 1. Script Generation — Gemini 2.5 Flash

### Decision
Use `gemini-2.5-flash` model via the `generateContent` REST endpoint with structured JSON output.

### Rationale
- Latest stable Flash model with 10 RPM / 250 RPD on free tier
- Native JSON output mode via `responseMimeType: "application/json"` + `responseJsonSchema`
- Same auth pattern (`x-goog-api-key` header) as image generation — consistent across services
- `gemini-2.0-flash` is previous generation; 2.5 Flash is the recommended stable model

### Alternatives Considered
- **Gemini 2.0 Flash**: Previous gen, higher RPM (15) but lower RPD (200). No `responseJsonSchema` support — would need prompt-only JSON enforcement.
- **Gemini 2.5 Pro**: Better quality but only 2 RPM / 50 RPD on free tier. Overkill for script generation.
- **OpenAI GPT-4o**: Not in current stack, adds a separate API key + billing. Deferred as future provider option.

### Key Implementation Details
- **Endpoint**: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
- **Auth**: `x-goog-api-key: ${GEMINI_API_KEY}` header
- **JSON output**: `generationConfig.responseMimeType = "application/json"` + `generationConfig.responseJsonSchema` with the script schema
- **Gotcha**: Response text is a JSON **string** inside `candidates[0].content.parts[0].text` — must `JSON.parse()` it
- **Error format**: `{ error: { code: number, message: string, status: string } }` — codes: 400 (invalid), 429 (rate limit), 500 (server)
- **Rate limits (free)**: 10 RPM, 250,000 TPM, 250 RPD

## 2. Image Generation — Gemini 2.5 Flash Image

### Decision
Use `gemini-2.5-flash-image` model via the native `generateContent` endpoint with `aspectRatio: "1:1"` for 1024x1024 images.

### Rationale
- Uses same auth pattern (`x-goog-api-key`) and endpoint structure as text generation
- Supports aspect ratio control (1:1 → 1024x1024)
- Available on free tier (Imagen 3 via OpenAI endpoint is paid-only)
- Optimized for speed — suitable for generating 5 images per video

### Alternatives Considered
- **Imagen 3 via OpenAI-compatible endpoint**: Simpler request format but **paid tier only**, different auth (Bearer token), no size control.
- **Gemini 3 Pro Image Preview**: Higher quality, up to 4K, but slower and more expensive. Overkill for 1024x1024 scene images.
- **DALL-E 3**: Separate OpenAI API + billing. Deferred as future provider option.

### Key Implementation Details
- **Endpoint**: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`
- **Request config**: `generationConfig.responseModalities = ["IMAGE"]`, `generationConfig.imageConfig.aspectRatio = "1:1"`
- **Response**: Base64 PNG in `candidates[0].content.parts[N].inlineData.data` (mime: `image/png`)
- **Must check**: Iterate parts to find the one with `inlineData` (may include text parts too)
- **Rate limits (free)**: 10 RPM, 200,000 TPM, 100 RPD — most restrictive of all services

## 3. Text-to-Speech — ElevenLabs with-timestamps

### Decision
Use the non-streaming `/v1/text-to-speech/{voice_id}/with-timestamps` endpoint with `eleven_multilingual_v2` model.

### Rationale
- Non-streaming is simpler for server-side processing — returns complete audio + alignment in one response
- `eleven_multilingual_v2` offers high quality with multilingual support
- Character-level alignment can be aggregated into word-level timestamps client-side
- Streaming endpoint available as future optimization if needed

### Alternatives Considered
- **Streaming endpoint** (`/stream/with-timestamps`): More complex (chunked responses), better for real-time playback. Deferred — not needed for server-side generation.
- **eleven_flash_v2_5**: Lower latency (~135ms) but lower quality. Could be offered as "fast" option later.
- **OpenAI TTS**: No word-level alignment support. Eliminated.

### Key Implementation Details
- **Endpoint**: `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps`
- **Auth**: `xi-api-key: ${ELEVENLABS_API_KEY}` header
- **Response**: `{ audio_base64: string, alignment: { characters: string[], character_start_times_seconds: number[], character_end_times_seconds: number[] }, normalized_alignment: {...} }`
- **Critical**: Returns **character-level** timing, NOT word-level. Must aggregate characters into words by splitting on whitespace boundaries.
- **Use `normalized_alignment`** for timing — matches what was actually spoken (handles number expansion, abbreviations, etc.)
- **Max text per request**: 5,000 characters
- **Audio format**: base64-encoded MP3 (default `mp3_44100_128`)
- **Error format**: `{ detail: { status: string, message: string } }` — codes: 401, 422, 429, 403 (quota exceeded)
- **Rate limits**: Free = 10K chars/month (~7 videos), Starter = 30K, Creator = 100K, Pro = 500K

## 4. Image Processing — Sharp

### Decision
Use `sharp` (already installed, v0.34.5) with `fit: 'cover'` for fill+crop resizing.

### Rationale
- Already in the project's `node_modules` — no new dependency needed
- Native C library (libvips) — extremely fast image processing
- Works in Next.js API routes (Node.js runtime) and on Vercel
- Built-in metadata validation for corrupt/invalid images

### Key Implementation Details
- **Resize**: `sharp(buffer).resize(1080, 1920, { fit: 'cover', position: 'centre' }).jpeg({ quality: 90 }).toBuffer()`
- **AI images**: Use `position: 'centre'` (consistent center crop for AI-generated content)
- **User uploads**: Use `position: 'attention'` (smart crop focusing on interesting areas)
- **Validation**: `sharp(buffer).metadata()` returns `{ width, height, format }` — throws on invalid/corrupt images
- **Strict mode**: `sharp(buffer, { failOn: 'warning' })` for strictest validation
- **Input**: Accepts Buffer from base64 decode or file upload — auto-detects format
- **Output**: `.jpeg({ quality: 90, mozjpeg: true })` for optimized JPEG, `.toBuffer({ resolveWithObject: true })` for size info
- **Vercel**: Prebuilt `@img/sharp-linux-x64` binary auto-installs. ~7-10 MB bundle addition.
- **Edge Runtime**: NOT supported — must use Node.js runtime (default for Route Handlers)

## 5. Retry Strategy

### Decision
Exponential backoff with jitter, max 3 retries, for all external AI service calls.

### Rationale
- All three providers return 429 for rate limiting — exponential backoff is the standard approach
- Adding jitter prevents thundering herd when multiple users hit limits simultaneously
- 3 retries covers transient failures without excessive delay

### Implementation Details
- **Base delay**: 1000ms
- **Backoff formula**: `baseDelay * 2^attempt + random(0, 500)ms`
- **Retry delays**: ~1s, ~2.5s, ~4.5s (approximately)
- **Total max wait**: ~8 seconds before final failure
- **Retryable conditions**: HTTP 429, 500, 503, network errors
- **Non-retryable**: HTTP 400 (bad input), 401 (auth), 403 (quota exhausted)
