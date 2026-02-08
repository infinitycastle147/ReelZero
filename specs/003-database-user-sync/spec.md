# Feature Specification: Database Schema & User Sync

**Feature Branch**: `003-database-user-sync`
**Created**: 2026-02-08
**Status**: Draft
**Input**: User description: "F004 Database Schema & User Sync from docs/features.md"

## Clarifications

### Session 2026-02-08

- Q: Should storage buckets be publicly accessible or require authenticated access? → A: Private buckets with public thumbnails — videos, images, and audio require authenticated access; thumbnails are public for fast dashboard loading.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Account Setup on First Sign-In (Priority: P1)

As a new user who just signed up through Google OAuth, I expect that when I land on the dashboard for the first time, my account is fully provisioned — my profile information is saved, I have a free subscription with starter credits, and the system is ready for me to generate my first video. I never have to fill out a profile form, pick a plan, or wait for account setup; it all happens automatically behind the scenes.

**Why this priority**: This is the most critical path — every single user goes through this flow. If user sync fails, the entire product is unusable. No videos, no billing, no dashboard. The webhook-driven user creation + automatic free subscription is the bedrock of the entire feature chain (F005-F009).

**Independent Test**: Sign up via Clerk Google OAuth. Navigate to the dashboard. Verify that the system recognizes the user, displays their name/email, and shows 3 available credits without any manual setup steps.

**Acceptance Scenarios**:

1. **Given** a person with a Google account has never used ReelZero, **When** they complete Google OAuth sign-up through Clerk, **Then** the system automatically creates a user record with their email and name, creates a free-tier subscription with the configured number of starter credits, and the user lands on the dashboard ready to use the product.
2. **Given** a user record already exists for a Clerk user, **When** the user updates their name or email in Clerk, **Then** the system updates the corresponding user record to reflect the changes.
3. **Given** the user sync process encounters a temporary failure (e.g., database unavailable), **When** the webhook is retried by Clerk, **Then** the system processes the event idempotently — creating the user if they don't exist or skipping if they already do, without creating duplicates.

---

### User Story 2 - Typed Data Access Layer for Application Features (Priority: P1)

As a developer building features F005 through F009 (AI services, billing, video wizard, rendering, dashboard), I need a reliable, typed data access layer that lets me create, read, update, and query all application entities (users, subscriptions, videos, generation logs, uploaded images, usage tracking) without writing raw database queries. Every query function returns typed results, handles errors consistently, and follows the project's database abstraction principle.

**Why this priority**: Equal priority with US1 because every downstream feature depends on these query functions. Without a typed query layer, F005 (AI Services) can't log generation events, F006 (Billing) can't manage subscriptions, F007 (Video Wizard) can't persist video state, and F009 (Dashboard) can't display user data. The query layer is the foundation for all business logic.

**Independent Test**: Import any query function (e.g., `getUserByClerkId`, `createVideo`, `checkCredits`). Call it with valid parameters. Verify it returns a properly typed result and that the corresponding database record exists/was modified.

**Acceptance Scenarios**:

1. **Given** the data access layer is initialized, **When** a developer calls `getUserByClerkId(clerkId)`, **Then** the function returns a typed User object matching the database schema, or null if not found.
2. **Given** a user exists, **When** a developer calls `createVideo({ userId, title, prompt, ... })`, **Then** a new video record is created with status "processing", all required fields populated, and the typed Video object is returned.
3. **Given** a user has an active subscription, **When** a developer calls `checkCredits(userId)`, **Then** the function returns the current credit balance and a boolean indicating whether the user can generate another video.
4. **Given** the query layer is complete, **When** a developer searches the codebase for raw database client usage outside of `src/lib/db/queries/`, **Then** no results are found (all database access goes through the abstraction layer).

---

### User Story 3 - File Storage Organization for Generated Assets (Priority: P2)

As the system generating videos, images, and audio files, I need organized cloud storage buckets that separate different asset types and organize files by user. When a video is generated, its images go to the images bucket, audio to the audio bucket, and the final video to the videos bucket — all under the user's ID for easy retrieval and cleanup. Thumbnails are stored separately for fast dashboard loading.

**Why this priority**: Storage is required before F005 (AI Services) can save generated images/audio and before F008 (Rendering) can save final videos. However, it's secondary to user sync and query layer because those are needed immediately for basic app functionality.

**Independent Test**: Upload a test file to each storage bucket (videos, images, audio, thumbnails) under a user's ID path. Verify the file is accessible via the storage URL and that the bucket path structure matches the expected pattern `/{bucket}/{user_id}/{filename}`.

**Acceptance Scenarios**:

1. **Given** storage is configured, **When** the system stores a generated image for a user, **Then** the file is saved to the images bucket under the path `images/{user_id}/{filename}` and an authenticated storage URL is returned (accessible only to the owning user).
2. **Given** a user's video has been rendered, **When** the system stores the final MP4, **Then** the file is saved to the videos bucket under `videos/{user_id}/{filename}` with the file size recorded in the video record.
3. **Given** multiple asset types are generated for a single video, **When** all assets are stored, **Then** images, audio, and video files are in their respective buckets, all organized under the same user ID.

---

### User Story 4 - Usage Tracking and Activity Logging (Priority: P3)

As a product owner analyzing how users interact with ReelZero, I need every meaningful user action (video generated, image uploaded, subscription changed, credit used) logged with metadata so I can understand usage patterns, debug issues, and build the usage dashboard in F009. Each log entry captures who, what, when, and how many credits were consumed.

**Why this priority**: Usage tracking is important for the F009 dashboard and business analytics but doesn't block any immediate feature. The core product can function without it initially — it enhances visibility rather than enables functionality.

**Independent Test**: Trigger a tracked action (e.g., log a "video_generated" event for a user). Query the usage tracking table for that user. Verify the log entry exists with the correct action type, credit count, and timestamp.

**Acceptance Scenarios**:

1. **Given** a user generates a video, **When** the generation completes, **Then** a usage tracking entry is created with action "video_generated", the credit cost, and metadata including the video ID.
2. **Given** a user has multiple tracked actions over time, **When** a developer queries usage for that user within a date range, **Then** the query returns all matching entries sorted by most recent first, with accurate credit totals.
3. **Given** a user uploads an image, **When** the upload completes, **Then** a usage tracking entry is created with action "image_uploaded" and relevant metadata.

---

### Edge Cases

- What happens if Clerk sends a webhook for a user that already exists in the database? The system must handle this idempotently — update the existing record rather than failing or creating a duplicate.
- What happens if the database is temporarily unavailable when a Clerk webhook arrives? Clerk retries webhooks, so the handler must be safe for replay. The unique constraint on `clerk_user_id` prevents duplicates even if the same event is processed twice.
- What happens if a user deletes their Clerk account? The system should handle the `user.deleted` webhook event by marking the user record appropriately (soft delete or status change), not by hard-deleting the record, to preserve referential integrity with videos and usage history.
- How does the system handle concurrent credit operations (two simultaneous generation requests)? The credit check and reservation must be atomic to prevent double-spending — the `credits_remaining` computed column and row-level operations ensure consistency.
- What happens if a subscription record is missing for a user? The system should defensively check for subscription existence and create a free-tier subscription if one doesn't exist, as a self-healing mechanism.
- What happens if file storage upload fails mid-operation? The system should return a clear error without leaving orphaned database records. If a video record was created before image upload failed, the record should reflect the failure state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST create a user record automatically when a new user signs up through the authentication provider, capturing their unique external ID, email address, and display name.
- **FR-002**: The system MUST update existing user records when the authentication provider sends a user update event (name change, email change).
- **FR-003**: The system MUST handle user deletion events from the authentication provider by preserving referential integrity with related records (videos, usage history) rather than hard-deleting the user.
- **FR-004**: The system MUST create a free-tier subscription with the configured number of starter credits automatically when a new user record is created.
- **FR-005**: The system MUST process authentication webhooks idempotently — replaying the same event must not create duplicates or corrupt data.
- **FR-006**: The system MUST verify webhook authenticity by validating the signature on every incoming webhook request, rejecting requests with invalid or missing signatures.
- **FR-007**: The system MUST provide typed query functions for each data entity (users, subscriptions, videos, generation logs, uploaded images, usage tracking) that abstract all database operations.
- **FR-008**: The system MUST enforce that all database access goes through the centralized query layer — no raw database client calls in route handlers, services, or components.
- **FR-009**: The system MUST define a database schema with tables for: users, subscriptions (with computed remaining credits), videos (with JSONB metadata), generation logs, uploaded images, and usage tracking.
- **FR-010**: The system MUST create database indexes on frequently queried columns: user ID foreign keys, creation timestamps (descending), and unique constraints on external IDs and emails.
- **FR-011**: The user query module MUST provide: create user, get user by external ID, get user by internal ID, update user, and list users.
- **FR-012**: The subscription query module MUST provide: create subscription, get subscription by user ID, update subscription, check credit availability (returns balance + boolean), reserve credit (atomic), deduct credit (finalize), and refund credit (on failure).
- **FR-013**: The video query module MUST provide: create video, get video by ID, list videos by user (paginated, sortable by creation date), update video status/metadata, and delete video.
- **FR-014**: The subscription query module MUST enforce that credit checks and reservations are atomic — two simultaneous requests for the same user must not both succeed if only one credit remains.
- **FR-015**: The system MUST configure organized file storage with separate buckets for videos, images, audio, and thumbnails, with files organized by user ID. The videos, images, and audio buckets MUST require authenticated access (private). The thumbnails bucket MUST be publicly accessible for fast dashboard loading.
- **FR-016**: The usage tracking query module MUST provide: log an action (with action type, credit cost, and metadata), query actions by user (paginated, date-filterable), and get aggregate usage statistics for a user.
- **FR-017**: The generation log query module MUST provide: create a log entry for a pipeline stage, update stage status (pending/success/error with duration and error message), and list logs by video ID.
- **FR-018**: All query functions MUST return typed results matching the database schema, using the project's error handling patterns (AppError with ERROR_CODES) for failures.
- **FR-019**: The database schema MUST support a computed column for remaining credits (total minus used) so credit balance is always derivable from the subscription record.

### Key Entities

- **User**: Represents a person using the application. Has an external authentication ID, email, and name. One user has one subscription and many videos.
- **Subscription**: Represents a user's billing tier and credit balance. Tracks the tier (free/basic/pro/enterprise), status (active/cancelled/expired), total credits, used credits, billing cycle dates, and external payment ID. One subscription belongs to one user.
- **Video**: Represents a generated video asset. Stores the title, original prompt, duration, processing status, file URLs (video + thumbnail), storage path, file size, and structured metadata (scenes, settings). One video belongs to one user and has many generation logs.
- **Generation Log**: Tracks each stage of the video generation pipeline (script, images, audio, render). Records the stage name, status (pending/success/error), processing duration, and any error messages. Multiple logs belong to one video.
- **Uploaded Image**: Represents a user-uploaded image for video scenes. Stores the original filename, storage path, file size, and MIME type. Belongs to a user and optionally linked to a video.
- **Usage Tracking**: An activity log recording user actions (video generated, image uploaded, subscription changed) with credit cost and metadata. Used for the dashboard analytics and business reporting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user signing up through authentication completes account provisioning (user record + free subscription + starter credits) within 5 seconds of the webhook arriving, with zero manual steps required.
- **SC-002**: Every query function in the data access layer returns typed results that match the database schema — verified by the application compiling without type errors in strict mode.
- **SC-003**: The webhook handler processes the same event delivered multiple times without creating duplicate records or corrupting data — verified by sending the same webhook payload three times and confirming only one user record exists.
- **SC-004**: Credit reservation is atomic — two simultaneous credit check operations for a user with exactly one credit remaining result in at most one successful reservation, never two.
- **SC-005**: All storage buckets are accessible and organized — a file uploaded to each bucket (videos, images, audio, thumbnails) under a user ID path is retrievable via its storage URL. Private buckets (videos, images, audio) reject unauthenticated requests; the thumbnails bucket serves files publicly.
- **SC-006**: The database schema supports all downstream features (F005-F009) — verified by confirming that the video, generation log, and uploaded image tables have all columns referenced in the PRD.
- **SC-007**: No raw database client calls exist outside of the query layer — verified by a codebase search.

## Assumptions

- The authentication provider (Clerk) is already configured and functional from F003. This feature extends the existing webhook endpoint to perform actual database operations.
- The existing webhook endpoint at `/api/auth/webhook` (from F003) currently logs events but does not persist data. This feature replaces the logging with actual user creation/sync logic.
- The free-tier subscription configuration (credit count, storage quota) is defined in the existing `src/lib/constants/pricing.ts` file from F001.
- Credit reservation uses database-level row operations to ensure atomicity — application-level locking is insufficient for concurrent requests.
- The computed `credits_remaining` column is derived from `credits_total - credits_used`, stored in the database for query efficiency.
- Storage buckets use a flat `{bucket}/{user_id}/{filename}` path structure. No nested subdirectories per video or date.
- Pagination defaults to 20 items per page with cursor-based or offset pagination (implementation decision deferred to planning phase).
- The `metadata` JSONB columns on videos and usage tracking store unstructured data that varies by context — the schema defines the column but not the JSONB shape.
- Database migrations are managed as SQL files applied during deployment, not via an ORM migration framework.
- The user deletion flow uses a soft-delete approach (status change) rather than hard delete to preserve video history and usage data integrity.

## Dependencies

- **F001 (Foundation)**: Provides project scaffolding, TypeScript types, constants (including `pricing.ts` with tier definitions), error handling system (`AppError`, `ERROR_CODES`), Zustand store skeletons.
- **F002 (Design System)**: Provides the API fetch wrapper (`src/lib/api/client.ts`) used by client-side code to call API routes that interact with the database.
- **F003 (Auth/Clerk)**: Provides Clerk SDK configuration, the existing webhook endpoint shell at `/api/auth/webhook`, Clerk middleware for route protection, and the authentication flow that triggers user creation.
- **Blocks F005 (AI Services)**: AI service endpoints need to log generation events and store generated assets.
- **Blocks F006 (Billing)**: Stripe billing needs the subscription table and credit management queries.
- **Blocks F007 (Video Wizard)**: The wizard needs to create video records and persist wizard state.
- **Blocks F008 (Rendering)**: The rendering pipeline needs to update video status and store final assets.
- **Blocks F009 (Dashboard)**: The dashboard needs all query functions to display user data, videos, and usage stats.
