# Feature Specification: Video Dashboard & Library

**Feature Branch**: `009-video-dashboard`
**Created**: 2026-02-13
**Status**: Draft
**Input**: User description: "Video dashboard and library - video grid, search, filter, preview, download, delete, usage stats"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Video Library (Priority: P1)

An authenticated user wants to see all videos they have generated. They navigate to the Videos page and see a grid of their videos with thumbnails, titles, creation dates, and durations. They can toggle between grid and list views. Videos are sorted newest-first by default.

**Why this priority**: This is the core value of the dashboard — users need to access their generated content. Without a library view, users have no way to revisit or use their videos after generation.

**Independent Test**: Seed the database with 5–10 videos for a test user. Navigate to the Videos page. Verify all videos appear with correct thumbnails, titles, dates, and durations. Toggle between grid and list view; verify layout changes.

**Acceptance Scenarios**:

1. **Given** a user with 5 generated videos, **When** they navigate to the Videos page, **Then** all 5 videos appear with thumbnail, title, creation date, and duration visible.
2. **Given** the Videos page in grid view, **When** the user clicks the list-view toggle, **Then** videos are displayed in a single-column list with the same metadata.
3. **Given** a user with 0 videos, **When** they visit the Videos page, **Then** an empty state is shown with a "Create your first video" call-to-action.
4. **Given** more than 12 videos, **When** the user reaches the bottom of the page, **Then** older videos load via next/previous page controls (server-side paginated navigation).

---

### User Story 2 - Main Dashboard Overview (Priority: P2)

An authenticated user lands on the main dashboard after signing in. They see a welcome greeting, a quick-action button to create a new video, their 3–5 most recent videos, and a summary of their credit and usage stats for the current month.

**Why this priority**: The dashboard is the first screen users see after login. It must orient them quickly, show recent work, and highlight the primary CTA. Without it, users must navigate blindly.

**Independent Test**: Log in as a user who has generated at least 2 videos. Verify the dashboard shows the user's name in the greeting, displays the last 3–5 videos, shows the current credit balance, and has a working "Create Video" button that navigates to the wizard.

**Acceptance Scenarios**:

1. **Given** an authenticated user with 3 videos this month, **When** they load the dashboard, **Then** a welcome message including their name, a "Create Video" button, the 3 most recent video thumbnails, credits remaining, and videos-created-this-month count are all visible.
2. **Given** a new user with no videos, **When** they load the dashboard, **Then** the recent-videos section shows an empty state and the "Create Video" CTA is prominent.
3. **Given** any authenticated user, **When** they click "Create Video", **Then** they are taken directly to Step 1 of the video generation wizard.

---

### User Story 3 - Search & Filter Videos (Priority: P3)

A user has accumulated many videos and wants to find a specific one. They type a keyword into the search bar to filter by title or original prompt. They also want to filter by date range and sort by newest or oldest.

**Why this priority**: As the library grows, discovery without search becomes painful. Search and filter are table-stakes for any media library.

**Independent Test**: Create 10 videos with distinct titles/prompts. Search for a keyword that matches exactly 2 of them. Verify only those 2 appear. Then apply a date filter that excludes all but 1. Verify the result set narrows correctly.

**Acceptance Scenarios**:

1. **Given** a library of 10 videos, **When** the user types "ocean" in the search bar, **Then** only videos whose title or original prompt contains "ocean" are shown; results update within 1 second of typing.
2. **Given** search results are shown, **When** the user clears the search field, **Then** the full library is restored.
3. **Given** the Videos page, **When** the user selects "Oldest First" from the sort dropdown, **Then** videos reorder with the earliest-created video first.
4. **Given** the Videos page, **When** the user applies a date filter for "This Week", **Then** only videos created in the past 7 days are shown.

---

### User Story 4 - View & Download a Video (Priority: P4)

A user clicks on a video card to open its detail page. They can watch a full preview, see metadata (title, prompt, duration, creation date, voice, theme), and download the MP4 file to their device.

**Why this priority**: Preview and download are the primary actions users take after generation. This is the moment the product delivers its core value.

**Independent Test**: Navigate to a completed video's detail page. Verify the player loads and the video plays. Click the download button and verify the MP4 file is downloaded to the device.

**Acceptance Scenarios**:

1. **Given** a completed video, **When** the user navigates to its detail page, **Then** the video player is present and playback starts on clicking Play.
2. **Given** the detail page, **When** the user clicks "Download", **Then** the MP4 file begins downloading to the user's device without requiring additional navigation.
3. **Given** the detail page, **Then** title, original prompt, voice used, visual theme, duration, and creation date are all visible.

---

### User Story 5 - Delete a Video (Priority: P5)

A user wants to remove a video they no longer need. They click a delete button on the video card or detail page, confirm the action in a dialog, and the video is permanently removed from their library and storage.

**Why this priority**: Storage hygiene and privacy control. Users must be able to remove content they own.

**Independent Test**: Open a video's detail page or card, click Delete, confirm the dialog. Verify the video no longer appears in the library and the detail page returns a "not found" state.

**Acceptance Scenarios**:

1. **Given** a video in the library, **When** the user clicks "Delete" and confirms the dialog, **Then** the video is removed from the library view and no longer accessible.
2. **Given** the delete action is initiated, **When** the user clicks "Cancel" in the confirmation dialog, **Then** the video is not deleted and the user returns to their previous view.
3. **Given** a video is deleted, **When** any user attempts to access its direct URL, **Then** a "not found" message is shown (no unauthorized access to deleted content).

---

### User Story 6 - View Usage Statistics (Priority: P6)

A user wants to understand their consumption. They can see how many credits remain, how many videos they created this month, and a visual summary of monthly usage trends.

**Why this priority**: Usage visibility drives upgrade decisions and prevents unexpected credit exhaustion. It also helps users plan their content creation.

**Independent Test**: Use a test user with a known credit balance and known number of videos this month. Verify the stats card shows the correct remaining credits, video count, and the usage chart reflects the expected data.

**Acceptance Scenarios**:

1. **Given** a user with 7 remaining credits and 3 videos created this month, **When** they view the dashboard or billing section, **Then** "7 credits remaining" and "3 videos this month" are displayed.
2. **Given** a user on the dashboard, **When** they view the usage chart, **Then** a bar or line chart shows video creation count per day or week for the current month.
3. **Given** a user whose credits have just been deducted, **When** they refresh the dashboard, **Then** the updated credit count is displayed.

---

### Edge Cases

- What happens when a video's render failed (no MP4 available)? The video card should indicate an error state and disable the Download button; a Regenerate option should be available.
- What happens when the user deletes a video that is currently being viewed by the same user in another tab? The other tab shows a "video not found" state gracefully on next interaction.
- What happens when search returns no results? An empty state message ("No videos match your search") is shown with a button to clear the search.
- What happens when the user has used all their credits? The "Create Video" CTA remains visible but routes to the billing/upgrade page instead of the wizard, or shows an upgrade prompt.
- What happens when a video thumbnail has not yet been generated? A placeholder thumbnail is shown; the card is still interactive.
- What happens on slow connections when the video library loads? A loading skeleton is displayed for each expected video card while data fetches.
- What happens when a user tries to access another user's video by direct URL? The system returns a "not found" response — no data about the other user's video is disclosed.
- What happens when a video is stuck in "processing" for more than 30 minutes? It is automatically marked as "failed" and the library card shows the error indicator and "Regenerate" action; no manual support intervention is required.
- What happens when storage file deletion fails during a delete operation? The database record is rolled back (not deleted) and the user sees a retryable error message; the video remains accessible in their library until a successful delete.

## Clarifications

### Session 2026-02-13

- Q: Should search and filter be executed server-side (with paginated API queries) or client-side (filtering the fetched page in the browser)? → A: Server-side — search/filter params are sent to the API; the backend queries and returns a paginated subset.
- Q: Should video deletion be a hard delete (permanent and immediate) or soft delete (retained in DB for recovery)? → A: Hard delete — video record and all associated files are permanently removed on confirmation. See Q5 below for the atomic rollback behaviour when storage deletion fails.
- Q: Should the grid/list view toggle preference persist for the browser session (localStorage) or be saved to the user's account (cross-device)? → A: Browser session / localStorage — preference is remembered in the browser only; not stored server-side.
- Q: What should happen to a video stuck in "processing" indefinitely (e.g., render job silently failed)? → A: Auto-timeout — if a video remains in "processing" beyond 30 minutes, the system automatically marks it as "failed" and surfaces the error/regenerate UI.
- Q: What should happen if storage file deletion fails mid-delete (DB record deleted but storage returns an error)? → A: Atomic — if any storage deletion fails, roll back the DB delete and show the user an error so they can retry. (Refines Q2: "hard delete" means permanent once fully successful; partial failures are rolled back.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display a main dashboard page showing a greeting with the user's name, a "Create Video" primary CTA, the user's 3–5 most recent videos, and a summary of current credits and videos created this month.
- **FR-002**: The system MUST provide a Videos library page showing all of the authenticated user's videos, sorted newest-first by default.
- **FR-003**: Each video entry MUST display a thumbnail image, title (or prompt excerpt if no title), creation date, and video duration.
- **FR-004**: The Videos library MUST support toggling between grid view and list view; the user's preference MUST be persisted in browser-local storage (not server-side) so it survives page refreshes within the same browser but resets on a different device or cleared storage.
- **FR-005**: The Videos library MUST support text-based search that filters videos by title and original prompt; search terms, sort order, and date filters MUST be passed as query parameters to the backend API so that results are filtered and paginated server-side before being returned to the client; results MUST update within 1 second of the user stopping typing.
- **FR-006**: The Videos library MUST support sorting by "Newest First" (default) and "Oldest First".
- **FR-007**: The Videos library MUST support filtering by date range with at minimum the options: Today, This Week, This Month, All Time.
- **FR-008**: The Videos library MUST support pagination — no more than 12 videos per page — applied server-side so that pagination remains correct when search or filter parameters are active; page controls allow navigation between result pages.
- **FR-009**: Each video MUST have a detail page displaying: video player with play/pause/seek/volume controls, the original prompt, voice used, visual theme, caption style, duration, and creation date.
- **FR-010**: The detail page MUST provide a "Download" button that downloads the final MP4 to the user's device.
- **FR-011**: Users MUST be able to delete a video from both the library view (via a menu or button on the card) and the detail page; deletion MUST require a confirmation step before executing.
- **FR-012**: Deleting a video MUST atomically remove the video record from the database AND delete all associated stored files (MP4, audio, scene images); if any storage deletion fails, the database record MUST be rolled back and the user shown a retryable error — there is no trash or recovery mechanism once deletion succeeds.
- **FR-013**: The system MUST display a usage stats section showing: credits remaining, videos created this month, and a monthly usage chart (video creation over time).
- **FR-014**: The system MUST enforce ownership — a user may only view, download, or delete their own videos; accessing another user's video by ID MUST return a "not found" response.
- **FR-015**: The system MUST add server-side authentication guards on all dashboard pages (beyond middleware) so unauthenticated requests are redirected to sign-in.
- **FR-016**: Videos with a failed render status MUST be displayed with a visible error indicator, with the Download button disabled and a "Regenerate" action available.
- **FR-017**: The detail page MUST offer a "Regenerate" action that navigates the user back to the wizard pre-populated with the original prompt and settings.
- **FR-018**: The Videos library page MUST display a loading skeleton while video data is being fetched.
- **FR-019**: The system MUST provide an empty-state screen when the user has no videos, including a "Create your first video" CTA.
- **FR-020**: Videos that have been in "processing" status for more than 30 minutes MUST be automatically transitioned to "failed" status; once failed, the video card displays the error indicator and "Regenerate" action as per FR-016.

### Key Entities

- **Video**: A generated video owned by a user. Key attributes: unique identifier, owner, title/prompt, render status (completed/failed/processing), duration, thumbnail URL, MP4 URL, voice used, visual theme, caption style, creation date, updated date.
- **Usage Summary**: Aggregated stats for a user within a billing period. Key attributes: credits remaining, credits used, videos created count, per-day video creation counts for charting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can locate a specific video in a library of 50 by searching a keyword in under 30 seconds.
- **SC-002**: The video library page displays all videos (up to the paginated limit) within 2 seconds on a standard broadband connection.
- **SC-003**: 100% of delete actions require explicit confirmation; no video is permanently removed without a two-step interaction.
- **SC-004**: 100% of video data endpoints enforce ownership — zero cases where a user can retrieve another user's video content.
- **SC-005**: The dashboard and all library pages are inaccessible to unauthenticated users; 100% of unauthenticated requests redirect to sign-in.
- **SC-006**: A completed video's MP4 is downloadable via the Download button in a single click with no additional navigation.
- **SC-007**: The usage stats section reflects the user's accurate credit balance on the next page load or manual refresh; the displayed value is never stale beyond the current server-rendered page session.
- **SC-008**: Video library loading states (skeletons) appear within 200ms of page load, eliminating blank-screen flashes.

## Assumptions

- Videos are always scoped to the authenticated user; there is no concept of shared or public videos in this feature.
- Thumbnails are already generated as part of the rendering pipeline (F008) and stored in Supabase Storage. If a thumbnail is absent, a placeholder image is used.
- The video player reuses the Remotion Player component built in F008.
- "Regenerate" navigates back to the wizard with pre-filled state; it does not automatically deduct a credit (credit deduction happens at the point of final generation in the wizard).
- Date filter options (Today, This Week, This Month, All Time) are sufficient for MVP; advanced custom date range picking is out of scope.
- Storage cleanup on delete covers MP4, audio file, and scene images associated with that video.
- The monthly usage chart shows data for the current calendar month, not a rolling 30-day window.
- Videos in "processing" state are visible in the library with a progress indicator; they are not hidden until complete.

## Dependencies

- **F008 (Remotion Rendering Pipeline)**: Provides the `videos` table records with render status, MP4 URLs, and thumbnail URLs that this feature reads and manages.
- **F006 (Credit System & Stripe Billing)**: Provides the credit balance and usage data displayed in the stats section.
- **F007 (Video Generation Wizard)**: The "Regenerate" action navigates back to the wizard pre-populated with the video's original settings.
