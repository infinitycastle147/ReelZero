# Feature Specification: Video Generation Wizard

**Feature Branch**: `007-video-wizard`
**Created**: 2026-02-12
**Status**: Draft
**Input**: User description: "Video generation wizard - multi-step form, script editor, image selector, settings"

## Clarifications

### Session 2026-02-12

- Q: Can users navigate back to a previous step, and is later-step data preserved when they do? → A: Back navigation is allowed and all later-step data (generated scenes, images) is preserved as-is.
- Q: After a successful video job submission, what happens to wizard state? → A: Wizard state is cleared and the user is redirected to the generation progress page.
- Q: If the script generation API returns fewer than 3 or more than 5 scenes, how should the wizard handle it? → A: Auto-correct silently — truncate to 5 if over, pad with blank scene cards to reach 3 if under; user sees the result and can edit in Step 2.
- Q: When "Generate All Images" is clicked, do image requests fire simultaneously or sequentially? → A: All requests fire simultaneously; each scene shows its own independent loading state and resolves as soon as its image is ready.
- Q: Can users reorder scenes in Step 2, and is that order preserved through all subsequent steps? → A: Yes — users can reorder scenes via drag-and-drop in Step 2; the final scene order is preserved through Step 3 and Step 4 and becomes the sequence used by the rendering pipeline.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete Wizard from Prompt to Ready State (Priority: P1)

A signed-in user with available credits navigates to the "Create Video" page. They type a topic or idea into the prompt field, choose a voice and visual theme, and submit to generate an AI script. They review and optionally edit the generated scenes, select or upload images for each scene, confirm transition and caption settings, then submit to trigger video generation. At the end of the wizard they have a fully configured video job ready to hand off to the rendering pipeline.

**Why this priority**: This is the entire reason F007 exists — it is the primary product interaction. Without this flow working end-to-end, no videos can be created.

**Independent Test**: Can be fully tested by walking through all four wizard steps with a valid prompt and verifying a complete video configuration is produced and submitted to the rendering pipeline endpoint.

**Acceptance Scenarios**:

1. **Given** an authenticated user with at least 1 credit, **When** they fill in a prompt (50–500 characters), select a voice, and select a theme on Step 1, **Then** the wizard advances to Step 2 and calls the script generation service, displaying a structured scene list.
2. **Given** the script has been generated, **When** the user reviews Step 2, **Then** between 3 and 5 scenes are shown, each with an editable narration field and an editable visual description field.
3. **Given** the user is on Step 3, **When** they click "Generate All Images", **Then** each scene fires an image generation request and displays a preview thumbnail when complete.
4. **Given** all scenes have an image assigned, **When** the user advances to Step 4 and clicks the final confirm/submit button, **Then** the wizard records a credit reservation and emits a fully-configured video job to the rendering pipeline.

---

### User Story 2 - Edit Generated Script Before Proceeding (Priority: P2)

A user receives an AI-generated script but wants to adjust the narration text or visual description for one or more scenes before selecting images.

**Why this priority**: The script editor is the key differentiator that lets users guide AI output. Without it the product is a black box; users need control over scene content.

**Independent Test**: Can be tested by generating a script, editing a scene's narration and visual description, then verifying the edited values are preserved through image selection and final submission.

**Acceptance Scenarios**:

1. **Given** a generated script is shown in Step 2, **When** the user edits the narration text of a scene, **Then** the change is saved in wizard state and reflected immediately in the scene card.
2. **Given** the script shows 3 scenes, **When** the user clicks "Add Scene", **Then** a new blank scene card is appended (up to a maximum of 5 scenes).
3. **Given** the script shows more than 3 scenes, **When** the user clicks the delete icon on a scene, **Then** that scene is removed and the remaining scenes renumber; the delete control is disabled when only 3 scenes remain.

---

### User Story 3 - Upload Custom Image for a Scene (Priority: P2)

A user wants to use their own photo or graphic for a specific scene instead of an AI-generated image.

**Why this priority**: Image upload is an important alternative to AI generation and allows users to personalise videos with their own brand assets.

**Independent Test**: Can be tested by switching a single scene to "Upload" mode, dropping an image file, and confirming the preview thumbnail appears and is stored for that scene.

**Acceptance Scenarios**:

1. **Given** a scene in Step 3 is in "Upload" mode, **When** the user drags and drops a valid image file (JPEG, PNG, WebP ≤ 10 MB), **Then** the image is uploaded, resized to the required dimensions, and its preview is shown in the scene card.
2. **Given** a user drops an unsupported file type or an image exceeding the size limit, **When** the upload is attempted, **Then** a clear inline error message is shown and no upload is submitted.
3. **Given** an image has been uploaded for a scene, **When** the user clicks "Replace", **Then** they can select or drop a new file, which replaces the previous upload.

---

### User Story 4 - Credit Gate Prevents Wizard Submission Without Credits (Priority: P1)

A user with zero available credits attempts to submit the final step of the wizard.

**Why this priority**: Credit enforcement protects business revenue and is a hard security requirement shared with F006.

**Independent Test**: Can be tested by setting a test user's credit balance to 0 and verifying the submit button is disabled and an explanatory message is shown before any generation is triggered.

**Acceptance Scenarios**:

1. **Given** a user's credit balance is 0, **When** they reach the final step of the wizard, **Then** the "Generate Video" button is disabled and a message explains they have no credits remaining, with a link to the billing page.
2. **Given** a credit check passes at the start of submission, **When** the generation service call fails, **Then** the reserved credit is released and the user can retry.

---

### User Story 5 - Resume Interrupted Wizard (Priority: P3)

A user accidentally closes the browser tab mid-wizard and returns to the create page.

**Why this priority**: Saving state reduces frustration but is secondary to the core happy path.

**Independent Test**: Can be tested by partially completing the wizard, navigating away, returning, and verifying wizard state (prompt, scenes, selected images) is restored.

**Acceptance Scenarios**:

1. **Given** a user has reached Step 3 with images partially assigned, **When** they navigate away and return to the create page, **Then** the wizard reopens on the last completed step with all previously entered data intact.
2. **Given** a user has a saved draft, **When** they click "Start Over", **Then** the draft is cleared and the wizard resets to Step 1.

---

### Edge Cases

- What happens when a user navigates back from Step 3 to Step 2 and edits a scene's visual description? The edited description is saved in wizard state but previously generated images for that scene are NOT automatically invalidated — the user must manually regenerate images for scenes they edited.
- What happens when the script generation service returns an error or times out? The wizard stays on Step 1, shows an error message, and allows the user to retry without losing their prompt input.
- What happens if the script generation service returns an out-of-range scene count? The system auto-corrects silently: scenes beyond 5 are truncated, and if fewer than 3 are returned blank scene cards are appended. The user sees the corrected list in Step 2 without any error.
- What happens if an image generation request fails for one scene? Only that scene shows an error state; other scenes are unaffected. The user can retry generation for the failed scene individually.
- What happens when the user uploads an image that is valid size/type but has unexpected dimensions? The system resizes it automatically; the user sees the resized preview.
- What happens if the user tries to advance past Step 1 with a prompt shorter than 50 characters? Inline validation shows an error and the step does not advance.
- What happens if the credit reservation succeeds but the downstream render call fails immediately? The reserved credit is refunded and the user is notified.
- What happens when a user has a slow connection and image generation is taking a long time? A loading skeleton is shown per scene, and there is no timeout shorter than 60 seconds for individual image requests.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The wizard MUST be a linear multi-step flow with exactly 4 steps: (1) Input, (2) Script Editor, (3) Image Selection, (4) Settings Confirmation.
- **FR-002**: The wizard MUST display a step indicator showing the current step and completed steps at all times.
- **FR-003**: Users MUST NOT be able to advance past a step until all required inputs for that step are valid. Users MAY navigate back to any previously completed step at any time; all data from later steps MUST be preserved when doing so.
- **FR-004**: The system MUST validate the text prompt as between 50 and 500 characters before allowing Step 1 submission.
- **FR-005**: Step 1 MUST allow the user to select exactly one voice from the available voice list.
- **FR-006**: Step 1 MUST allow the user to select exactly one visual theme from: Realistic, Anime, Artistic, Cinematic, Minimalist.
- **FR-007**: Step 1 MUST allow the user to select exactly one caption style from three available options.
- **FR-008**: On Step 1 submission, the system MUST call the script generation service with the user's prompt, voice, and theme preferences, and display a loading state while waiting.
- **FR-009**: The generated script MUST be presented as a list of scene cards in Step 2, with a minimum of 3 and a maximum of 5 scenes. If the script generation service returns more than 5 scenes, the system MUST silently truncate to the first 5. If it returns fewer than 3 scenes, the system MUST silently pad with blank scene cards until exactly 3 are shown.
- **FR-010**: Each scene card in Step 2 MUST display and allow editing of both the narration text and the visual description.
- **FR-011**: Users MUST be able to add a new blank scene (up to the 5-scene maximum), delete an existing scene (down to the 3-scene minimum), and reorder scenes via drag-and-drop in Step 2. The final scene order MUST be preserved through Steps 3 and 4 and submitted to the rendering pipeline in that order.
- **FR-012**: All scene edits MUST be persisted in wizard state and reflected immediately without requiring a page reload.
- **FR-013**: Step 3 MUST present each scene with a choice between AI image generation and user image upload.
- **FR-014**: The system MUST provide a "Generate All Images" button in Step 3 that triggers AI image generation for all scenes currently set to the AI mode. All image requests MUST fire simultaneously; each scene card MUST display its own independent loading state and update as soon as its individual image is ready.
- **FR-015**: Users MUST be able to upload an image file (JPEG, PNG, or WebP; maximum 10 MB) by drag-and-drop or file picker for any scene in Step 3.
- **FR-016**: Uploaded images MUST be validated for file type and size before submission; invalid files MUST trigger an inline error and be rejected.
- **FR-017**: All scene images MUST be resized to the required output dimensions before being stored.
- **FR-018**: Step 4 MUST allow the user to choose a transition style (Fade or Crossfade) and review the caption style selected in Step 1.
- **FR-019**: Step 4 MUST display a summary of all wizard choices (prompt excerpt, scene count, voice, theme, transition, caption style) before final submission.
- **FR-020**: The system MUST check available credits before enabling the final "Generate Video" submit button; if the user has zero credits, the button MUST be disabled with an explanatory message and a link to the billing page.
- **FR-021**: On final submission, the system MUST reserve a credit before dispatching the video job to the rendering pipeline.
- **FR-022**: If the rendering pipeline call fails immediately after credit reservation, the system MUST release the reserved credit and display an error message.
- **FR-023**: The wizard state (all inputs, generated scenes, selected images) MUST be persisted across page navigations so users can resume an interrupted session.
- **FR-024**: Users MUST be able to explicitly reset the wizard to Step 1 and clear all saved state via a "Start Over" action.
- **FR-027**: On successful video job submission, the wizard MUST clear all saved state and redirect the user to the generation progress page. The wizard MUST NOT preserve the completed submission as a reusable draft.
- **FR-025**: The user identity used in all server calls MUST be derived from the authenticated session; the wizard MUST NOT send a user ID as a client-controlled parameter.
- **FR-026**: The number of scenes sent to the image generation service MUST be capped at the 5-scene maximum to prevent runaway API usage.

### Key Entities

- **Video Job**: A fully configured set of inputs ready for rendering — includes prompt, voice, theme, caption style, transition style, and an explicitly ordered list of scenes each with narration, visual description, and an assigned image. Scene order is user-defined and determines the final video sequence.
- **Scene**: A single segment of the video. Has a narration text (spoken audio), a visual description (used for image generation or context), and exactly one assigned image (AI-generated or user-uploaded).
- **Wizard State**: The transient, persisted record of the user's in-progress creation session — tracks the current step, all form inputs, generated scenes, and image assignments.
- **Voice**: A selectable audio persona used for text-to-speech narration. Has a display name and an underlying provider identifier.
- **Visual Theme**: A preset creative direction that influences how AI-generated images look (e.g., Realistic, Anime, Cinematic).
- **Caption Style**: A presentation style for on-screen captions (e.g., word-by-word pop-in, full sentence).
- **Credit Reservation**: A temporary hold placed on one credit at the moment of final submission, converted to a deduction on successful render or released on failure.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete the full four-step wizard and submit a video job in under 5 minutes, assuming the AI services respond within normal latency.
- **SC-002**: 90% of users who reach Step 2 successfully complete all four steps and submit (wizard completion rate from Step 2 is ≥ 90%).
- **SC-003**: Users with zero credits are blocked from submitting 100% of the time; no credit overrun is possible from the wizard.
- **SC-004**: Users who resume an interrupted session find all previously entered data intact in 100% of cases (no data loss from navigation).
- **SC-005**: Image upload errors (wrong type, oversized file) are caught and displayed to the user before any network request is made, in 100% of cases.
- **SC-006**: When a script generation or image generation service call fails, the user can retry from the same wizard state without re-entering data in 100% of cases.
- **SC-007**: The wizard renders correctly and is fully usable on mobile viewports (≥ 375 px wide).

## Assumptions

- The voice list is fetched from the same data source established in F005 (ElevenLabs). A set of 5–10 voices is available; the wizard does not need to support dynamic voice management.
- All five visual themes (Realistic, Anime, Artistic, Cinematic, Minimalist) are predefined constants and do not require admin configuration.
- The three caption styles are predefined options (e.g., "Word by Word", "Full Sentence", "None") and do not require user customisation beyond selection.
- Wizard state is persisted client-side (e.g., browser storage). Server-side draft persistence is out of scope for this feature.
- The rendering pipeline (F008) accepts a structured video job payload via an API call; F007 is responsible for composing and sending that payload but not for implementing the pipeline.
- One credit equals one video generation attempt. The credit deduction logic lives in F006; F007 only calls the reservation and release functions.
- Image aspect ratio for all generated/uploaded scene images is 9:16 (portrait, for short-form vertical video).
- Users must be authenticated to access the create page; unauthenticated users are redirected to sign-in by existing middleware.

## Dependencies

- **F005 (AI Services)**: Script generation, image generation, and audio/TTS endpoints must be operational before the wizard can make meaningful progress beyond Step 1.
- **F006 (Credit & Billing)**: Credit check, reservation, and release functions must be available. The billing page must exist for the link shown when credits are exhausted.
- **F003 (Auth)**: Clerk session must be available in the dashboard layout so the wizard can derive user identity server-side.
- **F004 (Database)**: User record and subscription record must exist for credit operations.
