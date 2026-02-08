# Data Model: Database Schema & User Sync

**Feature**: 003-database-user-sync
**Date**: 2026-02-08

## Overview

This feature introduces the full relational data model for ReelZero. Six tables store all application state — users, subscriptions, videos, generation logs, uploaded images, and usage tracking. A PostgreSQL function provides atomic credit reservation. All access goes through typed query functions in `src/lib/db/queries/`.

## Entities

### users

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Internal user ID |
| clerk_user_id | TEXT | UNIQUE, NOT NULL | Clerk's external user ID |
| email | TEXT | UNIQUE, NOT NULL | From Clerk profile |
| name | TEXT | NOT NULL | First + last from Clerk |
| deleted_at | TIMESTAMPTZ | DEFAULT NULL | Soft delete timestamp |
| created_at | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | |

**Indexes**: `UNIQUE(clerk_user_id)`, `UNIQUE(email)`

### subscriptions

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | FK → users(id), UNIQUE, NOT NULL | One subscription per user |
| tier | TEXT | NOT NULL, CHECK IN ('free','basic','pro','enterprise') | Matches pricing.ts IDs |
| status | TEXT | NOT NULL, CHECK IN ('active','cancelled','expired') | Lifecycle state |
| credits_total | INTEGER | NOT NULL, DEFAULT 0 | Monthly credit allocation |
| credits_used | INTEGER | NOT NULL, DEFAULT 0 | Credits consumed this cycle |
| credits_remaining | INTEGER | GENERATED ALWAYS AS (credits_total - credits_used) STORED | Computed column |
| billing_cycle_start | DATE | | Start of current billing period |
| billing_cycle_end | DATE | | End of current billing period |
| stripe_subscription_id | TEXT | | Stripe external ID (null for free tier) |
| created_at | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | |

**Indexes**: `UNIQUE(user_id)`, `idx_subscriptions_user_id`

### videos

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | FK → users(id), NOT NULL | Owner |
| title | TEXT | NOT NULL | User-facing video title |
| prompt | TEXT | NOT NULL | Original generation prompt |
| duration_seconds | INTEGER | | 50-60 seconds for MVP |
| status | TEXT | NOT NULL, CHECK IN ('processing','completed','failed'), DEFAULT 'processing' | Pipeline state |
| video_url | TEXT | | Supabase Storage URL (null until complete) |
| thumbnail_url | TEXT | | Public thumbnail URL |
| storage_path | TEXT | | Full storage path for cleanup |
| file_size_bytes | BIGINT | | Final MP4 size |
| metadata | JSONB | DEFAULT '{}' | Scene info, settings, theme |
| created_at | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | |

**Indexes**: `idx_videos_user_id`, `idx_videos_created_at DESC`

### generation_logs

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| video_id | UUID | FK → videos(id) ON DELETE CASCADE, NOT NULL | Parent video |
| stage | TEXT | NOT NULL, CHECK IN ('script','images','audio','render') | Pipeline stage |
| status | TEXT | NOT NULL, CHECK IN ('pending','success','error'), DEFAULT 'pending' | Stage outcome |
| duration_ms | INTEGER | | Processing time |
| error_message | TEXT | | Error details if failed |
| created_at | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | |

**Indexes**: `idx_generation_logs_video_id`

### uploaded_images

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | FK → users(id), NOT NULL | Uploader |
| video_id | UUID | FK → videos(id), DEFAULT NULL | Linked video (nullable) |
| original_filename | TEXT | NOT NULL | Original file name |
| storage_path | TEXT | NOT NULL | Supabase Storage path |
| file_size_bytes | INTEGER | NOT NULL | File size |
| mime_type | TEXT | NOT NULL | image/png, image/jpeg, etc. |
| created_at | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | |

**Indexes**: `idx_uploaded_images_user_id`

### usage_tracking

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | FK → users(id), NOT NULL | Actor |
| action | TEXT | NOT NULL | 'video_generated', 'image_uploaded', 'subscription_changed', etc. |
| credits_used | INTEGER | NOT NULL, DEFAULT 0 | Credit cost for this action |
| metadata | JSONB | DEFAULT '{}' | Context-specific data (video_id, filename, etc.) |
| created_at | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | |

**Indexes**: `idx_usage_tracking_user_id`, `idx_usage_tracking_created_at DESC`

## PostgreSQL Functions

### reserve_credit

```sql
CREATE OR REPLACE FUNCTION reserve_credit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_credits_used INTEGER;
  v_credits_total INTEGER;
BEGIN
  SELECT credits_used, credits_total
  INTO v_credits_used, v_credits_total
  FROM subscriptions
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_credits_used >= v_credits_total THEN
    RETURN FALSE;
  END IF;

  UPDATE subscriptions
  SET credits_used = credits_used + 1, updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

## Relationships

```
users (1) ──── (1) subscriptions     [one subscription per user]
users (1) ──── (N) videos            [user owns many videos]
users (1) ──── (N) uploaded_images   [user uploads many images]
users (1) ──── (N) usage_tracking    [user has many tracked actions]
videos (1) ──── (N) generation_logs  [video has many stage logs]
videos (1) ──── (N) uploaded_images  [video linked to many uploads, optional]
```

## State Transitions

### Video Status
```
processing → completed    (render succeeded)
processing → failed       (any pipeline stage failed)
```

### Subscription Status
```
active → cancelled        (user cancels, remains until billing cycle end)
active → expired          (payment failed past grace period, or user deleted)
cancelled → active        (user resubscribes)
expired → active          (user resubscribes)
```

### Generation Log Status
```
pending → success         (stage completed)
pending → error           (stage failed)
```

## TypeScript Types (src/lib/db/schema.ts)

### Select Types (query results)

```typescript
type User = {
  id: string;
  clerk_user_id: string;
  email: string;
  name: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type Subscription = {
  id: string;
  user_id: string;
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired';
  credits_total: number;
  credits_used: number;
  credits_remaining: number; // computed, read-only
  billing_cycle_start: string | null;
  billing_cycle_end: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
};

type Video = {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  duration_seconds: number | null;
  status: 'processing' | 'completed' | 'failed';
  video_url: string | null;
  thumbnail_url: string | null;
  storage_path: string | null;
  file_size_bytes: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
```

### Insert Types (creation input)

```typescript
type UserInsert = {
  clerk_user_id: string;
  email: string;
  name: string;
};

type SubscriptionInsert = {
  user_id: string;
  tier: Subscription['tier'];
  status?: Subscription['status']; // defaults to 'active'
  credits_total: number;
  credits_used?: number; // defaults to 0
  billing_cycle_start?: string;
  billing_cycle_end?: string;
  stripe_subscription_id?: string;
};

type VideoInsert = {
  user_id: string;
  title: string;
  prompt: string;
  metadata?: Record<string, unknown>;
};
```

## Pagination Type

```typescript
type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

type PaginationParams = {
  page?: number;   // default: 1
  pageSize?: number; // default: 20
};
```

## Credit Check Return Type

```typescript
type CreditCheckResult = {
  creditsRemaining: number;
  creditsTotal: number;
  creditsUsed: number;
  canGenerate: boolean;
};
```

## Storage Buckets

| Bucket | Access | Content | Path Pattern |
|--------|--------|---------|--------------|
| videos | Private (signed URLs) | Final MP4 files | `{user_id}/{video_id}.mp4` |
| images | Private (signed URLs) | Generated + uploaded scene images | `{user_id}/{filename}` |
| audio | Private (signed URLs) | TTS audio files | `{user_id}/{video_id}.mp3` |
| thumbnails | Public | Video thumbnail images | `{user_id}/{video_id}.jpg` |

## Validation Rules

| Rule | Applies To | Constraint |
|------|-----------|------------|
| Unique clerk_user_id | users | No duplicate external IDs |
| Unique email | users | No duplicate emails |
| One subscription per user | subscriptions | UNIQUE(user_id) |
| credits_used <= credits_total | subscriptions | Enforced by reserve_credit function |
| Video status transitions | videos | processing → completed OR failed only |
| Stage values | generation_logs | Must be one of: script, images, audio, render |
| File size > 0 | uploaded_images | file_size_bytes must be positive |
| No raw DB access | Application code | All queries through src/lib/db/queries/ |
