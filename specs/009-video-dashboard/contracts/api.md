# API Contracts: Video Dashboard & Library (F009)

**Feature**: 009-video-dashboard | **Date**: 2026-02-13
**Auth**: All endpoints require Clerk session. User ID is derived from Clerk token server-side — never trusted from request body.
**Response shape**: `{ data: T }` on success | `{ error: { code, message } }` on failure (Constitution Principle II)

---

## GET /api/videos

List the authenticated user's videos with server-side search, filter, sort, and pagination.

### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | `number` | `1` | Page number (1-indexed) |
| `pageSize` | `number` | `12` | Results per page (max 12, FR-008) |
| `search` | `string` | — | Filter by title or prompt (case-insensitive substring, FR-005) |
| `sort` | `'newest' \| 'oldest'` | `'newest'` | Sort direction on `created_at` (FR-006) |
| `dateFilter` | `'today' \| 'this_week' \| 'this_month' \| 'all'` | `'all'` | Filter by creation date (FR-007) |

### Response 200

```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "string",
        "prompt": "string",
        "status": "completed | processing | failed",
        "current_stage": "audio | sync | render | finalize | null",
        "duration_seconds": 58.4,
        "thumbnail_url": "string | null",
        "video_url": "string | null",
        "metadata": {
          "voice": "string",
          "theme": "string",
          "captionStyle": "string",
          "transitionType": "string"
        },
        "created_at": "ISO8601",
        "updated_at": "ISO8601"
      }
    ],
    "total": 42,
    "page": 1,
    "pageSize": 12,
    "totalPages": 4
  }
}
```

### Ownership enforcement

Query is scoped to `user_id = dbUser.id` derived from Clerk session. Users cannot retrieve other users' videos via this endpoint.

---

## GET /api/videos/:id

Get a single video by ID. Returns full metadata including signed URLs for playback and download.

### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | `uuid` | Video ID |

### Response 200

```json
{
  "data": {
    "id": "uuid",
    "title": "string",
    "prompt": "string",
    "status": "completed | processing | failed",
    "current_stage": "audio | sync | render | finalize | null",
    "duration_seconds": 58.4,
    "thumbnail_url": "string | null",
    "video_url": "string | null",
    "file_size_bytes": 12345678,
    "metadata": {
      "voice": "string",
      "theme": "string",
      "captionStyle": "string",
      "transitionType": "string"
    },
    "created_at": "ISO8601",
    "updated_at": "ISO8601"
  }
}
```

### Response 404

Returned when video does not exist OR belongs to a different user (ownership check — FR-014). No distinction is made to prevent enumeration.

```json
{ "error": { "code": "RESOURCE_NOT_FOUND", "message": "Video not found" } }
```

---

## DELETE /api/videos/:id

Permanently delete a video and all associated storage files (atomic — FR-012).

### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | `uuid` | Video ID |

### Behavior

1. Verify ownership (`video.user_id === dbUser.id`)
2. Fetch `uploaded_images` rows for this video (scene image paths)
3. Attempt deletion of all storage files:
   - `videos` bucket: MP4 file
   - `audio` bucket: audio file
   - `thumbnails` bucket: thumbnail
   - `images` bucket: all scene images
4. If ALL storage deletions succeed → delete DB row + uploaded_images rows → return 200
5. If ANY storage deletion fails → do NOT delete DB row → return 500 with retryable error

### Response 200

```json
{ "data": { "deleted": true } }
```

### Response 500 (storage failure)

```json
{
  "error": {
    "code": "STORAGE_DELETE_FAILED",
    "message": "Failed to delete video files. Please try again."
  }
}
```

---

## GET /api/user/usage

Return credit balance and monthly usage stats for the authenticated user.

### Response 200

```json
{
  "data": {
    "creditsRemaining": 7,
    "creditsTotal": 10,
    "creditsUsed": 3,
    "videosThisMonth": 3,
    "dailyCounts": [
      { "date": "2026-02-01", "count": 1 },
      { "date": "2026-02-05", "count": 2 }
    ]
  }
}
```

**Notes:**
- `dailyCounts` contains only dates with at least one video created (sparse array)
- `videosThisMonth` is scoped to the current calendar month (from `billing_cycle_start` or calendar month start)
- This endpoint extends/reuses the existing `GET /api/user/credits` pattern from F006

---

## PATCH /api/videos/:id/timeout (internal — cron or check-on-read)

Mark a stale processing video as failed. Called internally by the timeout mechanism (FR-020).

> **Note**: This is not a public endpoint. The implementation strategy (Vercel Cron vs check-on-read in `listVideosByUser`) is resolved in research.md. The contract here documents the DB-level operation only.

**Operation**: `UPDATE videos SET status='failed', current_stage=null, updated_at=NOW() WHERE id=:id AND status='processing'`

---

## Error Codes (new for F009)

| Code | HTTP | Meaning |
|---|---|---|
| `STORAGE_DELETE_FAILED` | 500 | One or more storage file deletions failed during video delete |

All other error codes reuse `ERROR_CODES` from `src/lib/errors/codes.ts` (Constitution Principle II).
