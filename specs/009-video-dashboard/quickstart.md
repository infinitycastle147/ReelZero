# Quickstart: Video Dashboard & Library (F009)

**Branch**: `009-video-dashboard` | **Date**: 2026-02-13
**Prerequisite**: F008 merged to main. Branch `009-video-dashboard` checked out.

---

## Environment Setup

No new environment variables required for F009. Existing vars from F006/F008 are sufficient:

```bash
# Already required (verify .env.local has these)
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Database Migration

Run the single migration for the performance index:

```bash
# Apply to local Supabase (if running locally)
supabase db push

# Or apply directly
psql $DATABASE_URL -f supabase/migrations/20260213000000_add_video_timeout_index.sql
```

---

## Dev Server

```bash
npm run dev
# App at: http://localhost:3000
# Dashboard at: http://localhost:3000/dashboard
# Videos library: http://localhost:3000/videos
```

---

## Seed Test Data

To test the video library with real data, generate videos through the wizard (F007/F008) or insert directly:

```sql
-- Insert test videos for your user (replace user_id with your Supabase user UUID)
INSERT INTO videos (user_id, title, prompt, status, metadata, created_at)
VALUES
  ('YOUR_USER_UUID', 'Test Video 1', 'A prompt about the ocean', 'completed',
   '{"voice":"rachel","theme":"realistic","captionStyle":"word-by-word","transitionType":"fade"}',
   NOW() - INTERVAL '1 day'),
  ('YOUR_USER_UUID', 'Test Video 2', 'A prompt about space exploration', 'failed',
   '{"voice":"rachel","theme":"cinematic","captionStyle":"none","transitionType":"crossfade"}',
   NOW() - INTERVAL '3 days'),
  ('YOUR_USER_UUID', 'Test Processing', 'A stuck video', 'processing',
   '{"renderStartedAt":"' || (NOW() - INTERVAL '35 minutes')::text || '"}',
   NOW() - INTERVAL '35 minutes');
```

---

## Key Pages & Routes

| URL | Component | Purpose |
|---|---|---|
| `/dashboard` | `DashboardPage` | Main overview with recent videos + stats |
| `/videos` | `VideosPage` | Full library with search/filter/sort/paginate |
| `/videos/[id]` | `VideoDetailPage` | Single video detail, player, download, delete |

---

## Key New Files

```
src/app/(dashboard)/
├── dashboard/page.tsx            # REPLACE stub (FR-001, FR-013)
├── videos/
│   ├── page.tsx                  # NEW — video library (FR-002 to FR-008)
│   └── [id]/
│       └── page.tsx              # NEW — video detail (FR-009 to FR-017)

src/app/api/
├── videos/
│   ├── route.ts                  # GET /api/videos (list + search/filter)
│   └── [id]/
│       └── route.ts              # GET + DELETE /api/videos/:id
└── user/
    └── usage/route.ts            # GET /api/user/usage (stats + chart data)

src/components/video/
├── video-card.tsx                # Thumbnail, title, date, duration, actions
├── video-grid.tsx                # Grid layout wrapper
├── video-list.tsx                # List layout wrapper
├── video-library-toolbar.tsx     # Search, sort, filter, view toggle
├── empty-state.tsx               # Zero videos or zero search results
└── usage-chart.tsx               # Monthly bar chart component

src/lib/db/queries/
└── videos.ts                     # EXTEND: add listVideosFiltered(), deleteVideoWithStorage()

supabase/migrations/
└── 20260213000000_add_video_timeout_index.sql
```

---

## Pre-Commit Check

```bash
npm run pre-commit
# Runs: eslint + tsc --noEmit + next build
```

---

## Testing Checklist

- [ ] Dashboard page shows greeting, recent 3–5 videos, credit count
- [ ] Videos page shows all videos in grid view (default)
- [ ] Grid/list toggle works and persists on page refresh (localStorage)
- [ ] Search by prompt keyword filters results server-side
- [ ] Date filter "This Week" returns correct subset
- [ ] Sort "Oldest First" reverses order
- [ ] Pagination: page 2 shows correct results when search is active
- [ ] Video detail page shows player, metadata, download button
- [ ] Delete: confirmation dialog shown; video removed on confirm
- [ ] Delete: cancel does not remove video
- [ ] Delete: if storage fails, video remains in library
- [ ] Failed video shows error indicator and Regenerate button
- [ ] Processing video older than 30 min auto-transitions to failed
- [ ] Unauthenticated access to `/videos` redirects to sign-in
- [ ] Accessing `/videos/OTHER_USER_VIDEO_ID` returns not found
