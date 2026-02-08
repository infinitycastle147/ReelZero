# Research: Database Schema & User Sync

**Feature**: 003-database-user-sync
**Date**: 2026-02-08

## R1: Supabase Client Initialization Pattern

**Decision**: Create two Supabase client instances — a public client using the anon key for client-side/read operations and a service-role client for server-side privileged operations (webhook handler, credit mutations).

**Rationale**: Supabase differentiates between the anon key (respects Row Level Security) and the service role key (bypasses RLS). The webhook handler runs server-side without a user session, so it needs the service role client to create/update user records. Query functions that run in API route handlers also use the service role client since auth is handled by Clerk middleware, not Supabase RLS.

**Specific approach**:
- `src/lib/db/client.ts` exports `createSupabaseClient()` (anon key, for future client-side usage) and `createSupabaseAdmin()` (service role key, for all server-side query functions)
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- These are already defined in `.env.example` and partially populated in `.env`

**Alternatives considered**:
- Single client with anon key: Rejected — cannot bypass RLS for admin operations like user creation from webhooks
- Prisma ORM: Rejected — constitution mandates raw query functions in `src/lib/db/queries/`; ORM adds unnecessary abstraction layer and bundle size
- Drizzle ORM: Rejected — same reason; Supabase JS client provides sufficient typed query support

## R2: Schema Migration Strategy

**Decision**: Use plain SQL migration files in `supabase/migrations/` applied via the Supabase CLI (`supabase db push` or `supabase migration up`). No ORM migration framework.

**Rationale**: The constitution (Section IV) states "Database schema changes MUST be documented and applied via migration scripts." Supabase CLI is the standard tool for Supabase PostgreSQL. SQL files give full control over DDL statements, computed columns, indexes, and RLS policies.

**Specific approach**:
- Migration files: `supabase/migrations/YYYYMMDDHHMMSS_create_initial_schema.sql`
- One initial migration creates all 6 tables, indexes, and the computed column
- Future schema changes get separate timestamped migration files
- The `supabase/` directory already exists in the project (from F001 scaffolding)

**Alternatives considered**:
- Knex.js migrations: Rejected — adds dependency, less idiomatic for Supabase
- Supabase Dashboard UI: Rejected — not reproducible, not version-controllable
- TypeORM: Rejected — overkill for this project's needs; constitution prefers direct query functions

## R3: TypeScript Schema Types Strategy

**Decision**: Hand-write TypeScript types in `src/lib/db/schema.ts` that mirror the database tables. Use Supabase's generated types as a reference but maintain manual types for tighter control and readability.

**Rationale**: Supabase can auto-generate types via `supabase gen types typescript`, but these types are verbose and include internal Supabase metadata. Hand-written types in `schema.ts` provide:
- Cleaner imports (e.g., `import type { User, Video } from '@/lib/db/schema'`)
- Separation of insert types vs. select types (e.g., `UserInsert` vs. `User`)
- Explicit documentation of field purposes
- Alignment with the constitution's strict type safety principle

**Specific approach**:
- `User`, `UserInsert` — select/insert shapes for users table
- `Subscription`, `SubscriptionInsert` — includes `credits_remaining` as readonly computed
- `Video`, `VideoInsert`, `VideoUpdate` — includes metadata JSONB typed as `Record<string, unknown>`
- `GenerationLog`, `GenerationLogInsert` — pipeline stage tracking
- `UploadedImage`, `UploadedImageInsert` — user uploads
- `UsageEntry`, `UsageEntryInsert` — activity logging
- All ID fields typed as `string` (UUID representation in TypeScript)
- All timestamps typed as `string` (ISO 8601 from Supabase)

**Alternatives considered**:
- Supabase CLI auto-generated types: Rejected for primary use — too verbose; may use as validation reference
- Zod schemas: Deferred — validation library not yet in project; can be added in future features if needed

## R4: Atomic Credit Reservation Pattern

**Decision**: Use a Supabase RPC (PostgreSQL function) for atomic credit reservation. The function performs `SELECT ... FOR UPDATE` to lock the subscription row, checks `credits_remaining > 0`, increments `credits_used` if available, and returns success/failure in a single transaction.

**Rationale**: FR-014 requires atomicity for concurrent credit operations. Application-level checks (read credits → check → write) create a race condition window. A PostgreSQL function with row-level locking (`FOR UPDATE`) ensures that two concurrent requests for the same user are serialized at the database level.

**Specific approach**:
- PostgreSQL function: `reserve_credit(p_user_id UUID) RETURNS BOOLEAN`
  - Acquires row lock: `SELECT credits_used, credits_total FROM subscriptions WHERE user_id = p_user_id FOR UPDATE`
  - Checks: `credits_used < credits_total`
  - If available: `UPDATE subscriptions SET credits_used = credits_used + 1 WHERE user_id = p_user_id`
  - Returns `true` (reserved) or `false` (insufficient)
- Called from TypeScript via `supabase.rpc('reserve_credit', { p_user_id: userId })`
- Deduct = no-op (reservation already incremented `credits_used`)
- Refund: `UPDATE subscriptions SET credits_used = credits_used - 1 WHERE user_id = p_user_id AND credits_used > 0`

**Alternatives considered**:
- Application-level optimistic locking: Rejected — race condition between read and write
- PostgreSQL advisory locks: Rejected — more complex, same outcome achievable with `FOR UPDATE`
- Redis distributed lock: Rejected — adds infrastructure dependency; PostgreSQL row locking is sufficient for MVP scale

## R5: Webhook Event Handling Strategy

**Decision**: Handle three Clerk webhook event types: `user.created`, `user.updated`, and `user.deleted`. Use an upsert pattern for `user.created` to ensure idempotency.

**Rationale**: Clerk webhooks may be retried, so every handler must be idempotent. Using `upsert` (INSERT ... ON CONFLICT UPDATE) for user creation means a duplicate `user.created` event simply updates the existing record. The `user.deleted` event sets a `deleted_at` timestamp rather than removing the row.

**Specific approach**:
- `user.created`: Upsert user record + create free-tier subscription (if subscription doesn't exist)
- `user.updated`: Update user record (name, email) by `clerk_user_id`
- `user.deleted`: Set `deleted_at = NOW()` on user record (soft delete)
- Extract `email_addresses[0].email_address`, `first_name`, `last_name` from Clerk event payload
- Use the existing `withErrorHandler` wrapper for consistent error responses

**Alternatives considered**:
- Strict INSERT for `user.created` with conflict error: Rejected — not idempotent
- Hard delete for `user.deleted`: Rejected — loses referential integrity with videos and usage
- Queue-based processing: Deferred — direct webhook handling is sufficient for MVP; if scaling issues arise, can add a queue later

## R6: Pagination Strategy for List Queries

**Decision**: Use offset-based pagination with a default page size of 20. Return `{ items: T[], total: number, page: number, pageSize: number }` shape.

**Rationale**: The application's data access patterns (list videos for a user, list usage entries) involve relatively small datasets per user (max ~200 videos/month for enterprise). Offset pagination is simpler to implement, works well with Supabase's `.range()` method, and supports "jump to page N" UX patterns needed for F009 (Dashboard). Cursor-based pagination would be overengineering for MVP.

**Specific approach**:
- All list queries accept `{ page?: number, pageSize?: number }` with defaults `{ page: 1, pageSize: 20 }`
- Supabase `.range(from, to)` calculates offset: `from = (page - 1) * pageSize`, `to = from + pageSize - 1`
- Count query uses Supabase's `{ count: 'exact', head: true }` for total
- Return type: `PaginatedResult<T> = { items: T[], total: number, page: number, pageSize: number }`

**Alternatives considered**:
- Cursor-based pagination: Deferred — more complex, better for infinite scroll; can migrate later if needed
- No pagination (fetch all): Rejected — won't scale even at MVP level
- Limit/offset without total count: Rejected — F009 dashboard needs total count for page indicators

## R7: Storage Helper Architecture

**Decision**: Create `src/lib/db/storage.ts` with helper functions for upload, download URL generation, and deletion across the four buckets. Each function takes the bucket name, user ID, and filename as parameters.

**Rationale**: Storage operations are simple (upload file, get URL, delete file) but need consistent path construction (`{user_id}/{filename}`) and access control awareness (private vs. public thumbnails). Centralizing these in a single module prevents scattered Supabase Storage calls and maintains the database abstraction principle.

**Specific approach**:
- `uploadFile(bucket, userId, filename, file, contentType)` → returns storage path
- `getFileUrl(bucket, userId, filename)` → returns signed URL (private) or public URL (thumbnails)
- `deleteFile(bucket, userId, filename)` → removes file
- `listFiles(bucket, userId)` → lists files under user path
- Bucket names: `videos`, `images`, `audio`, `thumbnails`
- Private buckets use `createSignedUrl()` with 1-hour expiry
- Thumbnails bucket uses `getPublicUrl()`

**Alternatives considered**:
- Direct Supabase Storage calls in each feature: Rejected — violates abstraction principle, duplicates path construction logic
- S3-compatible SDK: Rejected — Supabase Storage JS client is sufficient and simpler
- Separate storage module per bucket: Rejected — too much code duplication; single module with bucket parameter is cleaner

## R8: Soft Delete Implementation for Users

**Decision**: Add a `deleted_at` nullable timestamp column to the users table. Soft-deleted users have `deleted_at IS NOT NULL`. All user-facing queries filter by `deleted_at IS NULL` by default.

**Rationale**: FR-003 requires preserving referential integrity when a user is deleted. A `deleted_at` timestamp is the standard soft-delete pattern — it preserves the record for foreign key references (videos, usage tracking) while effectively hiding the user from active queries. It also allows potential account recovery.

**Specific approach**:
- Column: `deleted_at TIMESTAMPTZ DEFAULT NULL`
- `getUserByClerkId()` adds `WHERE deleted_at IS NULL` filter
- `listUsers()` adds `WHERE deleted_at IS NULL` filter
- `softDeleteUser(clerkUserId)` sets `deleted_at = NOW()`
- Related records (videos, subscriptions) are NOT modified — they remain accessible for analytics
- Subscription status is set to `'expired'` when user is soft-deleted

**Alternatives considered**:
- Boolean `is_deleted` flag: Rejected — `deleted_at` provides more information (when was it deleted) for auditing
- Separate `deleted_users` table: Rejected — over-complicated, breaks foreign keys
- Hard delete with CASCADE: Rejected — loses video history and usage data
