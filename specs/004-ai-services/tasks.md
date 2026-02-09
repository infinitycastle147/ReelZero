# Tasks: AI Service Integration

**Input**: Design documents from `/specs/004-ai-services/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: No test tasks included (not requested in feature specification).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root (Next.js App Router)
- No new database tables or migrations — uses existing F003 tables and storage buckets

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Constants, configuration, types, and utilities shared by all AI services

- [x] T001 [P] Create AI constants (prompt limits, TTS limits, image sizes, upload limits, retry config) in `src/lib/constants/ai.ts`
- [x] T002 [P] Create AI provider configuration (Gemini endpoints/models, ElevenLabs base URL/model) in `src/lib/ai/config.ts`
- [x] T003 [P] Create AI type definitions (TextGenerationInput/Output, ImageGenerationInput/Output, TTSInput/Output, WordAlignment, RetryOptions, GeneratedScript, GeneratedScene, ScriptTheme, BatchImageResult, ProcessImageInput/Output, ValidateImageResult) in `src/lib/ai/types.ts`
- [x] T004 [P] Create prompt template types (ScriptPromptInput, ImagePromptInput) in `src/lib/prompts/types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create retry utility with `withRetry()` function implementing exponential backoff with jitter (base 1000ms, max 3 retries, jitter 0-500ms), distinguishing retryable (429, 500, 503) from non-retryable (400, 401, 403) errors in `src/lib/ai/retry.ts`
- [x] T006 [P] Create image processing module with `processImage()` (Sharp resize to 1080x1920, `fit: 'cover'`, centre/attention crop modes) and `validateImage()` (Sharp metadata check for format, dimensions, integrity) in `src/lib/ai/image-processing.ts`
- [x] T007 [P] Create script generation prompt template with `buildScriptPrompt()` in `src/lib/prompts/script-generation.ts` — constructs full Gemini prompt with scene count, target duration, theme, and JSON output instructions
- [x] T008 [P] Create image generation prompt template with `buildImagePrompt()` in `src/lib/prompts/image-generation.ts` — combines visual description with theme style guide (realistic, anime, artistic, cinematic, minimalist) and aspect requirements
- [x] T009 [P] Create voice ID mapping with `resolveVoiceId()` function mapping app voice IDs (voice_adam, voice_bella, voice_charlie, voice_diana, voice_echo) to ElevenLabs voice IDs in `src/lib/ai/voice-map.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 — Generate a Video Script from a Text Prompt (Priority: P1) MVP

**Goal**: A signed-in user submits a text prompt and receives a structured JSON script with 3-5 scenes, narration, visual descriptions, durations, and keywords totaling 50-60 seconds.

**Independent Test**: `POST /api/video/generate` with a valid prompt (50-500 chars) and theme → returns valid JSON script with 3-5 scenes, each having narration, visual description, duration (10-12s), and keywords. Total duration 50-60s.

### Implementation for User Story 1

- [x] T010 [US1] Implement `generateText()` in `src/lib/ai/text-generation.ts` — calls Gemini 2.5 Flash `generateContent` endpoint with `responseMimeType: "application/json"` and `responseJsonSchema`, parses JSON from `candidates[0].content.parts[0].text`, uses `withRetry`, handles Gemini error format `{ error: { code, message, status } }`, maps content-policy rejections (HTTP 400 with SAFETY/RECITATION finish reasons) to `GENERATION_SCRIPT_FAILED` with user-friendly message per FR-017
- [x] T011 [US1] Implement `generateScript()` in `src/lib/ai/script-generation.ts` — orchestrates: validate prompt length (50-500 chars) → build prompt via `buildScriptPrompt()` → call `generateText()` with script JSON schema → parse and validate output (scene count 3-5, total duration 50-60s) → auto-log to `generation_logs` via query layer → return typed `GeneratedScript`
- [x] T012 [US1] Create API route handler `POST /api/video/generate` in `src/app/api/video/generate/route.ts` — validate auth via Clerk → validate request body (prompt, theme) → call `generateScript()` → return standardized `{ data: GeneratedScript }` response or `{ error: { code, message } }` on failure

**Checkpoint**: Script generation endpoint is fully functional and testable independently

---

## Phase 4: User Story 2 — Generate Scene Images from Visual Descriptions (Priority: P1)

**Goal**: Generate one AI image per scene using visual descriptions, resize from 1024x1024 to 1080x1920 portrait, store in Supabase Storage. Supports single and batch generation with per-scene error isolation.

**Independent Test**: `POST /api/video/images` with scene descriptions and theme → returns batch results with per-scene status, each successful scene having a stored image URL with 1080x1920 portrait dimensions.

### Implementation for User Story 2

- [x] T013 [US2] Implement `generateImage()` in `src/lib/ai/image-generation.ts` — calls Gemini 2.5 Flash Image `generateContent` endpoint with `responseModalities: ["IMAGE"]` and `imageConfig.aspectRatio: "1:1"`, iterates response parts to find `inlineData`, extracts base64 PNG, uses `withRetry`, handles Gemini error format, maps content-policy rejections to `GENERATION_IMAGE_FAILED` with user-friendly message per FR-017
- [x] T014 [US2] Implement `generateSceneImage()` and `generateSceneImages()` in `src/lib/ai/scene-image-generation.ts` — single scene pipeline: generate image → validate with Sharp → resize to 1080x1920 (centre crop) → upload to `images` bucket as `{userId}/scene-{videoId}-{sceneNumber}.jpg` → auto-log to `generation_logs`. Batch: sequential with per-scene error isolation, returns `BatchImageResult` with success/error counts
- [x] T015 [US2] Create API route handler `POST /api/video/images` in `src/app/api/video/images/route.ts` — validate auth via Clerk → validate request body (scenes array with visualDescription + theme, videoId, userId) → call `generateSceneImages()` → return standardized `{ data: BatchImageResult }` response

**Checkpoint**: Image generation endpoint is fully functional — can generate and store scene images independently

---

## Phase 5: User Story 3 — Generate Narration Audio with Word-Level Timing (Priority: P1)

**Goal**: Generate MP3 narration audio from combined scene text using ElevenLabs, with word-level alignment data for caption synchronization. Audio stored in Supabase Storage.

**Independent Test**: `POST /api/video/audio` with narration text and voice selection → returns stored audio URL and word-level alignment data with start/end timestamps for each word.

### Implementation for User Story 3

- [x] T016 [US3] Implement `generateAudio()` in `src/lib/ai/tts.ts` — validate narration length (≤ 5000 chars) → resolve voice ID via `resolveVoiceId()` → call ElevenLabs `/v1/text-to-speech/{voice_id}/with-timestamps` with `eleven_multilingual_v2` model → extract `audio_base64` and `normalized_alignment` → aggregate character-level timing into word-level `WordAlignment[]` (split on whitespace: word start = first char start, word end = last char end) → decode base64 to Buffer → upload MP3 to `audio` bucket as `{userId}/{videoId}.mp3` → auto-log to `generation_logs` → map content-policy/quota rejections (HTTP 403/422) to `GENERATION_AUDIO_FAILED` with user-friendly message per FR-017 → return `GenerateAudioOutput` with storageUrl, alignment, durationSeconds
- [x] T017 [US3] Create API route handler `POST /api/video/audio` in `src/app/api/video/audio/route.ts` — validate auth via Clerk → validate request body (narrationText, voiceId, videoId, userId) → validate narration ≤ 5000 chars → call `generateAudio()` → return standardized `{ data: { storageUrl, alignment, durationSeconds } }` response

**Checkpoint**: Audio generation endpoint is fully functional — can generate narration with word-level alignment independently

---

## Phase 6: User Story 4 — Upload Custom Images for Scenes (Priority: P2)

**Goal**: User uploads a custom image (PNG/JPEG/WebP, ≤ 10MB) to replace an AI-generated scene image. Image is validated, resized to 1080x1920 portrait, stored, and recorded in the database.

**Independent Test**: `POST /api/upload/images` with a valid JPEG → returns stored image URL after resize to 1080x1920. Also test rejection of invalid formats and oversized files.

### Implementation for User Story 4

- [x] T018 [US4] Implement `uploadUserImage()` in `src/lib/ai/image-upload.ts` — validate file size (≤ 10MB via `MAX_UPLOAD_SIZE_BYTES`) → validate MIME type (PNG/JPEG/WebP via `ALLOWED_UPLOAD_MIME_TYPES`) → validate image integrity via `validateImage()` → resize to 1080x1920 with `position: 'attention'` via `processImage()` → upload to `images` bucket → create `uploaded_images` DB record via query layer → return `UploadImageOutput` with storageUrl, storagePath, fileSizeBytes
- [x] T019 [US4] Create API route handler `POST /api/upload/images` in `src/app/api/upload/images/route.ts` — validate auth via Clerk → parse multipart FormData → extract file Buffer, originalFilename, mimeType → call `uploadUserImage()` → return standardized `{ data: { storageUrl, storagePath, fileSizeBytes } }` response or validation error

**Checkpoint**: User image upload endpoint is fully functional — can upload, validate, resize, and store images independently

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Build verification and final quality checks

- [x] T020 Run `tsc --noEmit` to verify zero TypeScript errors across all new files
- [x] T021 Run `npm run lint` to verify zero ESLint warnings across all new files
- [x] T022 Run `npm run build` to verify successful Next.js production build
- [x] T023 Verify no direct AI API calls exist outside `src/lib/ai/` (codebase search)
- [x] T024 Verify no inline prompt strings exist outside `src/lib/prompts/` (codebase search)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately. All 4 tasks are parallelizable.
- **Foundational (Phase 2)**: Depends on Phase 1 completion. T005 (retry) has no internal dependencies; T006-T009 are parallelizable.
- **US1 Script Generation (Phase 3)**: Depends on Phase 2 (needs retry, prompt templates). T010 → T011 → T012 (sequential).
- **US2 Image Generation (Phase 4)**: Depends on Phase 2 (needs retry, image processing, image prompt). T013 → T014 → T015 (sequential). Can run in parallel with US1.
- **US3 Audio Generation (Phase 5)**: Depends on Phase 2 (needs retry, voice map). T016 → T017 (sequential). Can run in parallel with US1 and US2.
- **US4 Image Upload (Phase 6)**: Depends on Phase 2 (needs image processing). T018 → T019 (sequential). Can run in parallel with US1-US3.
- **Polish (Phase 7)**: Depends on all user stories being complete.

### User Story Dependencies

- **US1 (Script Generation)**: Independent — no dependency on other user stories
- **US2 (Image Generation)**: Independent — no dependency on other user stories
- **US3 (Audio Generation)**: Independent — no dependency on other user stories
- **US4 (Image Upload)**: Independent — no dependency on other user stories

### Within Each User Story

- Service implementation before API route handler
- Core AI function before orchestrator function (e.g., `generateText` before `generateScript`)

### Parallel Opportunities

**Phase 1** — All 4 tasks (T001-T004) can run in parallel:
```
T001 (constants) || T002 (config) || T003 (types) || T004 (prompt types)
```

**Phase 2** — After T005 (retry), remaining tasks are parallel:
```
T005 (retry) → then: T006 (image processing) || T007 (script prompt) || T008 (image prompt) || T009 (voice map)
```

**Phases 3-6** — All four user stories can run in parallel after Phase 2:
```
US1: T010 → T011 → T012
US2: T013 → T014 → T015  (parallel with US1)
US3: T016 → T017          (parallel with US1, US2)
US4: T018 → T019          (parallel with US1, US2, US3)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004) — ~4 parallel tasks
2. Complete Phase 2: Foundational (T005-T009) — retry first, then 4 parallel tasks
3. Complete Phase 3: User Story 1 (T010-T012) — sequential
4. **STOP and VALIDATE**: Test `POST /api/video/generate` independently
5. Deploy/demo if ready — script generation is the most foundational capability

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Script) → Test → Deploy (MVP!)
3. Add US2 (Images) → Test → Deploy
4. Add US3 (Audio) → Test → Deploy
5. Add US4 (Upload) → Test → Deploy
6. Polish phase → Final validation

### Recommended Execution (Solo Developer)

Since all user stories are independent after Phase 2, execute in priority order:

1. **Phase 1 + 2**: Setup + Foundational (~9 tasks)
2. **Phase 3**: US1 Script Generation (~3 tasks) → validate
3. **Phase 4**: US2 Image Generation (~3 tasks) → validate
4. **Phase 5**: US3 Audio Generation (~2 tasks) → validate
5. **Phase 6**: US4 Image Upload (~2 tasks) → validate
6. **Phase 7**: Polish (~5 tasks) → final build verification

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- No new npm dependencies needed — `sharp` already installed
- No new database tables or migrations — uses existing F003 infrastructure
- All AI calls through `src/lib/ai/`, all prompts in `src/lib/prompts/` (Constitution Principle I)
- All database access through `src/lib/db/queries/` (Constitution Principle IV)
