# Tasks: Database Schema & User Sync

**Input**: Design documents from `/specs/003-database-user-sync/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: No test tasks — tests not requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create Supabase client module

- [x] T001 Install `@supabase/supabase-js` dependency via `npm install @supabase/supabase-js`
- [x] T002 Create Supabase client module with `createSupabaseClient()` (anon key) and `createSupabaseAdmin()` (service role key) factories in `src/lib/db/client.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database migration, TypeScript schema types, and `.gitkeep` cleanup — MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create SQL migration with all 6 tables (users, subscriptions, videos, generation_logs, uploaded_images, usage_tracking), indexes, constraints, and `reserve_credit` PostgreSQL function in `supabase/migrations/20260208000000_create_initial_schema.sql`
- [x] T004 Create TypeScript schema types for all 6 entities (select types: `User`, `Subscription`, `Video`, `GenerationLog`, `UploadedImage`, `UsageEntry`; insert types: `UserInsert`, `SubscriptionInsert`, `VideoInsert`, `GenerationLogInsert`, `UploadedImageInsert`, `UsageEntryInsert`), pagination types (`PaginatedResult<T>`, `PaginationParams`), and credit check type (`CreditCheckResult`) in `src/lib/db/schema.ts`
- [x] T005 Remove placeholder `.gitkeep` from `src/lib/db/queries/.gitkeep` (will be replaced by actual query files)

**Checkpoint**: Foundation ready — database schema defined, TypeScript types available, user story implementation can begin

---

## Phase 3: User Story 1 — Automatic Account Setup on First Sign-In (Priority: P1) 🎯 MVP

**Goal**: When a new user signs up via Clerk/Google OAuth, the system automatically creates a user record and a free-tier subscription with 3 starter credits. Profile updates and account deletion are handled via webhooks.

**Independent Test**: Sign up via Clerk Google OAuth. Navigate to dashboard. Verify user record and free subscription exist in database with 3 credits.

### Implementation for User Story 1

- [x] T006 [P] [US1] Create user query module with `createUser` (upsert via ON CONFLICT on clerk_user_id), `getUserByClerkId`, `getUserById`, `updateUser` (name/email), `listUsers` (active users, filters `deleted_at IS NULL`), and `softDeleteUser` (sets `deleted_at = NOW()`) in `src/lib/db/queries/users.ts`
- [x] T007 [P] [US1] Create subscription query module with `createSubscription` (creates free-tier subscription using credits from `PRICING_TIERS`), `getSubscriptionByUserId`, and `updateSubscription` in `src/lib/db/queries/subscriptions.ts`
- [x] T008 [US1] Update webhook handler to replace logging placeholder with actual database operations: `user.created` → upsert user + create free-tier subscription, `user.updated` → update user name/email, `user.deleted` → soft delete user + expire subscription; **preserve existing `svix` signature verification unchanged** in `src/app/api/auth/webhook/route.ts`

**Checkpoint**: User sign-up through Clerk automatically provisions a database user + free subscription. Webhook idempotency verified.

---

## Phase 4: User Story 2 — Typed Data Access Layer for Application Features (Priority: P1)

**Goal**: Complete the query layer with typed functions for all remaining entities (videos, generation logs, uploaded images) plus credit operations, so that downstream features F005–F009 have a ready-to-use data access API.

**Independent Test**: Import any query function (e.g., `createVideo`, `checkCredits`, `listLogsByVideoId`). Call with valid parameters. Verify typed results match the database schema.

### Implementation for User Story 2

- [x] T009 [US2] Add credit operation functions to the subscription query module: `checkCredits` (returns `CreditCheckResult` with balance + `canGenerate` boolean), `reserveCredit` (calls `reserve_credit` RPC), and `refundCredit` (decrements `credits_used`) in `src/lib/db/queries/subscriptions.ts`
- [x] T010 [P] [US2] Create video query module with `createVideo` (status defaults to 'processing'), `getVideoById`, `listVideosByUser` (paginated with offset, sorted by `created_at DESC`), `updateVideo` (status/metadata/URLs), and `deleteVideo` in `src/lib/db/queries/videos.ts`
- [x] T011 [P] [US2] Create generation log query module with `createGenerationLog` (stage + video_id), `updateGenerationLog` (status/duration_ms/error_message), and `listLogsByVideoId` in `src/lib/db/queries/generation-logs.ts`
- [x] T012 [P] [US2] Create uploaded image query module with `createUploadedImage`, `listImagesByUser` (paginated), `listImagesByVideoId`, and `deleteUploadedImage` in `src/lib/db/queries/uploaded-images.ts`

**Checkpoint**: All 6 entity query modules exist with typed functions. No raw Supabase client calls needed outside `src/lib/db/`.

---

## Phase 5: User Story 3 — File Storage Organization for Generated Assets (Priority: P2)

**Goal**: Provide a centralized storage helper for uploading, retrieving, and deleting files across four Supabase Storage buckets (videos, images, audio as private; thumbnails as public).

**Independent Test**: Upload a test file to each bucket under a user ID path. Verify private buckets return signed URLs and thumbnails return public URLs.

### Implementation for User Story 3

- [x] T013 [P] [US3] Provision 4 Supabase Storage buckets via Supabase dashboard or CLI: `videos` (private), `images` (private), `audio` (private), `thumbnails` (public) — set appropriate access policies for each bucket ⚠️ MANUAL STEP
- [x] T014 [US3] Create storage helper module with `uploadFile` (bucket, userId, filename, file, contentType → storage path), `getFileUrl` (signed URL for private buckets, public URL for thumbnails), `deleteFile`, and `listFiles` in `src/lib/db/storage.ts`

**Checkpoint**: Storage buckets provisioned in Supabase with correct access policies. Storage helper provides typed access to all 4 buckets.

---

## Phase 6: User Story 4 — Usage Tracking and Activity Logging (Priority: P3)

**Goal**: Log every meaningful user action with metadata and credit cost for the F009 dashboard and business analytics.

**Independent Test**: Call `logAction` with action type "video_generated" and metadata. Query `listActionsByUser` for that user. Verify the entry exists with correct action, credits, and timestamp.

### Implementation for User Story 4

- [x] T015 [US4] Create usage tracking query module with `logAction` (action type, credit cost, JSONB metadata), `listActionsByUser` (paginated, sorted by `created_at DESC`), and `getUsageStats` (aggregate credits used for a user) in `src/lib/db/queries/usage.ts`

**Checkpoint**: Usage tracking fully functional. Actions logged with metadata, queryable by user with pagination.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Build verification and codebase hygiene checks

- [x] T016 Run `tsc --noEmit` to verify zero TypeScript errors across all new files
- [x] T017 Run `npm run lint` to verify zero ESLint warnings or errors
- [x] T018 Verify no raw Supabase client imports exist outside `src/lib/db/` via codebase search

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — needs schema types + migration
- **US2 (Phase 4)**: Depends on Phase 3 — extends `subscriptions.ts` from US1 (T009 adds credit ops to the file created in T007)
- **US3 (Phase 5)**: Depends on Phase 2 — independent of US1/US2
- **US4 (Phase 6)**: Depends on Phase 2 — independent of US1/US2/US3
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: After Phase 2 → creates user + subscription query modules
- **US2 (P1)**: After US1 → extends subscription module with credit operations, adds remaining query modules
- **US3 (P2)**: After Phase 2 → independent of US1/US2 (different files)
- **US4 (P3)**: After Phase 2 → independent of US1/US2/US3 (different files)

### Within Each User Story

- Query modules depend on schema types (Phase 2)
- Webhook handler (T008) depends on both user + subscription query modules (T006, T007)
- Credit operations (T009) depend on subscription module (T007)

### Parallel Opportunities

- T006 + T007: User and subscription query modules (different files)
- T010 + T011 + T012: Video, generation log, and uploaded image query modules (different files)
- T013 (bucket provisioning) + T010/T011/T012 (query modules): Different concerns, can run in parallel
- US3 and US4 can run in parallel with each other (and with US2 if T009 is done first)

---

## Parallel Example: Phase 4 (User Story 2)

```bash
# Launch all remaining query modules together (after T009 completes):
Task: "T010 [P] [US2] videos.ts"
Task: "T011 [P] [US2] generation-logs.ts"
Task: "T012 [P] [US2] uploaded-images.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (install dependency, create client)
2. Complete Phase 2: Foundational (migration SQL, schema types)
3. Complete Phase 3: User Story 1 (user + subscription queries, webhook handler)
4. **STOP and VALIDATE**: Sign up via Clerk → verify user + subscription created
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 → Webhook-driven user provisioning works → Deploy (MVP!)
3. US2 → Full typed query layer for all entities → Internal milestone
4. US3 → Storage helper ready for F005/F008 → Deploy
5. US4 → Usage tracking ready for F009 dashboard → Deploy
6. Each story adds capability without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- T009 (credit operations) is NOT marked [P] because it modifies the same file as T007 (subscriptions.ts)
- T014 (storage helper) depends on T013 (buckets must exist before the helper can be verified)
- All query functions use `createSupabaseAdmin()` (service role client) since auth is handled by Clerk middleware
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
