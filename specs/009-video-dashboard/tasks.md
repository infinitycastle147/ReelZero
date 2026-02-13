# Tasks: Video Dashboard & Library (F009)

**Input**: Design documents from `specs/009-video-dashboard/`
**Branch**: `009-video-dashboard`
**Tests**: Not requested — no test tasks included.
**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on sibling tasks)
- **[Story]**: Which user story this task belongs to (US1–US6)
- Exact file paths in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Foundation tasks that unlock all user stories.

- [x] T001 Add `STORAGE_DELETE_FAILED` to `src/lib/errors/codes.ts` (new key in ERROR_CODES constant)
- [x] T002 [P] Add `VideoListParams` and `VideoMetadata` types to `src/types/video.ts`
- [x] T003 [P] Add `UsageStats` type to `src/types/video.ts` (`creditsRemaining`, `creditsTotal`, `creditsUsed`, `videosThisMonth`, `dailyCounts: Array<{date: string; count: number}>`)
- [x] T004 Create Supabase migration `supabase/migrations/20260213000000_add_video_timeout_index.sql` — partial index on `(metadata->>'renderStartedAt') WHERE status = 'processing'` for timeout query performance
- [x] T004a [P] Extend `src/lib/db/queries/uploaded-images.ts` — add `deleteUploadedImagesByVideoId(videoId: string): Promise<void>`: query all rows WHERE `video_id = videoId`, call `deleteUploadedImage(id)` for each; prerequisite for T006 atomic delete (C1 fix)
- [x] T004b [P] Verify recharts dependency — check `package.json`; if `recharts` is absent run `npm install recharts` and save to dependencies; required before T017 builds the chart component (C4 fix)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Query layer and API routes that ALL user stories depend on.

**⚠️ CRITICAL**: No user story UI work can begin until this phase is complete.

- [x] T005 Extend `src/lib/db/queries/videos.ts` — add `listVideosFiltered(userId, params: VideoListParams)`: run the stale-processing UPDATE before SELECT (FR-020 check-on-read timeout, D2), then query with `ilike` search, `order`, date range filter, `range` pagination (page size 12), `count: 'exact'`; return `PaginatedResult<Video> & { totalPages: number }`
- [x] T006 Extend `src/lib/db/queries/videos.ts` — add `deleteVideoWithStorage(videoId: string, userId: string)`: (1) call `listImagesByVideoId` to get scene image paths, (2) call `deleteFile()` from `src/lib/db/storage.ts` for each storage file (MP4 in `videos` bucket, audio in `audio` bucket, thumbnail in `thumbnails` bucket, each scene image in `images` bucket), (3) if ALL succeed call `deleteVideo(videoId)` then `deleteUploadedImagesByVideoId(videoId)` (from T004a), (4) if ANY storage deletion throws re-throw `AppError(ERROR_CODES.STORAGE_DELETE_FAILED)` — DB row preserved (D3); depends on T001 and T004a
- [x] T007 Extend `src/lib/db/queries/usage.ts` — add `getMonthlyUsageStats(userId: string, billingCycleStart: string): Promise<UsageStats>`: query `subscriptions` for credit balance; query `usage_tracking` for `action = 'video_generated'` since `billingCycleStart`; group by date for `dailyCounts`; return `UsageStats` shape
- [x] T008 Create `src/app/api/videos/route.ts` — `GET /api/videos`: auth via `auth()`, resolve Clerk→DB user, parse and validate query params (`page`, `pageSize` max 12, `search`, `sort`, `dateFilter`), call `listVideosFiltered`, return `{ data: { items, total, page, pageSize, totalPages } }`; ownership enforced via `userId` scoping in query
- [x] T009 Create `src/app/api/videos/[id]/route.ts` — `GET /api/videos/:id`: auth, resolve user, call `getVideoById`, verify `video.user_id === dbUser.id` (return 404 on mismatch — FR-014), sign `video_url` via `getFileUrl('videos', ...)`, return full video with signed URL; `DELETE /api/videos/:id`: auth, ownership check, call `deleteVideoWithStorage`, return `{ data: { deleted: true } }` or `STORAGE_DELETE_FAILED` error

**Checkpoint**: API layer is complete. All endpoints are testable via curl/Postman before any UI is built.

---

## Phase 3: User Story 1 — Browse Video Library (Priority: P1) 🎯 MVP

**Goal**: Authenticated users can see all their videos in a paginated grid/list with metadata.

**Independent Test**: Sign in, navigate to `/videos`. Verify: grid of video cards with thumbnail, title, date, duration; empty state when no videos; pagination controls when >12 videos exist; grid/list toggle persists in localStorage on refresh.

### Implementation for User Story 1

- [x] T010 [P] [US1] Create `src/components/video/video-card.tsx` — displays thumbnail (with placeholder fallback), title (or prompt excerpt), creation date formatted, duration, video status badge (processing/failed); action menu with "View", "Delete" entries; for `status='failed'` videos additionally show a "Regenerate" action menu item that navigates to `/create?regenerateFrom={videoId}` (FR-016, C2 fix); links card to `/videos/[id]`; uses `VideoCardProps` typed from `Video` schema
- [x] T011 [P] [US1] Create `src/components/video/video-grid.tsx` — grid layout `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` rendering array of `VideoCard`; accepts `videos: Video[]`
- [x] T012 [P] [US1] Create `src/components/video/video-list.tsx` — single-column list layout rendering `VideoCard` in horizontal/list mode; accepts `videos: Video[]`
- [x] T013 [P] [US1] Create `src/components/video/empty-state.tsx` — two variants: (a) no videos at all ("Create your first video" CTA → `/create`), (b) no search results ("No videos match your search", clear-search button); accepts `variant: 'no-videos' | 'no-results'` and optional `onClear` callback
- [x] T014 [US1] Create `src/components/video/video-library-toolbar.tsx` — Client Component; search input (debounced 500ms, updates URL search params), sort dropdown ("Newest First"/"Oldest First"), date filter dropdown (Today/This Week/This Month/All Time), grid/list toggle button; view preference read from `localStorage` on mount via `useEffect` (SSR-safe default `'grid'`), written on toggle (D5); emits `onParamsChange(params: VideoListParams)` callback
- [x] T015 [US1] Create `src/app/(dashboard)/videos/page.tsx` — Server Component; `auth()` guard + `redirect('/sign-in')` (FR-015); fetches initial video list via `listVideosFiltered` server-side; renders `VideoLibraryToolbar` + `VideoGrid`/`VideoList` based on view preference with Suspense + loading skeleton; passes URL search params to toolbar as initial state; renders pagination controls (prev/next page links) when `totalPages > 1`
- [x] T016 [US1] Create loading skeleton component inline in videos page — renders 12 skeleton `VideoCard` placeholders (shadcn/ui `Skeleton` component) while data fetches; appears ≤200ms per SC-008

**Checkpoint**: US1 fully functional — `/videos` shows library with grid/list toggle, pagination, empty state.

---

## Phase 4: User Story 2 — Main Dashboard Overview (Priority: P2)

**Goal**: Authenticated users land on `/dashboard` and see a welcome greeting, recent videos, and usage stats.

**Independent Test**: Sign in → navigate to `/dashboard`. Verify: greeting with user's first name, "Create Video" button routes to `/create`, last 3–5 video thumbnails shown, credit count visible, videos-this-month count visible.

### Implementation for User Story 2

- [x] T017 [P] [US2] Create `src/components/video/usage-chart.tsx` — Client Component; renders Recharts `<BarChart>` with `dailyCounts` data; fills zero-count days for current calendar month client-side before passing to chart; uses shadcn/ui `ChartContainer` + `ChartTooltip` wrappers; labeled "Videos created this month"; depends on T004b (recharts installed)
- [x] T018 [US2] Replace stub `src/app/(dashboard)/dashboard/page.tsx` — Server Component; `auth()` guard + `redirect('/sign-in')` (FR-015); resolves DB user; fetches in parallel: (a) last 5 videos via `listVideosFiltered(userId, { page: 1, pageSize: 5 })`, (b) credit balance + usage stats via `getMonthlyUsageStats`; renders all four sections: `WelcomeCard` (greeting with user name + "Create Video" CTA linking to `/create`), `RecentVideos` (last 3–5 `VideoCard` components), `StatsCard` (credits remaining from `UsageStats.creditsRemaining`, credits total, videos this month from `UsageStats.videosThisMonth`), `UsageChart` (receiving `dailyCounts`); this task delivers FR-001 and FR-013 in full — T028 validates it (C5 fix)
- [x] T019 [US2] Add `GET /api/user/usage` route — create `src/app/api/user/usage/route.ts`: auth, resolve user, fetch subscription via `getSubscriptionByClerkUserId`, call `getMonthlyUsageStats`, return `UsageStats` shape; used by client components that need live credit refresh

**Checkpoint**: US2 complete — `/dashboard` shows full overview with real data.

---

## Phase 5: User Story 3 — Search & Filter Videos (Priority: P3)

**Goal**: Users can search by keyword and filter by date to find specific videos in a large library.

**Independent Test**: With 10+ videos having varied titles/prompts, type a keyword — only matching videos appear within 1s. Apply "This Week" date filter — results narrow. Clear search — full library restores. "Oldest First" reverses order.

### Implementation for User Story 3

- [x] T020 [US3] Update `src/app/(dashboard)/videos/page.tsx` — wire search params from URL to `listVideosFiltered` server-side call so that `?search=ocean&dateFilter=this_week&sort=oldest&page=2` returns correct paginated results; ensure page resets to 1 when search/filter params change; update `VideoLibraryToolbar` to sync its state with URL params via `useRouter` + `useSearchParams` (Next.js App Router pattern)

> **Note**: T020 extends T015. The toolbar already emits param changes (T014); this task connects those changes to URL updates so the server re-fetches with correct filters, preserving shareable/bookmarkable filter state.

**Checkpoint**: US3 complete — search, sort, and date filter all work with correct paginated server-side results.

---

## Phase 6: User Story 4 — View & Download a Video (Priority: P4)

**Goal**: Users click a video to open its detail page, watch a preview, see metadata, and download the MP4.

**Independent Test**: Navigate to `/videos/[id]` for a completed video. Verify: Remotion player loads and plays, all metadata fields visible, "Download" triggers MP4 download in one click.

### Implementation for User Story 4

- [x] T021 [P] [US4] Create `src/app/(dashboard)/videos/[id]/page.tsx` — Server Component; `auth()` + `redirect` guard; fetch video via `getVideoById`, verify ownership (return `notFound()` on mismatch — FR-014); if `status='processing'` show progress UI; if `status='failed'` show error state + Regenerate button; if `status='completed'` render video player + metadata + Download + Delete + Regenerate buttons
- [x] T022 [P] [US4] Create `src/components/video/video-detail-metadata.tsx` — displays: title, original prompt, voice, visual theme, caption style, transition type, duration, file size, creation date; reads from `Video` + `VideoMetadata` types; no interactivity needed (display only)
- [x] T023 [US4] Wire Remotion Player in video detail page — reuse `VideoPlayer` component from F008 (`src/components/video/video-player.tsx`) for playback; pass signed `video_url` from API response; video_url is signed server-side in `GET /api/videos/:id` (T009)
- [x] T024 [US4] Implement Download button in video detail page — `<a href={signedVideoUrl} download>Download MP4</a>`; signed URL already fetched server-side; no JS needed for download (FR-010)

**Checkpoint**: US4 complete — detail page renders player, metadata, and download for completed videos.

---

## Phase 7: User Story 5 — Delete a Video (Priority: P5)

**Goal**: Users can delete a video from the library card or detail page, with confirmation dialog, and atomic storage+DB cleanup.

**Independent Test**: Click "Delete" on a video card → confirmation dialog appears → click "Cancel" → video remains. Click "Delete" again → confirm → video disappears from library. Direct URL to deleted video returns "not found".

### Implementation for User Story 5

- [x] T025 [P] [US5] Create `src/components/video/delete-video-dialog.tsx` — Client Component wrapping shadcn/ui `AlertDialog`; accepts `videoId: string`, `onDeleted: () => void`; calls `DELETE /api/videos/:id` using the standardized fetch wrapper from `src/lib/api/client.ts` (Constitution Principle II — no raw `fetch()` in components); shows loading state during request; on success calls `onDeleted()`; on `STORAGE_DELETE_FAILED` error shows retryable error message ("Failed to delete video files. Please try again.") without closing dialog (U1 fix)
- [x] T026 [US5] Wire delete from `VideoCard` (T010) — add "Delete" action in card menu that opens `DeleteVideoDialog`; on `onDeleted` callback remove video from local state (optimistic UI) and refresh list
- [x] T027 [US5] Wire delete from video detail page (T021) — add "Delete" button that opens `DeleteVideoDialog`; on `onDeleted` callback navigate to `/videos`

**Checkpoint**: US5 complete — delete works from both entry points with confirmation and error handling.

---

## Phase 8: User Story 6 — View Usage Statistics (Priority: P6)

**Goal**: Users can see accurate credits remaining, videos created this month, and a monthly usage chart.

**Independent Test**: Verify dashboard stats match database values for a known test user. After generating a video (in another tab), refresh dashboard — credits and video count update.

### Implementation for User Story 6

- [x] T028 [US6] Validate `src/app/(dashboard)/dashboard/page.tsx` (T018) delivers FR-013 in full — verify: (1) `StatsCard` shows `creditsRemaining`, `creditsTotal`, and `videosThisMonth` from `UsageStats`; (2) `UsageChart` receives `dailyCounts` array; (3) all four dashboard sections render without errors; fix any integration issues between T017, T018, and T007 data shapes (C5 fix — validation-only task, not a re-implementation)

**Checkpoint**: US6 complete — full usage stats visible with bar chart.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Error states, edge cases, sidebar navigation, and pre-commit validation.

- [x] T030 [P] Add "Videos" link to `src/components/layout/dashboard-sidebar.tsx` — add `/videos` route with appropriate icon (e.g., `Film` from lucide-react); mark active when current path starts with `/videos`
- [x] T030a Verify Regenerate pre-population — check `src/app/(dashboard)/create/page.tsx` and `src/store/video-store.ts` to confirm the wizard reads a `regenerateFrom` query param and pre-fills prompt + settings from the referenced video; if not implemented, add the query-param read in the create page and a `prefillFromVideo(videoId)` action to the Zustand store that fetches `GET /api/videos/:id` and hydrates wizard state (C6 fix)
- [x] T031 [P] Handle zero-credit CTA — in `src/app/(dashboard)/dashboard/page.tsx`, if `creditsRemaining === 0`, render "Create Video" button as a link to `/billing` instead of `/create`; add tooltip "Upgrade to generate more videos"
- [x] T032 [P] Add processing video polling in video detail page (`src/app/(dashboard)/videos/[id]/page.tsx`) — for `status='processing'` videos, add a Client Component wrapper that polls `GET /api/video/render/status` every 5 seconds and refreshes the page when status transitions to `completed` or `failed` (reuses F008 polling hook `src/hooks/use-render-polling.ts`)
- [x] T033 [P] Add `notFound()` boundary — ensure `src/app/(dashboard)/videos/[id]/page.tsx` calls Next.js `notFound()` for both "video not found" and "not owned by user" cases, producing a clean 404 page rather than an error boundary
- [x] T034 Run `npm run pre-commit` and fix any lint/type errors introduced by F009 changes (ESLint, TypeScript strict, Next.js build)
- [x] T035 Validate quickstart.md checklist — manually run through every item in `specs/009-video-dashboard/quickstart.md` testing checklist and confirm all scenarios pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately; T001–T004 are all parallelizable
- **Phase 2 (Foundational)**: Depends on Phase 1 (T001 needed for T006 error code; T002/T003 needed for T005/T007 types; T004 migration for DB) — BLOCKS all user story phases
- **Phase 3 (US1)**: Depends on Phase 2 (T008 API, T005 query); T010–T013 parallelizable; T014 depends on T010–T013 shape; T015 depends on T014
- **Phase 4 (US2)**: Depends on Phase 2 (T009, T007); T017 parallelizable with T018 start; T019 parallelizable
- **Phase 5 (US3)**: Depends on Phase 3 (T015 page exists); T020 extends T015
- **Phase 6 (US4)**: Depends on Phase 2 (T009 GET endpoint); T021–T022 parallelizable; T023 depends on T021; T024 depends on T021
- **Phase 7 (US5)**: Depends on Phase 2 (T009 DELETE endpoint); T025 parallelizable; T026 depends on T010 + T025; T027 depends on T021 + T025
- **Phase 8 (US6)**: Depends on Phase 4 (T018 dashboard); T029 can run anytime
- **Phase 9 (Polish)**: Depends on all story phases being complete

### User Story Dependencies

- **US1 (P1)**: After Phase 2 — no inter-story dependencies
- **US2 (P2)**: After Phase 2 — no inter-story dependencies (parallel with US1)
- **US3 (P3)**: After US1 (extends the videos page)
- **US4 (P4)**: After Phase 2 — no inter-story dependencies (parallel with US1/US2)
- **US5 (P5)**: After Phase 2 + US4 (delete dialog used on detail page)
- **US6 (P6)**: After US2 (extends dashboard page)

### Parallel Opportunities

**Phase 1**: T001, T002, T003, T004, T004a, T004b all run in parallel.

**Phase 2**: T005 and T006 can overlap after T001–T004a; T006 explicitly depends on T004a (deleteUploadedImagesByVideoId); T007 parallel with T005/T006; T008 after T005; T009 after T005+T006.

**Phase 3 (US1)**: T010, T011, T012, T013 all run in parallel; T014 after all four; T015+T016 after T014.

**Phase 4+5 (US2+US3)**: T017+T019 parallel; T018 after T017; T020 after T015+T018.

**Phase 6 (US4)**: T021 and T022 parallel; T023+T024 after T021.

**Phase 7 (US5)**: T025 parallel with Phase 6; T026 after T010+T025; T027 after T021+T025.

---

## Parallel Example: Phase 3 (US1)

```text
# Run these 4 tasks simultaneously:
T010: Create video-card.tsx
T011: Create video-grid.tsx
T012: Create video-list.tsx
T013: Create empty-state.tsx

# Then:
T014: Create video-library-toolbar.tsx  (depends on T010-T013 shape)

# Then:
T015: Create videos/page.tsx  (depends on T014)
T016: Loading skeleton  (in T015)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T009) — CRITICAL
3. Complete Phase 3: US1 — Browse Video Library (T010–T016)
4. **STOP and VALIDATE**: `/videos` shows paginated library with grid/list toggle
5. Ship US1 — users can see their video library

### Incremental Delivery

1. Setup + Foundational → API layer live
2. US1 → Video library browsable (MVP)
3. US2 → Dashboard home page complete
4. US4 → Video preview + download
5. US5 → Delete with confirmation
6. US3 → Search + filter (depends on US1 page)
7. US6 → Usage chart on dashboard
8. Polish → Sidebar nav, zero-credit CTA, processing polling

### Parallel Team Strategy

After Phase 2:
- Developer A: US1 (T010–T016)
- Developer B: US2 + US6 (T017–T019, T028–T029)
- Developer C: US4 + US5 (T021–T027)
- US3 (T020) follows US1; Polish (T030–T035) follows all

---

## Notes

- All tasks without [P] must run sequentially per their dependency chain
- `[P]` tasks touch different files with no shared state — safe to parallelize
- Each story phase ends with a checkpoint — validate independently before proceeding
- Run `npm run pre-commit` after each logical group (lint + type-check + build)
- Recharts: check `package.json` before T017 — install if absent (T029)
- Storage paths for delete (T006): read from `video.storage_path` and `uploaded_images` table — never reconstruct from video ID alone (D3 risk mitigation)
- Timeout check (T005): the stale-processing UPDATE is scoped to `user_id` so it never causes full-table scans
