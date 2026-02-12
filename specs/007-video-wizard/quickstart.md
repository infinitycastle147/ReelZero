# Quickstart: Video Generation Wizard (F007)

**Branch**: `007-video-wizard` | **Date**: 2026-02-12

## Prerequisites

- F001–F006 implemented and passing `npm run pre-commit`
- Supabase project running with all tables and storage buckets from F003/F004
- Clerk configured with Google OAuth (F003)
- Stripe webhooks active (F006)
- ElevenLabs + Gemini API keys set in `.env.local`

## New Dependencies to Install

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

No other new runtime dependencies. Native HTML5 handles file upload.

## shadcn/ui Components to Add

```bash
npx shadcn add tabs separator tooltip
```

These are needed for the AI/Upload toggle (Tabs), step dividers (Separator), and drag handle labels (Tooltip).

## Environment Variables

One new environment variable is required for `POST /api/video/render` (T010):

| Variable | Description | Example |
|----------|-------------|---------|
| `RENDERER_SERVICE_URL` | Base URL of the ReelZero-Renderer service (Render.com) | `https://reelzero-renderer.onrender.com` |

Add to `.env.local`:

```bash
RENDERER_SERVICE_URL=https://reelzero-renderer.onrender.com
```

All other AI/storage/auth keys were added in F004/F005/F006 and do not need changes.

## Running the Wizard Locally

```bash
npm run dev
```

Navigate to: `http://localhost:3000/create`

You must be signed in. The create page is protected by Clerk middleware (`(dashboard)` route group).

## Quick Smoke Test (Manual)

### Test 1: Happy Path

1. Sign in, navigate to `/create`
2. **Step 1**: Enter a prompt (e.g., "5 reasons to learn TypeScript in 2026"), select any voice, theme, and caption style → click Next
3. Verify a video record is created (check Supabase dashboard → `videos` table, `status: processing`)
4. Verify script generation succeeds → 3–5 scene cards appear in Step 2
5. **Step 2**: Edit one narration field → drag a scene to reorder → click Next
6. Verify scene order changed and edits are preserved
7. **Step 3**: Click "Generate All Images" → all scene cards show loading skeletons simultaneously → images appear
8. Upload one custom image for any scene → verify preview appears
9. Click Next
10. **Step 4**: Change transition to "Crossfade" → verify summary shows correct data → credit count shown → click "Generate Video"
11. Verify redirect to progress/dashboard page
12. Verify `videos` table record has `metadata` populated with wizard choices

### Test 2: Credit Gate

1. Set test user's `credits_remaining = 0` in Supabase (`subscriptions` table)
2. Navigate to `/create`, complete Steps 1–3
3. Verify Step 4 "Generate Video" button is **disabled**
4. Verify billing upgrade link is visible

### Test 3: Back Navigation

1. Complete Step 1 and 2, navigate to Step 3
2. Click "Back" → verify Step 2 shows same scenes (not reset)
3. Click "Back" → verify Step 1 shows same prompt/voice/theme

### Test 4: Resume After Refresh

1. Complete Step 1 and 2 (get to Step 3)
2. Refresh the browser (Cmd+R)
3. Verify wizard reopens at Step 3 with all scenes intact

### Test 5: Start Over

1. Partially complete wizard (get to Step 3)
2. Click "Start Over"
3. Verify wizard resets to Step 1 with blank prompt and no saved state

## Key Files Created/Modified

| File | Status |
|------|--------|
| `src/store/video-store.ts` | Modified — `persist` middleware + `reorderScenes` + `setSceneImageStatus` + `videoId` + `_hasHydrated` |
| `src/types/scene.ts` | Modified — add `imageStatus: ImageStatus` field |
| `src/app/(dashboard)/create/page.tsx` | Modified — replace stub with `<VideoWizard />` |
| `src/app/api/video/route.ts` | NEW — `POST /api/video` creates video record |
| `src/app/api/video/render/route.ts` | NEW — `POST /api/video/render` dispatches to renderer |
| `src/app/api/video/images/route.ts` | Patched — remove `userId` from request body |
| `src/app/api/video/generate/route.ts` | Patched — add prompt length validation |
| `src/components/video/video-wizard.tsx` | NEW |
| `src/components/video/wizard-step-indicator.tsx` | NEW |
| `src/components/video/steps/step-1-input.tsx` | NEW |
| `src/components/video/steps/step-2-script.tsx` | NEW |
| `src/components/video/steps/step-3-images.tsx` | NEW |
| `src/components/video/steps/step-4-settings.tsx` | NEW |
| `src/components/video/scene-card.tsx` | NEW |
| `src/components/video/scene-list-sortable.tsx` | NEW |
| `src/components/video/image-selector.tsx` | NEW |
| `src/components/video/image-dropzone.tsx` | NEW |
| `src/hooks/useVideoGeneration.ts` | NEW |

## Pre-Commit Verification

```bash
npm run pre-commit
# Runs: npm run lint && npm run type-check && npm run build
```

All three must pass before opening a PR.

## Common Issues

**"sessionStorage is not defined" error during build**: Check that `getSessionStorage()` returns `undefined` when `typeof window === 'undefined'`. The `persist` storage option must handle SSR gracefully.

**DndContext hydration warning**: Ensure `SceneListSortable` has `'use client'` directive and is not imported in a Server Component directly.

**TypeScript error on `imageStatus`**: Run `npm run type-check` after modifying `Scene` type. All existing `addScene` calls in `video-store.ts` must include `imageStatus: 'idle'`.

**Signed URL expiry in sessionStorage**: Image URLs stored in `sessionStorage` expire after 1 hour (Supabase signed URL TTL). If user resumes a wizard draft older than 1 hour, their stored `imageUrl` values will be expired. For MVP, this is accepted — user re-generates images. A future improvement would refresh URLs on rehydration.
