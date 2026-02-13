# Implementation Plan: Video Dashboard & Library

**Branch**: `009-video-dashboard` | **Date**: 2026-02-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/009-video-dashboard/spec.md`

---

## Summary

Build the authenticated user-facing dashboard and video library for ReelZero. This includes:
a complete main dashboard page (welcome card, recent videos, usage stats), a paginated video library with server-side search/filter/sort, a full video detail page with playback/download/delete, and a background timeout mechanism that auto-marks stale processing videos as failed. All API endpoints enforce ownership. Delete is atomic (storage-first, DB rollback on failure).

---

## Technical Context

**Language/Version**: TypeScript 5+ (strict mode), Node.js ≥20
**Primary Dependencies**: Next.js 16.1.6 (App Router), React 19, Supabase JS v2, Clerk v6, Zustand v5, shadcn/ui (new-york), Tailwind CSS v4, Remotion Player (installed from F008), Recharts (via shadcn/ui chart — verify in package.json)
**Storage**: Supabase PostgreSQL (videos, subscriptions, usage_tracking, uploaded_images) + Supabase Storage (videos, audio, images, thumbnails buckets)
**Testing**: `npm test` (existing runner), collocated `.test.ts` files
**Target Platform**: Vercel serverless (Next.js App Router)
**Performance Goals**: Library page ≤2s (SC-002); search results ≤1s after typing stops (FR-005); skeleton ≤200ms (SC-008)
**Constraints**: No Vercel Cron (free tier) → check-on-read timeout; no cross-service transactions → storage-first atomic delete
**Scale/Scope**: Single-user library, hundreds of videos per user at MVP

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. AI Provider Abstraction | ✅ Pass | No AI calls in F009; reads existing assets only |
| II. Strict Type Safety | ✅ Pass | All shapes typed; `AppError` + `ERROR_CODES`; new `STORAGE_DELETE_FAILED` code |
| III. Direct Imports Only | ✅ Pass | No barrel files; named exports only |
| IV. Database Abstraction | ✅ Pass | All DB access through `src/lib/db/queries/` |
| V. Microservice Boundary | ✅ Pass | Main app only; no renderer calls |
| VI. Credit-Gated Operations | ✅ Pass | Dashboard reads balance only; generation gating unchanged |
| VII. Consistent Naming | ✅ Pass | kebab-case files, camelCase hooks, SCREAMING_SNAKE_CASE constants |

**Gate result**: PASS — no violations.

---

## Project Structure

### Documentation (this feature)

```text
specs/009-video-dashboard/
├── plan.md              # This file
├── research.md          # Decisions: search, timeout, delete, chart, localStorage
├── data-model.md        # Entities, state machine, query shapes, storage paths
├── quickstart.md        # Dev setup, seed data, testing checklist
├── contracts/
│   └── api.md           # API contracts for all 4 endpoints
└── tasks.md             # /speckit.tasks output (not yet created)
```

### Source Code Layout (additions/changes only)

```text
src/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   └── page.tsx                    # REPLACE stub → full dashboard
│   │   └── videos/
│   │       ├── page.tsx                    # NEW — video library page
│   │       └── [id]/
│   │           └── page.tsx                # NEW — video detail page
│   └── api/
│       ├── videos/
│       │   ├── route.ts                    # NEW — GET /api/videos
│       │   └── [id]/
│       │       └── route.ts                # NEW — GET + DELETE /api/videos/:id
│       └── user/
│           └── usage/
│               └── route.ts                # NEW — GET /api/user/usage
│
├── components/
│   └── video/
│       ├── video-card.tsx                  # NEW
│       ├── video-grid.tsx                  # NEW
│       ├── video-list.tsx                  # NEW
│       ├── video-library-toolbar.tsx       # NEW — search, sort, filter, view toggle
│       ├── usage-chart.tsx                 # NEW — recharts bar chart
│       └── empty-state.tsx                 # NEW
│
├── lib/
│   └── db/
│       └── queries/
│           └── videos.ts                   # EXTEND — listVideosFiltered(), deleteVideoWithStorage()
│
└── types/
    └── video.ts                            # EXTEND — VideoListParams, VideoMetadata, UsageStats

supabase/
└── migrations/
    └── 20260213000000_add_video_timeout_index.sql
```

---

## Design Decisions

### D1: Server-side Search + Filter + Paginate

Extend `videos.ts` queries with `listVideosFiltered(userId, params)`. Uses Supabase `.or('title.ilike.%q%,prompt.ilike.%q%')`, `.order()`, `.range()` with page size locked to 12. `count: 'exact'` provides total for pagination. See research.md Topic 1.

### D2: 30-Minute Timeout (Check-on-Read)

In `listVideosFiltered()`, run a targeted UPDATE before the main SELECT:

```sql
UPDATE videos
SET status = 'failed', current_stage = null, updated_at = NOW()
WHERE user_id = :userId
  AND status = 'processing'
  AND (metadata->>'renderStartedAt')::timestamptz < NOW() - INTERVAL '30 minutes'
```

Scoped to requesting user; one index makes it efficient. No cron needed. See research.md Topic 2.

### D3: Atomic Delete (Storage-First, FR-012)

New `deleteVideoWithStorage(videoId, userId)` in `videos.ts`:
1. Load `uploaded_images` for video
2. Delete all storage files (MP4, audio, thumbnail, scene images) via `deleteFile()`
3. Only if all succeed: `deleteVideo(videoId)` + `deleteUploadedImagesByVideoId(videoId)`
4. On any storage failure: throw `AppError(ERROR_CODES.STORAGE_DELETE_FAILED)` — DB row preserved

See research.md Topic 3.

### D4: Usage Chart

shadcn/ui `chart` component wrapping Recharts `<BarChart>`. `dailyCounts` from `/api/user/usage`. Client fills zero-count days before rendering. See research.md Topic 4.

### D5: localStorage View Preference (SSR-Safe)

`VideoLibraryToolbar` is a Client Component. Default: `'grid'`. `useEffect` reads localStorage on mount; write on toggle. No hydration mismatch. See research.md Topic 5.

### D6: Signed URL Delivery

`GET /api/videos` and `GET /api/videos/:id` sign video URLs server-side (1-hour expiry) via `getFileUrl()`. Thumbnails return public URLs (thumbnails bucket is public). Components receive plain HTTPS strings.

### D7: Auth Guard Pattern (FR-015)

All new dashboard pages call `auth()` from `@clerk/nextjs/server` at the top and `redirect('/sign-in')` if no session. Defense-in-depth beyond middleware.

### D8: Regenerate Navigation (FR-017)

"Regenerate" button navigates to `/create?regenerateFrom={videoId}`. Wizard reads this query param. No F007 code changes required.

### D9: New ERROR_CODE

Add `STORAGE_DELETE_FAILED` to `src/lib/errors/codes.ts`.

### D10: Recharts Dependency

Verify in `package.json`. If absent, add `recharts` as a dependency. shadcn/ui chart component requires it.

---

## Risk & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Storage paths not consistent across videos | Medium | Read from `video.storage_path` + `uploaded_images` table; never reconstruct from ID alone |
| Recharts not installed | Low | Check package.json before implementing chart; install if absent |
| Hydration mismatch on view preference | Low | useEffect pattern avoids this (research Topic 5) |
| Check-on-read adds latency | Low | Scoped to user_id + index; at most 1 stale row per user at MVP scale |
| ilike slow on large data | Low (MVP) | Acceptable at current scale; add index later if needed |

---

## Complexity Tracking

No constitution violations. No complexity justification required.
