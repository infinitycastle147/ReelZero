# Feature Specification: AI Service Integration (Script + Image + TTS)

**Feature Branch**: `004-ai-services`
**Created**: 2026-02-08
**Status**: Draft
**Input**: User description: "AI Service Integration - Script generation via Gemini Flash, image generation via Gemini Flash Image, text-to-speech via ElevenLabs with word-level alignment, user image uploads, retry logic with exponential backoff, prompt templates, and storage of generated assets"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate a Video Script from a Text Prompt (Priority: P1)

A signed-in user enters a text prompt describing the video they want (e.g., "5 interesting facts about black holes"). The system sends this prompt along with the user's chosen theme to an AI text-generation service and returns a structured script containing exactly 3-5 scenes. Each scene includes narration text, a visual description for image generation, duration in seconds, and relevant keywords. The total script duration targets 50-60 seconds.

**Why this priority**: Script generation is the first step in the entire video creation pipeline. Without a script, no images or audio can be produced. This is the foundational AI capability.

**Independent Test**: Submit a text prompt via the script generation endpoint. Verify the response contains a valid JSON script with 3-5 scenes, each having narration, visual description, duration, and keywords. Total duration should be 50-60 seconds.

**Acceptance Scenarios**:

1. **Given** a signed-in user with a valid prompt (50-500 characters), **When** the user requests script generation with a theme preference, **Then** the system returns a structured JSON script with 3-5 scenes totaling 50-60 seconds
2. **Given** a signed-in user with a prompt shorter than 50 characters, **When** the user requests script generation, **Then** the system rejects the request with a validation error
3. **Given** a signed-in user, **When** the AI text service is temporarily unavailable, **Then** the system retries up to 3 times with increasing delays before returning a descriptive error
4. **Given** a signed-in user, **When** the AI returns malformed or non-JSON output, **Then** the system retries once and, if still invalid, returns a generation failure error

---

### User Story 2 - Generate Scene Images from Visual Descriptions (Priority: P1)

A signed-in user has a script with scene visual descriptions. The system generates one AI image per scene using the visual description and the user's chosen theme. Images are generated at 1024x1024 resolution, resized to 1080x1920 (portrait), and stored in cloud storage. The system supports generating images one at a time or in batch (all scenes at once).

**Why this priority**: Scene images are the second critical step in the pipeline. Each video needs one image per scene, and this must work before audio and rendering can proceed.

**Independent Test**: Submit a visual description and theme to the image generation endpoint. Verify a portrait-oriented image is returned and stored, with a valid URL accessible for downstream rendering.

**Acceptance Scenarios**:

1. **Given** a valid visual description and theme, **When** the user requests image generation for a single scene, **Then** the system returns a stored image URL with 1080x1920 portrait dimensions
2. **Given** 3-5 scene descriptions, **When** the user requests batch image generation, **Then** the system generates images sequentially and returns URLs for each successful scene (partial success is acceptable if some scenes fail)
3. **Given** an image generation request, **When** the AI image service is unavailable or rate-limited, **Then** the system retries with exponential backoff before returning an error
4. **Given** an image generation request, **When** the AI returns an invalid or empty image, **Then** the system retries once and reports a generation failure if still invalid

---

### User Story 3 - Generate Narration Audio with Word-Level Timing (Priority: P1)

A signed-in user has an approved script. The system sends the combined narration text to a text-to-speech service, specifying the user's chosen voice. The service returns an audio file (MP3) along with word-level alignment data (start and end timestamps for each word). The audio file is stored in cloud storage. The alignment data is essential for caption synchronization during video rendering.

**Why this priority**: Audio with word-level alignment is the third core AI capability. The alignment data is critical for caption rendering and scene timing in the final video.

**Independent Test**: Submit narration text and a voice selection to the audio generation endpoint. Verify an MP3 audio file is returned and stored, along with word-level alignment data containing start/end times for each word.

**Acceptance Scenarios**:

1. **Given** a full narration script and a valid voice selection, **When** the user requests audio generation, **Then** the system returns a stored audio URL and word-level alignment data with start/end timestamps
2. **Given** a narration script, **When** the user selects from the 5 available voices (Adam, Bella, Charlie, Diana, Echo), **Then** the audio is generated using the selected voice
3. **Given** an audio generation request, **When** the TTS service is unavailable, **Then** the system retries with exponential backoff before returning an error
4. **Given** an audio generation request, **When** the returned alignment data is missing or incomplete, **Then** the system returns a generation failure error (alignment data is required for video rendering)

---

### User Story 4 - Upload Custom Images for Scenes (Priority: P2)

A signed-in user wants to use their own image for a scene instead of an AI-generated one. The user uploads an image file (PNG, JPEG, or WebP, max 10MB). The system validates the file format and size, resizes it to 1080x1920 portrait orientation, and stores it in cloud storage. The uploaded image URL can then replace the AI-generated image for that scene.

**Why this priority**: User image uploads add personalization but are not required for the core AI-generated video flow. Users can create complete videos without uploading any images.

**Independent Test**: Upload a valid JPEG image. Verify it is validated, resized to 1080x1920, stored, and a valid URL is returned. Also test rejection of invalid formats and oversized files.

**Acceptance Scenarios**:

1. **Given** a signed-in user with a valid image (PNG, JPEG, or WebP, under 10MB), **When** the user uploads the image, **Then** the system resizes it to 1080x1920, stores it, and returns a URL
2. **Given** a signed-in user with a file that is not an image (e.g., PDF, video), **When** the user attempts upload, **Then** the system rejects it with a validation error
3. **Given** a signed-in user with an image over 10MB, **When** the user attempts upload, **Then** the system rejects it with a file-size error
4. **Given** a signed-in user, **When** the image storage service fails during upload, **Then** the system returns a storage error

---

### Edge Cases

- What happens when the AI returns a script with fewer than 3 or more than 5 scenes? System must validate scene count and reject/retry if out of range.
- What happens when a generated image is corrupted or zero-bytes? System must detect and retry, returning an error after max retries.
- What happens when the narration text exceeds the TTS service character limit? System must validate text length before sending to the TTS service.
- What happens when multiple image generation requests hit rate limits? System must queue and retry with backoff, not fail immediately.
- What happens when an uploaded image is valid format but has zero dimensions or is corrupted? System must validate image integrity before processing.
- What happens when the user's prompt contains harmful or prohibited content? System must rely on the AI provider's built-in content moderation and handle content-policy rejection responses gracefully.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept a text prompt (50-500 characters) and a theme preference, and return a structured script as JSON with 3-5 scenes
- **FR-002**: Each generated scene MUST contain: narration text, visual description, duration in seconds (10-12s each), and keywords
- **FR-003**: Generated scripts MUST total 50-60 seconds of combined scene duration
- **FR-004**: System MUST generate images from visual descriptions at 1024x1024 resolution and resize to 1080x1920 portrait orientation
- **FR-005**: System MUST support both single-image and batch-image generation (sequential, one scene at a time, with per-scene error isolation — partial success is acceptable)
- **FR-006**: System MUST generate audio (MP3) from narration text using a user-selected voice
- **FR-007**: Audio generation MUST return word-level alignment data with start and end timestamps for each word
- **FR-008**: System MUST store all generated assets (images, audio) in cloud storage and return accessible URLs
- **FR-009**: System MUST accept user-uploaded images (PNG, JPEG, WebP) up to 10MB and resize to 1080x1920
- **FR-010**: System MUST validate uploaded file format, size, and image integrity before processing
- **FR-011**: System MUST retry failed AI service calls up to 3 times with exponential backoff before returning an error
- **FR-012**: System MUST validate script generation output against expected JSON structure and scene count (3-5 scenes)
- **FR-013**: System MUST use centralized, reusable prompt templates for script and image generation (not inline strings)
- **FR-014**: System MUST support 5 voice options for TTS (Adam, Bella, Charlie, Diana, Echo)
- **FR-015**: System MUST provide a provider abstraction layer so that AI providers can be swapped without changing business logic
- **FR-016**: System MUST validate narration text length before sending to TTS service to prevent exceeding provider character limits
- **FR-017**: System MUST handle AI provider content-policy rejections gracefully and return user-friendly error messages
- **FR-018**: Each AI service call (script, image, audio) MUST automatically create a generation_log entry recording stage, status (success/error), duration, and error message if applicable

### Key Entities

- **Script**: A structured representation of a video's narrative content, containing 3-5 scenes with narration, visual descriptions, durations, and keywords. Total duration 50-60 seconds.
- **Scene Image**: A portrait-oriented (1080x1920) image associated with a video scene. Can be AI-generated from a visual description or user-uploaded.
- **Narration Audio**: An MP3 audio file of the full video narration in a selected voice, accompanied by word-level alignment timing data.
- **Alignment Data**: Word-level timing information mapping each spoken word to its start and end timestamps in the audio. Used for caption synchronization.
- **Prompt Template**: A reusable text template that constructs the final prompt sent to AI services, incorporating user input and configuration parameters.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users receive a valid, structured script within 15 seconds of submitting a prompt
- **SC-002**: Scene images are generated and stored within 30 seconds per image
- **SC-003**: Full narration audio with word-level alignment is generated within 20 seconds
- **SC-004**: 95% of script generation requests produce valid output (correct JSON structure, 3-5 scenes, 50-60s total) on the first attempt
- **SC-005**: User image uploads are validated, resized, and stored within 5 seconds
- **SC-006**: Failed AI service calls are retried transparently, reducing user-visible errors by at least 50% compared to no-retry behavior
- **SC-007**: All three AI endpoints (script, image, audio) work independently and can be called in isolation for testing and debugging

## Clarifications

### Session 2026-02-08

- Q: How should square AI-generated images (1024x1024) be resized to portrait (1080x1920)? → A: Fill (scale to cover + crop) — scale image to cover the full 1080x1920 area with minimal crop on one axis. No letterboxing or black bars.
- Q: How should batch image generation execute across multiple scenes? → A: Sequential with per-scene status — generate one image at a time; if one fails after retries, continue with remaining scenes. Allows partial success.
- Q: How should AI service calls be logged to the generation_logs table? → A: Auto-log in service layer — each AI function automatically writes a generation_log entry (stage, status, duration_ms, error_message) on success or failure.

## Assumptions

- The AI text generation and image generation services are available via Google's Generative Language API with the documented request/response formats.
- The TTS service returns word-level alignment data in the documented `with-timestamps` endpoint format.
- The 5 voice IDs (Adam, Bella, Charlie, Diana, Echo) map to valid TTS provider voice IDs configured in the application.
- Cloud storage buckets for images and audio are already provisioned (completed in F004).
- Authentication and credit checks are handled by the calling code (wizard/route handlers), not within the AI service layer itself.
- Image resize uses a fill (scale-to-cover + crop) strategy: the 1024x1024 image is scaled up to cover the full 1080x1920 area, with minimal cropping on one axis. No letterboxing or black bars.
- Rate limits for free-tier AI services are acceptable constraints for MVP usage.

## Dependencies

- **F004 (Database & User Sync)**: Storage buckets and database tables must exist for storing generated assets and referencing them in video records.
- **F001 (Foundation)**: Error codes, types, and constants (video resolution, scene limits, voice options) must be defined.
