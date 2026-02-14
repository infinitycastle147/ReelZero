# Feature Specification: Remotion Rendering Pipeline

**Feature Branch**: `008-remotion-pipeline`
**Created**: 2026-02-12
**Status**: Draft
**Input**: User description: "Remotion Rendering Pipeline — compose and render the final MP4 video from wizard state: Remotion compositions, audio-scene sync, render orchestration via microservice, progress UI, video preview & download, credit deduction."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - End-to-End Video Generation (Priority: P1)

A user who has completed the Video Generation Wizard (scene script, images, voice, transition, and caption settings all confirmed) clicks "Generate Video." The system processes the request end-to-end: generates narration audio, synchronizes word timings to scenes, triggers the render microservice to produce an MP4, and presents the completed video for preview and download — all within a single uninterrupted session (~70-90 seconds).

**Why this priority**: This is the core product outcome — it is the reason users signed up and spent credits. Without it, no other feature in F008 delivers value.

**Independent Test**: Trigger generation from a pre-populated wizard state; verify a playable MP4 video is produced and available for download within 90 seconds.

**Acceptance Scenarios**:

1. **Given** a user has completed the wizard and has at least 1 credit, **When** they click "Generate Video," **Then** a progress screen appears showing four sequential stages (audio, synchronization, rendering, finalizing) with a progress bar and estimated time.
2. **Given** the rendering completes successfully, **When** the final stage finishes, **Then** the user sees an embedded video player with play/pause, seek, and volume controls, along with a "Download MP4" button.
3. **Given** a successful generation, **When** the video is finalized, **Then** exactly 1 credit is deducted from the user's account and the video appears in the user's library.
4. **Given** a user with 0 credits, **When** they attempt to click "Generate Video," **Then** the button is disabled and they see a message prompting them to upgrade their plan.
5. **Given** a user already has a render in `processing` status, **When** they attempt to start another generation, **Then** the attempt is rejected with a "generation already in progress" message and no credit is reserved.

---

### User Story 2 - Generation Failure & Credit Refund (Priority: P2)

A user's video generation fails at any stage (audio generation error, render crash, timeout). The system detects the failure, surfaces a clear error message, and automatically refunds the reserved credit so the user is not penalized for a system failure.

**Why this priority**: Credit integrity is critical for user trust. A user who loses a credit due to a system failure will churn. This story must work correctly before the pipeline is considered production-ready.

**Independent Test**: Simulate a render microservice failure; verify credit is refunded, user sees an error message with a retry option, and no video record is written.

**Acceptance Scenarios**:

1. **Given** a render failure occurs after a credit was reserved, **When** the error is detected, **Then** the reserved credit is returned to the user's balance within the same request.
2. **Given** a generation failure at any stage, **When** the error is shown to the user, **Then** the error message is human-readable (not a technical stack trace) and includes a "Try Again" action.
3. **Given** a render timeout (>120 seconds with no response), **When** the timeout is reached, **Then** the system treats it as a failure, refunds the credit, and shows the user an appropriate message.

---

### User Story 3 - Video Preview with Captions (Priority: P3)

The completed video renders with synchronized captions that match the voiceover timing. Users can preview the video inline before downloading it, with caption style matching what they selected in the wizard.

**Why this priority**: Captions are a core differentiator for short-form video content (Reels/Shorts/TikTok). Correct synchronization is a quality requirement, but the video is still usable without captions if this story were deferred.

**Independent Test**: Generate a video with "word-by-word" caption style; verify each word appears on screen at the correct time matching the audio playback.

**Acceptance Scenarios**:

1. **Given** a user selected "word-by-word" caption style, **When** they preview the video, **Then** each word animates in-sync with the narration, popping in at the correct moment.
2. **Given** a user selected "full sentence" caption style, **When** they preview the video, **Then** complete sentence text is displayed stably on screen during the relevant scene.
3. **Given** a user selected "no captions," **When** they preview the video, **Then** no caption text appears at any point.
4. **Given** a video with multiple scenes, **When** the video plays, **Then** captions transition cleanly between scenes without overlap or missing words.

---

### User Story 4 - Progress Transparency (Priority: P4)

Users see real-time progress feedback during the ~70-90 second generation process. Since users must stay on the page during processing, the progress UI must make the wait feel managed and predictable.

**Why this priority**: Important for UX quality and reducing abandonment, but the core pipeline functions without it (progress could be binary: loading / done).

**Independent Test**: Trigger generation and observe the progress UI; verify all four stages are reflected in sequence and the progress bar advances without stalling.

**Acceptance Scenarios**:

1. **Given** a generation is in progress, **When** each stage completes, **Then** the stage indicator updates to show the current active stage (audio → synchronization → rendering → finalizing).
2. **Given** a generation is in progress, **When** a stage advances, **Then** the progress bar updates to reflect the proportion of work completed.
3. **Given** a generation is in the "rendering" stage, **When** the estimated time is displayed, **Then** it shows an approximate remaining duration.

---

### Edge Cases

- What happens when the render microservice is unavailable or returns a 5xx error?
- How does the system handle a video with only 3 scenes vs. the maximum 5?
- What happens if audio generation produces silence or an empty audio file?
- How does scene timing calculation handle cases where audio duration is slightly over or under 60 seconds?
- If the user navigates away during an active render, the render continues server-side and the video record remains in `processing` status; on return, the video library shows current status until `completed` or `failed`.
- What if the uploaded image for a scene is deleted from storage before rendering begins?
- What happens if word-timing alignment data returns zero words for a scene?
- How does the watermark appear for free-tier users vs. paid users?
- If the render microservice returns a corrupt or invalid MP4 (fails file size or file signature check), the system treats it as a render failure: credit is refunded, video is marked `failed`, and the user sees a human-readable error with a "Try Again" option.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept a completed wizard state (scenes with images, script, narration text, voice selection, transition type, caption style) and produce a downloadable MP4 video.
- **FR-002**: System MUST generate narration audio with word-level timing alignment data before initiating rendering.
- **FR-003**: System MUST calculate exact per-scene frame boundaries based on audio alignment data, mapping each word to its corresponding scene.
- **FR-004**: System MUST transmit the assembled composition data to a remote render service and receive the rendered MP4 output.
- **FR-005**: System MUST surface stage-by-stage progress to the user (audio → sync → render → finalize). The render microservice pushes stage transitions to the main app via `POST /api/video/render/stage` callbacks, which update the Video record's `current_stage` field. The **client** polls `GET /api/video/render/status` every 3 seconds to read the latest `current_stage` from the DB — the client does NOT poll the render service directly.
- **FR-006**: System MUST validate the rendered MP4 (file size > 0 and valid file signature) before storing it; only on passing validation may the system store the file in durable storage, persist the video record as `completed`, and deduct the credit. A validation failure MUST be treated as a render failure (credit refunded, video marked `failed`).
- **FR-007**: System MUST deduct exactly 1 credit on successful render completion and refund the reserved credit on any failure.
- **FR-008**: System MUST display an embedded video player after successful generation with play/pause, seek, and volume controls.
- **FR-009**: System MUST provide a "Download MP4" button that allows the user to save the video to their device.
- **FR-010**: System MUST support two transition types between scenes: fade-to-black and crossfade.
- **FR-011**: System MUST support three caption modes: word-by-word (animated per word in sync with audio), full sentence (static per scene), and none.
- **FR-012**: System MUST apply a watermark overlay to videos generated by free-tier users.
- **FR-013**: System MUST enforce a credit check before reserving a credit and initiating generation; users with 0 credits must be blocked with a clear upgrade prompt.
- **FR-014**: System MUST apply a Ken Burns (slow pan/zoom) effect to scene images during playback.
- **FR-015**: System MUST treat any generation that exceeds 120 seconds without completion as a failure and refund the credit.
- **FR-016**: System MUST support videos composed of 3–5 scenes, each rendered sequentially within a 60-second total duration.
- **FR-017**: Rendering MUST be a server-side background operation that completes regardless of whether the user remains on the progress screen; the video library MUST reflect the current `processing` / `completed` / `failed` status when the user returns.
- **FR-018**: System MUST allow a maximum of 1 concurrent active render job per user; if a render is already in `processing` status for a user, any new generation attempt MUST be rejected with a human-readable "generation already in progress" message and no credit MUST be reserved.

### Key Entities

- **Video**: Represents a completed or in-progress generated video. Attributes: user reference, generation status (`processing` / `completed` / `failed`), current stage (`audio` / `sync` / `render` / `finalize` — present only when status is `processing`), video file URL, scenes metadata, prompt, voice, transition type, caption style, credit cost, creation timestamp.
- **Render Job**: A transient job submitted to the render microservice. Attributes: job ID, composition data (scene images, audio URL, timing data, settings), status, progress percentage, current stage, output URL.
- **Scene Timing**: Calculated mapping from scene number to frame range. Attributes: scene number, start frame, end frame, duration in frames, word timings array.
- **Word Timing**: Per-word timing entry derived from audio alignment. Attributes: word string, start frame, end frame.
- **Generation Log**: Audit record for each generation attempt. Attributes: user reference, video reference, stage reached, success/failure, credit impact, timestamps.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can go from clicking "Generate Video" to having a playable, downloadable video in under 90 seconds for a 3-5 scene video under normal load.
- **SC-002**: 100% of failed generation attempts result in a full credit refund with no manual intervention required.
- **SC-003**: Caption words appear within 1 frame (33ms) of their correct audio timestamp as derived from alignment data.
- **SC-004**: Users can download the generated MP4 and play it in any standard video player without codec or format errors.
- **SC-005**: The progress UI reflects a stage transition within one polling cycle (≤3 seconds) of the stage actually changing in the backend.
- **SC-006**: Free-tier watermark is present on 100% of videos generated on the free plan and absent on 100% of paid-tier videos.
- **SC-007**: The system correctly handles all 3-5 scene configurations, producing a valid video for each.

## Clarifications

### Session 2026-02-12

- Q: What should the Video record's status field track during an active generation? → A: Single `processing` status + separate `current_stage` field (audio/sync/render/finalize)
- Q: What should happen if a user navigates away from the progress screen while a render is in progress? → A: Render continues server-side; user returns to video library and sees the video's status until it completes or fails
- Q: Should the system validate that the rendered MP4 is playable before marking the video as `completed`? → A: Basic validation — check file size > 0 and valid MP4 file signature before marking `completed`; treat validation failure as a render failure (refund credit)
- Q: What polling interval should the client use when checking render status during an active generation? → A: 3-second polling interval
- Q: How many concurrent active render jobs should a single user be allowed at one time? → A: 1 concurrent render per user; a second attempt is blocked with a "generation already in progress" message

## Assumptions

- The render microservice (`ReelZero-Renderer`) is a separately deployed service that exposes `POST /render` and `GET /status/:id` endpoints; it is not built within this feature but must be running for end-to-end testing.
- Audio duration may vary slightly from exactly 60 seconds; scene timing calculations proportionally distribute frames based on actual audio alignment data.
- Images for each scene are already stored in durable storage before rendering is triggered (uploaded during wizard Steps 2-3).
- The video format is vertical (9:16 aspect ratio) at 1080×1920 resolution, 30fps, 60 seconds total.
- "Regenerate" from the preview screen consumes an additional credit and is treated as a brand-new generation.
- Credit reservation happens atomically before any AI call begins; the reserve operation is the single source of truth for credit availability (no separate check-then-reserve pattern).
