# Research: Video Generation Wizard

**Feature**: `007-video-wizard` | **Date**: 2026-02-12
**Phase**: 0 (Pre-implementation research)

---

## Decision 1: Drag-and-Drop Library for Scene Reordering

**Decision**: `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`

**Rationale**:
- Full React 19 compatibility (the project runs `react: 19.2.3`)
- Built-in keyboard and pointer sensor support (WCAG 2.1 accessible)
- Named exports only — compatible with Constitution Principle III (no barrel files)
- ~25KB gzipped total — smallest of the three candidates
- Actively maintained (2026); `react-beautiful-dnd` is archived since 2023
- Clean client-boundary pattern: `DndContext` + `SortableContext` inside a `'use client'` wrapper; server components pass data as props

**Alternatives considered**:
- `react-beautiful-dnd` — rejected: archived/unmaintained, known React 18+ issues
- HTML5 native drag-drop — rejected: no built-in keyboard accessibility, poor screen-reader experience

**Implementation pattern**:
```
DndContext (PointerSensor + KeyboardSensor)
  └── SortableContext (verticalListSortingStrategy)
        └── SortableSceneCard (useSortable hook, drag handle via GripVertical icon)
```
`arrayMove` from `@dnd-kit/sortable` handles index swapping; `reorderScenes(activeId, overId)` in Zustand re-indexes `.order`.

---

## Decision 2: Wizard State Persistence

**Decision**: `zustand/middleware` `persist` with `sessionStorage`

**Rationale**:
- `sessionStorage` survives page refreshes (satisfies FR-023/SC-004) but is cleared when the browser tab closes (satisfies the "no stale draft from yesterday" UX goal)
- Cross-tab isolation: each wizard tab has its own independent draft — prevents accidental state sharing
- `partialize` option excludes runtime-only fields: `isGenerating`, `generationProgress`, `onGenerationComplete`
- Persisted fields: `currentStep`, `prompt`, `videoId`, `selectedVoice`, `selectedTheme`, `captionStyle`, `transitionType`, `scenes`

**SSR hydration approach** (critical for Next.js App Router):
```typescript
// Storage factory — returns undefined during SSR
const getSessionStorage = (): PersistStorage<PersistedWizardState> | undefined => {
  if (typeof window === 'undefined') return undefined;
  return window.sessionStorage;
};

// Consumer guards against pre-hydration render with:
const isHydrated = useVideoStore(state => state._hasHydrated);
// render loading skeleton until isHydrated === true
```

**Storage key**: `reelzero-video-wizard-draft`

**On successful submission**: call `useVideoStore.getState().reset()` — clears `sessionStorage` entry and resets all state to `INITIAL_STATE`.

**Alternatives considered**:
- `localStorage` — rejected: persists after browser close, leading to confusing "stale draft" UX; also shared across tabs
- Server-side draft table — rejected: out of scope per spec Assumptions; adds DB complexity for MVP

---

## Decision 3: File Upload Implementation

**Decision**: Native HTML5 drag-and-drop + `<input type="file">` — **no new library**

**Rationale**:
- The project already has `sharp`, `@supabase/supabase-js`, and `src/lib/ai/image-upload.ts` for server-side processing
- `MAX_UPLOAD_SIZE_BYTES` (10MB) and `ALLOWED_UPLOAD_MIME_TYPES` constants already exist in `src/lib/constants/ai.ts`
- For 3–5 single-file uploads, a 11KB library (react-dropzone) is unnecessary overhead
- Native approach is consistent with the existing `shadcn/ui` `Input` component already in `src/components/ui/input.tsx`
- Server already re-validates — client validation is pure UX (fail-fast)

**Client-side validation sequence** (before any network call):
1. `file.size > MAX_UPLOAD_SIZE_BYTES` → reject with size error
2. `ALLOWED_UPLOAD_MIME_TYPES.includes(file.type)` → reject with type error
3. Extension check (`.png`, `.jpg`, `.jpeg`, `.webp`) → defense-in-depth

**Upload flow**: `File` object → `FormData.append('file', file)` → `POST /api/upload/image` (existing route) → server validates + resizes → returns `{ data: { storageUrl, storagePath } }`

**CRITICAL**: Do NOT set `Content-Type` header manually — browser sets multipart boundary automatically.

**Alternatives considered**:
- `react-dropzone` — rejected: unnecessary dependency for single-file use case; native provides same UX
- `@uploadthing/react` — rejected: managed infrastructure overkill for MVP; adds hosting dependency

---

## Decision 4: Video Record Creation Timing

**Decision**: Create `videos` DB record on **Step 1 submit** (before script generation)

**Rationale** (confirmed by codebase analysis):
- `generateScript()` in `src/lib/ai/script-generation.ts` creates a `generation_logs` row with `video_id` FK (line 105) — the video record **must** exist before this
- `POST /api/video/generate`, `POST /api/video/images`, `POST /api/video/audio` all require `videoId` in the request body
- `generateSceneImages()` creates generation logs with `video_id` FK — same constraint
- `videos` table already has `status: "processing"` as the default insert value — designed for early creation

**Implementation**: Add `POST /api/video` route that: (a) validates user auth, (b) calls `createVideo({ user_id, title: prompt.substring(0, 100), prompt, status: 'processing' })`, (c) returns `{ data: { videoId } }`. The wizard stores this in Zustand + sessionStorage.

**Incomplete wizard handling**: Videos created by users who abandon mid-wizard remain as `status: "processing"`. F009 dashboard filters to `status: "completed"` only — orphans are invisible to users. A background cleanup job (future feature) can remove stale `processing` records older than 24h.

**Alternatives considered**:
- Client-generated UUID + lazy DB creation — rejected: orphaned storage files, generation_logs FK violations, TOCTOU risk
- Eager creation on page load — rejected: creates empty records with no prompt data, doubles write count, confuses analytics

---

## Decision 5: Parallel vs Sequential Image Generation (Wizard Layer)

**IMPORTANT FINDING**: `generateSceneImages()` in `src/lib/ai/scene-image-generation.ts` runs sequentially (for loop, line 83). To achieve parallel generation specified in clarification Q4, the wizard must call a **single-scene endpoint** for each scene independently from the client, not the batch endpoint.

**Decision**: Add `POST /api/video/images/[sceneNumber]` single-scene route (or reuse `POST /api/video/images` with a single-scene payload). The wizard's `useVideoGeneration.ts` hook calls `Promise.allSettled()` across N per-scene fetch calls simultaneously.

**Each scene independently**:
- Gets its own loading state: `scene.imageStatus: 'idle' | 'loading' | 'success' | 'error'`
- Updates Zustand via `setSceneImageStatus(id, status)` and `updateScene(id, { imageUrl, imageStatus })` on resolution
- Failure of one scene does NOT cancel others (`Promise.allSettled` not `Promise.all`)

**Alternative**: Keep sequential batch route + add progress events (SSE) — rejected: more complex, adds streaming infrastructure; parallel client fan-out is simpler and matches Vercel's serverless model (5 × short requests beats 1 × long sequential request)

---

## Existing Constants Confirmed (No New Constants Needed)

All validation constants already exist in `src/lib/constants/ai.ts`:
- `PROMPT_MIN_LENGTH = 50`
- `PROMPT_MAX_LENGTH = 500`
- `MAX_UPLOAD_SIZE_BYTES = 10_485_760` (10MB)
- `ALLOWED_UPLOAD_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']`
- `TARGET_IMAGE_WIDTH = 1080`, `TARGET_IMAGE_HEIGHT = 1920`

And in `src/lib/constants/video.ts`:
- `MIN_SCENES = 3`, `MAX_SCENES = 5`

And in `src/lib/constants/voices.ts`:
- `VOICE_OPTIONS` — 5 voices (Adam, Bella, Charlie, Diana, Echo), `id` / `name` / `tier`

All wizard UI can reference these directly.

---

## Existing shadcn/ui Components Available

Already installed (no new installs needed):
- `Button`, `Input`, `Textarea`, `Label`, `Select`, `Card`, `Badge`, `Progress`, `Skeleton`

Need to install via shadcn CLI:
- `Tabs` (for AI/Upload toggle in Step 3)
- `Separator` (for step dividers)
- `Tooltip` (for drag handle hover label)
