# Quickstart: Database Schema & User Sync

**Feature**: 003-database-user-sync
**Date**: 2026-02-08

## Prerequisites

- F001 (Foundation) completed — project scaffolding, error system, constants, types
- F002 (Design System) completed — API client, design tokens
- F003 (Auth/Clerk) completed — Clerk SDK, webhook endpoint shell, dashboard layout
- Branch `003-database-user-sync` checked out
- Supabase project created and URL + keys available in `.env`

## Implementation Steps

### Step 1: Install Supabase Client

Install `@supabase/supabase-js` as a project dependency.

**Files**: `package.json`

### Step 2: Create Supabase Client Module

Create `src/lib/db/client.ts` with two client factories — one using the anon key (for future client-side use) and one using the service role key (for server-side query functions and webhook handler).

**Files**: `src/lib/db/client.ts`

### Step 3: Create Database Schema Migration

Write the SQL migration file that creates all 6 tables (users, subscriptions, videos, generation_logs, uploaded_images, usage_tracking), the `reserve_credit` PostgreSQL function, and all indexes/constraints.

**Files**: `supabase/migrations/YYYYMMDDHHMMSS_create_initial_schema.sql`

### Step 4: Apply Migration to Supabase

Run the migration against the Supabase project to create all tables.

### Step 5: Create TypeScript Schema Types

Create `src/lib/db/schema.ts` with all entity types (select types, insert types, update types), pagination types, and credit check result type.

**Files**: `src/lib/db/schema.ts`

### Step 6: Create Query Modules

Create typed query functions for each entity in `src/lib/db/queries/`:

- `users.ts` — createUser (upsert), getUserByClerkId, getUserById, updateUser, softDeleteUser
- `subscriptions.ts` — createSubscription, getSubscriptionByUserId, updateSubscription, checkCredits, reserveCredit, deductCredit, refundCredit
- `videos.ts` — createVideo, getVideoById, listVideosByUser (paginated), updateVideo, deleteVideo
- `generation-logs.ts` — createGenerationLog, updateGenerationLog, listLogsByVideoId
- `uploaded-images.ts` — createUploadedImage, listImagesByUser, listImagesByVideoId, deleteUploadedImage
- `usage.ts` — logAction, listActionsByUser (paginated, date-filterable), getUsageStats

**Files**: `src/lib/db/queries/*.ts`

### Step 7: Create Storage Helper

Create `src/lib/db/storage.ts` with functions for uploading, downloading (signed URLs), and deleting files across the four storage buckets.

**Files**: `src/lib/db/storage.ts`

### Step 8: Configure Storage Buckets

Create the four storage buckets in Supabase (videos, images, audio, thumbnails) with appropriate access policies (private for videos/images/audio, public for thumbnails).

### Step 9: Update Webhook Handler

Modify `src/app/api/auth/webhook/route.ts` to replace the logging placeholder with actual database operations — user upsert on `user.created`, user update on `user.updated`, soft delete on `user.deleted`, and automatic free-tier subscription creation.

**Files**: `src/app/api/auth/webhook/route.ts`

### Step 10: Build Verification

Run `tsc --noEmit` and `npm run lint` to verify no TypeScript or linting errors.

## Verification Checklist

1. [ ] `@supabase/supabase-js` is installed in `package.json`
2. [ ] `src/lib/db/client.ts` exports `createSupabaseAdmin()` function
3. [ ] SQL migration file exists and creates all 6 tables + `reserve_credit` function
4. [ ] `src/lib/db/schema.ts` exports types for all 6 entities (select + insert variants)
5. [ ] `src/lib/db/queries/users.ts` — upsert, getByClerkId, getById, update, softDelete all work
6. [ ] `src/lib/db/queries/subscriptions.ts` — checkCredits returns `{ creditsRemaining, canGenerate }`
7. [ ] `src/lib/db/queries/subscriptions.ts` — reserveCredit is atomic (uses RPC)
8. [ ] `src/lib/db/queries/videos.ts` — listByUser returns paginated results with total count
9. [ ] `src/lib/db/queries/usage.ts` — logAction creates entry, listByUser supports date filtering
10. [ ] `src/lib/db/storage.ts` — upload and getUrl work for all 4 buckets
11. [ ] Storage: videos/images/audio buckets are private; thumbnails bucket is public
12. [ ] Webhook: `user.created` creates user + free subscription in database
13. [ ] Webhook: duplicate `user.created` events don't create duplicate records
14. [ ] Webhook: `user.updated` updates name/email in database
15. [ ] Webhook: `user.deleted` soft-deletes user (sets `deleted_at`)
16. [ ] `tsc --noEmit` passes with zero errors
17. [ ] `npm run lint` passes with zero warnings
18. [ ] No raw Supabase client calls outside `src/lib/db/` (codebase search)
