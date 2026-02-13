# Data Model: Video Dashboard & Library (F009)

**Feature**: 009-video-dashboard
**Date**: 2026-02-13
**Depends on**: F008 schema (videos table), F006 schema (subscriptions, usage_tracking)

---

## Existing Entities Used (read-only for this feature)

### `videos` table (already exists, F008 extended)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → users | ownership |
| `title` | `text` | derived from first 100 chars of prompt |
| `prompt` | `text` | original user prompt (searched in FR-005) |
| `status` | `enum('processing','completed','failed')` | drives UI state |
| `current_stage` | `enum('audio','sync','render','finalize') \| null` | render progress |
| `video_url` | `text \| null` | signed storage path for MP4 |
| `thumbnail_url` | `text \| null` | public storage path for thumbnail |
| `storage_path` | `text \| null` | raw storage path for MP4 (used for deletion) |
| `file_size_bytes` | `int8 \| null` | |
| `duration_seconds` | `float8 \| null` | |
| `metadata` | `jsonb` | contains voice, theme, captionStyle, transitionType, renderStartedAt, scene images |
| `created_at` | `timestamptz` | used for date filter / sort |
| `updated_at` | `timestamptz` | |

**Metadata shape** (typed as `VideoMetadata` in F009 code):
```ts
type VideoMetadata = {
  voice?: string;            // ElevenLabs voice ID
  theme?: string;            // 'realistic' | 'anime' | 'artistic' | 'cinematic' | 'minimalist'
  captionStyle?: string;     // 'word-by-word' | 'full-sentence' | 'none'
  transitionType?: string;   // 'fade' | 'crossfade'
  renderStartedAt?: string;  // ISO timestamp — used for 30-min timeout (FR-020)
  audioStoragePath?: string;
  wordAlignment?: unknown[];
  scenes?: unknown[];
}
```

### `subscriptions` table (F006, read-only)

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` | |
| `credits_remaining` | `int4` | computed column |
| `credits_total` | `int4` | |
| `credits_used` | `int4` | |
| `billing_cycle_start` | `timestamptz \| null` | used for "this month" filter on usage chart |

### `usage_tracking` table (F006, read-only)

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` | |
| `action` | `text` | filter by `'video_generated'` for usage chart |
| `credits_used` | `int4` | |
| `created_at` | `timestamptz` | group by day for chart data |

### `uploaded_images` table (F004, used for storage cleanup on delete)

| Column | Type | Notes |
|---|---|---|
| `video_id` | `uuid \| null` FK → videos | join to find scene images to delete |
| `storage_path` | `text` | path in `images` bucket |

---

## Schema Changes Required for F009

### Migration: `20260213000000_add_video_timeout_index.sql`

No new tables needed. One index addition to support timeout query performance:

```sql
-- Index to efficiently find stale processing videos (FR-020)
-- Query: status='processing' AND metadata->>'renderStartedAt' < NOW() - INTERVAL '30 minutes'
CREATE INDEX IF NOT EXISTS videos_processing_started_at_idx
  ON videos ((metadata->>'renderStartedAt'))
  WHERE status = 'processing';
```

---

## State Machine: Video Status

```
[wizard complete]
       │
       ▼
  processing  ──── >30 min stale ──────► failed
       │                                    │
  render done                          [user clicks Regenerate]
       │                                    │
       ▼                                    │
  completed                         [returns to wizard]
       │
  [user deletes]
       │
    (gone)
```

**State transition rules:**
- `processing → completed`: set by render pipeline callback (`/api/video/render/complete`)
- `processing → failed`: set by render pipeline on error OR by timeout job (FR-020)
- `completed → (deleted)`: DELETE API call with atomic storage cleanup (FR-012)
- `failed → (deleted)`: DELETE API call (storage cleanup best-effort since files may be partial)

---

## API Query Shapes

### Video list query params (server-side — FR-005, FR-006, FR-007, FR-008)

```ts
type VideoListParams = {
  page?: number;        // default: 1
  pageSize?: number;    // default: 12 (FR-008)
  search?: string;      // ilike on title OR prompt (FR-005)
  sort?: 'newest' | 'oldest';  // default: 'newest' (FR-006)
  dateFilter?: 'today' | 'this_week' | 'this_month' | 'all';  // default: 'all' (FR-007)
};
```

### Usage stats shape (dashboard widget + billing page)

```ts
type UsageStats = {
  creditsRemaining: number;
  creditsTotal: number;
  creditsUsed: number;
  videosThisMonth: number;
  dailyCounts: Array<{ date: string; count: number }>;  // for chart
};
```

---

## Storage Paths (for atomic delete — FR-012)

When deleting a video, the following files must be removed:

| Bucket | Path pattern | Derived from |
|---|---|---|
| `videos` | `{userId}/{videoId}.mp4` | `video.storage_path` |
| `audio` | `{userId}/{videoId}.mp3` | reconstructed from `videoId` |
| `images` | `{userId}/{filename}` | `uploaded_images` WHERE `video_id = videoId` |
| `thumbnails` | `{userId}/{videoId}.jpg` | reconstructed from `thumbnail_url` path |

**Delete order (atomic pattern):**
1. Fetch list of image paths from `uploaded_images` WHERE `video_id = videoId`
2. Attempt deletion of all storage files (videos, audio, thumbnails buckets + all image paths)
3. If ALL storage deletions succeed → delete DB row + delete `uploaded_images` rows
4. If ANY storage deletion fails → throw error, do NOT delete DB row (FR-012 rollback)
