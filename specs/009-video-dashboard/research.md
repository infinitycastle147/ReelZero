# Research: Video Dashboard & Library (F009)

**Date**: 2026-02-13
**Branch**: `009-video-dashboard`

---

## Topic 1: Server-side Search + Filter + Sort + Paginate with Supabase

**Decision**: Use Supabase `.ilike()` for case-insensitive substring search on `title` and `prompt` columns, combined with `.range()` for offset-based pagination, `.order()` for sort, and an `or()` for the two-column search. The existing `listVideosByUser` query in `src/lib/db/queries/videos.ts` is extended to accept `VideoListParams` and build the query dynamically.

**Rationale**: The existing query layer already uses this pattern (see `listVideosByUser`). Supabase `.ilike('column', '%term%')` maps directly to PostgreSQL `ILIKE`. Combining `or('title.ilike.%term%,prompt.ilike.%term%')` handles the two-column case. Server-side `count: 'exact'` returns total for pagination metadata. This approach requires no additional infrastructure.

**Alternatives considered**:
- Full-text search (Supabase `ts_vector`): More powerful but overkill for MVP with <1000 videos per user; no extra index needed for ilike at this scale.
- Client-side filtering: Rejected (clarification Q1) — breaks pagination correctness.

**Implementation note**: Add a partial index on `title` and `prompt` if search becomes slow at scale. For MVP, ilike on these short text columns is fast enough.

---

## Topic 2: 30-Minute Processing Timeout (FR-020)

**Decision**: Check-on-read pattern — the `listVideosFiltered()` query function checks for stale processing videos as a side effect before returning results. Any video with `status='processing'` and `metadata->>'renderStartedAt' < NOW() - INTERVAL '30 minutes'` is immediately updated to `status='failed'` before the result set is returned.

**Rationale**:
- No additional infrastructure (no Vercel Cron job, no separate cron service)
- Free tier compatible — Vercel Cron requires Pro plan
- Timeout is resolved the next time the user opens the Videos page (acceptable UX: they see failed state rather than perpetual spinner)
- The `renderStartedAt` timestamp is already written to `metadata` in the F008 render route (`POST /api/video/render`)
- One index on `(metadata->>'renderStartedAt') WHERE status='processing'` makes this check efficient

**Alternatives considered**:
- Vercel Cron: Requires Vercel Pro plan; adds deployment complexity; overkill for MVP.
- Renderer webhook on failure: Already implemented in F008 (`/api/video/render/complete`). Check-on-read handles the cases where the webhook never fires (network failure, renderer crash).
- Supabase pg_cron: Requires enabling the extension; adds DB-level complexity.

**Implementation**: In `listVideosFiltered()`, run a `UPDATE videos SET status='failed', current_stage=null WHERE status='processing' AND metadata->>'renderStartedAt' < NOW() - INTERVAL '30 minutes' AND user_id = :userId` before the main SELECT. This is scoped to the requesting user to avoid full-table scans.

---

## Topic 3: Atomic Delete Pattern (FR-012)

**Decision**: Storage-first atomic delete — attempt all storage file deletions first; only delete the DB row if all storage deletions succeed. If any storage deletion throws, the DB row is preserved and a retryable error is returned to the user.

**Rationale**:
- Supabase does not support cross-service transactions (storage + DB in one atomic operation)
- Storage-first is safer: a leaked DB row (orphan) is invisible to the user but recoverable; a leaked storage file with no DB row is also recoverable via admin cleanup
- From the user's perspective: if storage fails and we still delete the DB row, the video disappears from the UI but files remain — worse UX than showing a retryable error
- Clarification Q5 confirmed: atomic rollback on storage failure

**Implementation**:
1. Fetch `uploaded_images` rows for `video_id` to collect scene image paths
2. Call `deleteFile()` from `src/lib/db/storage.ts` for each file (videos, audio, thumbnails, images)
3. Collect results; if any throw → re-throw with `STORAGE_DELETE_FAILED` error
4. Only if all succeed: `deleteVideo(id)` + `deleteUploadedImagesByVideoId(videoId)`

**Alternatives considered**:
- DB-first delete: Risks orphaned storage files on failure, which waste storage quota. Harder to audit.
- Best-effort (delete DB always, log storage failures): Rejected by clarification Q5.
- Two-phase commit pattern: No platform support; overly complex for this use case.

---

## Topic 4: Chart Component for Monthly Usage

**Decision**: Use **Recharts** (`recharts` package) via the shadcn/ui chart component (`src/components/ui/chart.tsx`). Recharts is the chart library already adopted by shadcn/ui's chart component registry and is the de facto standard for shadcn projects.

**Rationale**:
- shadcn/ui's chart primitive wraps recharts and provides Tailwind-compatible theming via CSS variables; this aligns with the existing design system (F002)
- Recharts is React 18 compatible and tree-shakeable
- Bar chart for daily video counts is a built-in recharts component (`<BarChart>`)
- No additional package needed if `recharts` is already installed (check `package.json`); if not, add it

**Alternatives considered**:
- Tremor: Heavier bundle, requires additional setup; not integrated with shadcn/ui primitives
- Chart.js / react-chartjs-2: Larger bundle; imperative API less idiomatic in React 18
- Lightweight custom SVG: More work, less accessible; recharts handles accessibility attributes

**Implementation**: Use shadcn/ui `chart` component with `<BarChart>` from recharts. `dailyCounts` from `GET /api/user/usage` provides the data array. Fill gaps in the month with zero counts client-side before rendering.

---

## Topic 5: localStorage for View Preference (SSR Safe)

**Decision**: Read view preference from `localStorage` in a `useEffect` hook (client-only) with an initial SSR-safe default of `'grid'`. This avoids hydration mismatch since the server always renders grid view and the client upgrades to the stored preference after mount.

**Rationale**:
- Next.js App Router server components cannot access `localStorage`; reading it in `useEffect` is the canonical pattern
- The initial flash (grid → list) is imperceptible in practice because the layout shift happens before first paint completes
- No cookie-based approach needed since the preference is non-critical and cross-device sync was explicitly rejected (clarification Q3)

**Implementation**:
```ts
// In VideoLibraryToolbar (client component)
const [view, setView] = useState<'grid' | 'list'>('grid'); // SSR default
useEffect(() => {
  const stored = localStorage.getItem('videoLibraryView');
  if (stored === 'grid' || stored === 'list') setView(stored);
}, []);
const handleViewToggle = (v: 'grid' | 'list') => {
  setView(v);
  localStorage.setItem('videoLibraryView', v);
};
```

**Alternatives considered**:
- `next/headers` cookies: Would require a server action to persist; more complex; cross-device sync (explicitly out of scope)
- `useSyncExternalStore` with localStorage: More complex; same result
- Zustand persist middleware: Overkill for a single string preference; adds bundle weight
