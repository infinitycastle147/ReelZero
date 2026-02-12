# Tasks: Video Generation Wizard (F007)

**Input**: Design documents from `/specs/007-video-wizard/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/wizard-api.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- No tests requested — test tasks omitted per template rule

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install new dependencies and add shadcn/ui components needed across multiple stories

- [X] T001 Install dnd-kit packages: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- [X] T002 Add shadcn/ui components: `npx shadcn add tabs separator tooltip`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type extensions, store changes, route patches, and new API routes that ALL wizard user stories depend on. No wizard UI work can begin until this phase is complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Extend `Scene` type in `src/types/scene.ts` — add `ImageStatus = 'idle' | 'loading' | 'success' | 'error'` type alias and `imageStatus: ImageStatus` field to `Scene`
- [X] T004 [P] Extend `src/store/video-store.ts` — add `zustand/middleware` `persist` with `sessionStorage`, `partialize` (exclude `isGenerating`, `generationProgress`, `onGenerationComplete`), `onRehydrateStorage` (reset `imageStatus` to `'idle'` on all scenes, set `_hasHydrated: true`), storage key `reelzero-video-wizard-draft`
- [X] T005 Extend `src/store/video-store.ts` — add new state fields: `videoId: string | null`, `_hasHydrated: boolean`; add new actions: `setVideoId`, `reorderScenes(activeId, overId)` (uses `arrayMove`, re-indexes `.order`), `setSceneImageStatus(id, status)`, `setHasHydrated(value)` (depends on T003)
- [X] T006 [P] Create `src/app/api/video/route.ts` — `POST /api/video`: auth via `auth()`, validate prompt (50–500 chars), call `createVideo({ user_id, title: prompt.substring(0,100), prompt, metadata: { voice, theme, captionStyle }, status: 'processing' })`, return `201 { data: { videoId } }`; error codes: `AUTH_UNAUTHORIZED`, `VALIDATION_MISSING_FIELD`, `VALIDATION_INVALID_INPUT`, `INTERNAL_ERROR`
- [X] T007 [P] Patch `src/app/api/video/images/route.ts` — remove `userId` from request body parsing; derive `userId` exclusively from `auth()` (Clerk); add scene-count cap to `MAX_SCENES`
- [X] T008 [P] Patch `src/app/api/video/generate/route.ts` — add route-level prompt length validation (50–500 chars) before AI call (currently missing; AI layer validates but route does not return `VALIDATION_INVALID_INPUT` on bad length)
- [X] T009 [P] Verify and patch `src/app/api/upload/image/route.ts` — (a) confirm `userId` is derived from `auth()` not request body; patch if any `body.userId` reference exists; (b) **FR-017**: confirm the route calls the Sharp resize pipeline targeting `TARGET_IMAGE_WIDTH × TARGET_IMAGE_HEIGHT` (1080×1920, from `src/lib/constants/`) before writing to Supabase Storage; add the resize call (via `src/lib/ai/image-processing.ts` or equivalent) if it is missing or silently skipped for the upload path
- [X] T010 Create `src/app/api/video/render/route.ts` — `POST /api/video/render`: auth → validate all scenes have `imageUrl` and count in `[MIN_SCENES, MAX_SCENES]` → `reserveCredit(userId)` (→ `CREDIT_INSUFFICIENT` on failure) → update `videos.metadata` with final wizard choices → `POST` to renderer service → on renderer failure `refundCredit(userId)` + `RENDER_SERVICE_UNAVAILABLE` → return `202 { data: { videoId, status: 'processing', estimatedSeconds } }`
- [X] T011 Create `src/hooks/useVideoGeneration.ts` — orchestration hook: (a) `createVideoRecord()` calls `POST /api/video`, stores `videoId` in Zustand; (b) `generateScript()` calls `POST /api/video/generate`, normalises scenes to [3,5] (truncate/pad), sets scenes in Zustand, sets `isGenerating` true before call and false after (loading state for Step 1 "Next" button gate); (c) `generateAllImages()` fans out per-scene calls to `POST /api/video/images` using `Promise.allSettled()`, each call updates `setSceneImageStatus` + `updateScene`; (d) `submitVideoJob()` calls `POST /api/video/render`; (e) maps error codes to user-friendly messages per plan.md error table; (f) handles network timeout/error from script generation as `GENERATION_SCRIPT_FAILED` so Step 1 stays on current step and allows retry

**Checkpoint**: Foundation ready — all wizard components can now be built

---

## Phase 3: User Story 1 + 4 — Complete Wizard / Credit Gate (Priority: P1) 🎯 MVP

**Goal**: Full end-to-end wizard flow from prompt submission to render dispatch, plus credit enforcement on Step 4. Both US1 and US4 are P1 and share the same wizard shell and submit pathway.

**Independent Test**: Sign in with a credited user → enter prompt → generate script → generate all images (AI-generate only, no upload toggle yet) → submit → verify redirect to progress page AND video record in Supabase. Set credits to 0 → verify Step 4 submit button is disabled with billing link. Note: drag-to-reorder and image upload are not present yet (added in Phases 4–5).

### Implementation for User Stories 1 + 4

- [X] T012 Create `src/components/video/wizard-step-indicator.tsx` — renders 4 step dots/labels showing current step (active) and completed steps (checked); accepts `currentStep: number` prop; `'use client'`
- [X] T013 Create `src/components/video/steps/step-1-input.tsx` — form: prompt `<Textarea>` with 50–500 char inline validation, voice `<Select>` from `VOICE_OPTIONS`, theme `<Select>` from theme constants, caption style `<Select>` from `CaptionStyle` options; "Next" button calls `createVideoRecord()` then `generateScript()` from `useVideoGeneration.ts`; button is disabled and loading skeleton shown while `isGenerating === true` (covers both the POST /api/video call and the POST /api/video/generate call — the two-step chain runs sequentially under one loading state); `'use client'`
- [X] T014 Create `src/components/video/steps/step-2-script.tsx` — **Phase 3 stub**: renders a flat (non-sortable) scene list sufficient for the US1 happy path; "Add Scene" disabled at 5 scenes; "Delete" disabled at 3 scenes; "Next" button validates all scenes have non-empty narration; "Back" decrements step with no data loss; `'use client'`. ⚠️ T021 (Phase 4) upgrades this to `<SceneListSortable>` with drag-to-reorder — coordinate to avoid file conflicts.
- [X] T015 Create `src/components/video/steps/step-3-images.tsx` — **Phase 3 stub**: renders one AI-generate-only scene card per scene (no upload toggle yet); "Generate All Images" button calls `generateAllImages()` from `useVideoGeneration.ts`; each scene shows its own loading skeleton independently; "Next" disabled until all scenes have `imageUrl != null`; "Back" returns to Step 2 preserving image state; `'use client'`. ⚠️ T024 (Phase 5) replaces per-scene cards with full `<ImageSelector>` (AI + Upload tabs) — coordinate to avoid file conflicts.
- [X] T016 Create `src/components/video/steps/step-4-settings.tsx` — transition type `<Select>` (Fade / Crossfade), summary display (prompt excerpt, scene count, voice, theme, transition, caption style), `useCredits()` hook: if `!canGenerate` disable submit button + show "No credits remaining" + billing link; "Generate Video" calls `submitVideoJob()` from `useVideoGeneration.ts`, on success calls `reset()` (which calls `persist.clearStorage()` to wipe the `reelzero-video-wizard-draft` sessionStorage entry) + redirects to progress page, on failure shows error; `'use client'` (depends on T010, T011)
- [X] T017 Create `src/components/video/video-wizard.tsx` — top-level client component: reads `_hasHydrated` from store and renders a full-width `<Skeleton>` until `true` (SSR hydration guard stub — T025 verifies end-to-end behaviour); renders `<WizardStepIndicator>` + active step component based on `currentStep`; "Start Over" button calls `reset()`; `'use client'` (depends on T012–T016)
- [X] T018 Update `src/app/(dashboard)/create/page.tsx` — replace existing stub with auth check (redirect unauthenticated) + `<VideoWizard />` mount (depends on T017)

**Checkpoint**: US1 + US4 fully functional — end-to-end wizard works, credit gate enforced

---

## Phase 4: User Story 2 — Edit Generated Script (Priority: P2)

**Goal**: Users can edit scene narration/visual description, add scenes (up to 5), delete scenes (down to 3), and reorder via drag-and-drop. Final order is persisted through all steps.

**Independent Test**: Generate a script, edit narration of scene 1, drag scene 2 above scene 1, add a new blank scene, delete the last scene — all changes persist through Step 3 and Step 4 summary.

### Implementation for User Story 2

- [X] T019 Create `src/components/video/scene-card.tsx` — displays scene number, narration `<Textarea>` (controlled, calls `updateScene` on change), visual description `<Textarea>` (controlled), drag handle (`GripVertical` icon from lucide-react, used as `useSortable` drag handle ref), delete button (calls `removeScene`, disabled when `scenes.length <= MIN_SCENES`); `'use client'`
- [X] T020 Create `src/components/video/scene-list-sortable.tsx` — wraps `DndContext` (PointerSensor + KeyboardSensor) + `SortableContext` (verticalListSortingStrategy); `onDragEnd` calls `reorderScenes(activeId, overId)` from store using `arrayMove`; renders one `<SceneCard>` per scene using `useSortable`; `'use client'` (depends on T001 — dnd-kit must be installed, T019)
- [X] T021 Update `src/components/video/steps/step-2-script.tsx` — replace simple scene list with `<SceneListSortable>`; wire "Add Scene" to `addScene` action (with `imageStatus: 'idle'`); confirm delete control disables at `MIN_SCENES` (depends on T019, T020)

**Checkpoint**: US2 fully functional — script editing and drag-to-reorder work independently

---

## Phase 5: User Story 3 — Upload Custom Image (Priority: P2)

**Goal**: Each scene in Step 3 has an AI/Upload toggle. Upload mode shows an image dropzone supporting drag-and-drop and file picker with client-side validation and preview.

**Independent Test**: Switch any scene to Upload mode, drop a valid PNG → see preview thumbnail. Drop a >10MB file → see inline error. Drop a .gif file → see inline error. Click Replace → successfully swap image.

### Implementation for User Story 3

- [X] T022 Create `src/components/video/image-dropzone.tsx` — native HTML5 drag-and-drop + `<input type="file" accept=".png,.jpg,.jpeg,.webp">` hidden input; `onDrop`/`onChange` handler: validate `file.size <= MAX_UPLOAD_SIZE_BYTES` → validate `ALLOWED_UPLOAD_MIME_TYPES.includes(file.type)` → validate extension; on error show inline message; on valid file POST `FormData` to `/api/upload/image` (do NOT set Content-Type header manually); on success call `updateScene(id, { imageUrl, imageSource: 'upload', imageStatus: 'success' })`; show loading state during upload; `'use client'`
- [X] T023 Create `src/components/video/image-selector.tsx` — `<Tabs>` (shadcn) with two tabs: "AI Generate" and "Upload"; AI tab shows image preview thumbnail if `imageUrl` is set and `imageSource === 'ai'`, else shows "Waiting for generation…" placeholder; Upload tab renders `<ImageDropzone>` with "Replace" button if image already set; `'use client'` (depends on T022)
- [X] T024 Update `src/components/video/steps/step-3-images.tsx` — replace per-scene placeholder with `<ImageSelector>` component for each scene (depends on T023)

**Checkpoint**: US3 fully functional — image upload with validation, preview, and replace works

---

## Phase 6: User Story 5 — Resume Interrupted Wizard (Priority: P3)

**Goal**: Wizard state persists across page navigations via `sessionStorage`. Users return to their last completed step with all data intact. "Start Over" clears the draft.

**Independent Test**: Complete Steps 1–2, refresh browser → wizard reopens at Step 2 with same scenes. Navigate away and return → same result. Click "Start Over" → Step 1 with blank prompt.

### Implementation for User Story 5

> **Note**: The core persist middleware is added in T004 (Phase 2 Foundational). This phase wires the hydration guard into the UI.

- [X] T025 Verify hydration guard in `src/components/video/video-wizard.tsx` end-to-end — confirm that after persist middleware is wired (T004) and `_hasHydrated` is set in `onRehydrateStorage` (T005), the wizard correctly renders the skeleton during SSR and switches to the persisted `currentStep` once `_hasHydrated === true`; test by hard-refreshing mid-wizard and verifying no flash of Step 1 content before persisted step appears (depends on T004, T005, T017)
- [X] T026 Verify `src/store/video-store.ts` `reset()` action clears the `sessionStorage` entry — confirm that calling `reset()` from "Start Over" in `<VideoWizard>` and from successful submission in `<Step4Settings>` wipes the persisted draft (the `persist` middleware `clearStorage()` or equivalent must be called); add if missing (depends on T004, T005)

**Checkpoint**: US5 fully functional — session persistence and Start Over both work

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Ensure all 4 steps render correctly on mobile (≥ 375 px), error states are consistent, and pre-commit gate passes.

- [X] T027 [P] Audit all wizard step components for mobile viewport (≥ 375 px) — check Tailwind responsive classes on scene cards, image selector tabs, and Step 4 summary; fix layout breakpoints where needed (SC-007)
- [X] T028 [P] Audit error message consistency across all steps — confirm `GENERATION_SCRIPT_FAILED`, `GENERATION_IMAGE_FAILED`, `RENDER_SERVICE_UNAVAILABLE`, `CREDIT_INSUFFICIENT`, `VALIDATION_INVALID_INPUT` are all mapped to user-friendly strings per plan.md error table; verify retry is possible from same state (SC-006)
- [X] T029 Run `npm run pre-commit` (`lint` + `type-check` + `build`) and fix all reported errors
- [X] T030 Manual smoke test — execute all 5 quickstart.md tests (Happy Path, Credit Gate, Back Navigation, Resume After Refresh, Start Over)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — run immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (dnd-kit must be installed for T005/T020 to compile). **BLOCKS** all wizard UI phases.
- **US1+US4 (Phase 3)**: Depends on Phase 2 — no wizard UI is possible without the store and hook
- **US2 (Phase 4)**: Depends on Phase 2 (store `reorderScenes` action). Can start in parallel with Phase 3 once Phase 2 is done; integrates into Phase 3's Step 2 component (T021 updates T014).
- **US3 (Phase 5)**: Depends on Phase 2 (upload route verified). Can start in parallel with Phase 3 and Phase 4 once Phase 2 is done; integrates into Phase 3's Step 3 component (T024 updates T015).
- **US5 (Phase 6)**: Core persist middleware is in Phase 2 (T004). Phase 6 only adds the hydration guard to the UI — depends on Phase 3 (VideoWizard component exists).
- **Polish (Phase 7)**: Depends on all user story phases complete.

### User Story Dependencies

- **US1 + US4 (P1)**: Start after Phase 2. No dependency on US2/US3/US5.
- **US2 (P2)**: Start after Phase 2. T021 updates Step 2 component — coordinate with US1 implementer to avoid conflict on `step-2-script.tsx`.
- **US3 (P2)**: Start after Phase 2. T024 updates Step 3 component — coordinate with US1 implementer to avoid conflict on `step-3-images.tsx`.
- **US5 (P3)**: Start after Phase 3 (VideoWizard must exist for T025).

### Within Each Phase

- Tasks marked **[P]** within Phase 2 can all run in parallel (different files)
- T005 depends on T003 (Scene type must be extended before store uses `ImageStatus`)
- T010 (render route) depends on nothing in Phase 2 — can be done by a separate developer
- T011 (hook) depends on T010 being specced (not necessarily implemented) — implement after route contracts are clear

### Parallel Opportunities

```bash
# Phase 1 (run together):
Task: "Install dnd-kit (T001)"
Task: "Add shadcn components (T002)"

# Phase 2 (run together after Phase 1):
Task: "Extend Scene type (T003)"
Task: "Add persist middleware to store (T004)"  # depends on T003
Task: "Create POST /api/video route (T006)"
Task: "Patch /api/video/images route (T007)"
Task: "Patch /api/video/generate route (T008)"
Task: "Verify /api/upload/image route (T009)"
Task: "Create POST /api/video/render route (T010)"
# T005 after T003; T011 after T005+T010

# Phase 3 + Phase 4 + Phase 5 (run together after Phase 2):
Task: "Build wizard shell + Steps 1/3/4 (T012-T018)"  # US1+US4
Task: "Build scene-card + scene-list-sortable (T019-T021)"  # US2
Task: "Build image-dropzone + image-selector (T022-T024)"  # US3
```

---

## Implementation Strategy

### MVP First (US1 + US4 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T011)
3. Complete Phase 3: US1 + US4 (T012–T018)
4. **STOP and VALIDATE**: Walk through quickstart.md Test 1 (Happy Path) and Test 2 (Credit Gate)
5. Deploy/demo if ready

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation complete
2. Phase 3 (US1 + US4) → Wizard works end-to-end → MVP demo
3. Phase 4 (US2) → Add script editing + reorder → richer editing experience
4. Phase 5 (US3) → Add image upload → personalisation
5. Phase 6 (US5) → Add session persistence → resilience
6. Phase 7 → Polish + pre-commit gate passes → PR ready

### Parallel Team Strategy (2 developers)

- **Dev A**: T001, T002 → T003, T004, T005, T010, T011 → T012, T013, T014, T015, T016, T017, T018 (wizard shell, API routes, `useVideoGeneration.ts` hook)
- **Dev B**: T001, T002 → T006, T007, T008, T009 → T019, T020, T021, T022, T023, T024 (scene editing + image upload)
- Both converge on Phase 7 for integration + polish

---

## Notes

- [P] tasks = different files, no dependencies within the same phase
- No tests were requested in this feature — test tasks omitted
- Each user story phase is independently completable and testable against quickstart.md smoke tests
- Commit after each task or logical group; run `npm run type-check` after every store/type change
- T004 (persist middleware) is the highest-risk task — SSR `sessionStorage` guard (`typeof window === 'undefined'`) must be correct or Next.js build will fail
- T010 (render route) has external dependency on renderer service URL — use env var `RENDERER_SERVICE_URL` (documented in quickstart.md Environment Variables section; add to `.env.local` before running locally)
- Scene `imageStatus` is intentionally NOT persisted to `sessionStorage` — on rehydration all scenes reset to `'idle'` (documented in data-model.md)
- Signed URL expiry: `imageUrl` values in sessionStorage expire after 1 hour (Supabase default); user must re-generate images after resuming a draft older than 1 hour (accepted MVP limitation)
