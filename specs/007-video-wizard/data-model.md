# Data Model: Video Generation Wizard

**Feature**: `007-video-wizard` | **Date**: 2026-02-12

---

## Existing Types Used (No Changes)

These types from `src/types/scene.ts` and `src/lib/db/schema.ts` are used as-is:

```typescript
// src/types/scene.ts (existing)
type CaptionStyle = 'word-by-word' | 'full-sentence' | 'none';
type TransitionType = 'fade' | 'crossfade';
```

```typescript
// src/lib/db/schema.ts (existing)
type Video = {
  id: string;
  user_id: string;
  title: string;          // prompt.substring(0, 100)
  prompt: string;         // full wizard prompt
  status: 'processing' | 'completed' | 'failed';
  metadata: Record<string, unknown>;  // wizard choices stored here
  // ... timestamps, storage fields set by renderer
};
```

---

## Extended: Scene Type

The existing `Scene` type in `src/types/scene.ts` is extended with an `imageStatus` field:

```typescript
// src/types/scene.ts — EXTENDED
type ImageStatus = 'idle' | 'loading' | 'success' | 'error';

type Scene = {
  id: string;                      // client-generated UUID (crypto.randomUUID())
  order: number;                   // 1-based, maintained by reorderScenes action
  narration: string;               // spoken text for this scene
  visualDescription: string;       // used for AI image generation prompt
  imageUrl: string | null;         // signed Supabase Storage URL (1hr expiry)
  imageSource: 'ai' | 'upload';    // which generation mode was used
  duration: number | null;         // seconds; set by renderer (F008)
  imageStatus: ImageStatus;        // client-only UI state — NOT persisted to DB
};
```

`imageStatus` is excluded from the Zustand `persist` `partialize` function. On rehydration from `sessionStorage`, all scenes get `imageStatus: 'idle'` (user must re-trigger image generation).

---

## Extended: Zustand Store State

The existing `video-store.ts` is extended with new fields and actions:

### New State Fields

```typescript
type VideoStoreState = {
  // --- existing fields (unchanged) ---
  currentStep: number;             // 1–4
  prompt: string;
  selectedVoice: string | null;    // voice_id from VOICE_OPTIONS
  selectedTheme: string | null;    // ScriptTheme enum value
  captionStyle: CaptionStyle;
  transitionType: TransitionType;
  scenes: Scene[];                 // extended Scene type
  isGenerating: boolean;
  generationProgress: number;
  onGenerationComplete: (() => void) | null;

  // --- NEW fields ---
  videoId: string | null;          // set after POST /api/video on Step 1 submit
  _hasHydrated: boolean;           // set to true by onRehydrateStorage callback
};
```

### New Actions

```typescript
type VideoStoreActions = {
  // --- existing actions (unchanged) ---
  setStep, setPrompt, setVoice, setTheme, setCaptionStyle,
  setTransitionType, setScenes, updateScene, addScene, removeScene,
  reset, setOnGenerationComplete, notifyGenerationComplete,

  // --- NEW actions ---
  setVideoId: (id: string) => void;
  reorderScenes: (activeId: string, overId: string) => void;
  setSceneImageStatus: (id: string, status: ImageStatus) => void;
  setHasHydrated: (value: boolean) => void;
};
```

### Persist Configuration

```typescript
persist(
  // ... store definition ...
  {
    name: 'reelzero-video-wizard-draft',
    storage: getSessionStorage(),           // undefined during SSR
    partialize: (state) => ({
      currentStep: state.currentStep,
      prompt: state.prompt,
      videoId: state.videoId,
      selectedVoice: state.selectedVoice,
      selectedTheme: state.selectedTheme,
      captionStyle: state.captionStyle,
      transitionType: state.transitionType,
      scenes: state.scenes,               // imageStatus excluded by Scene type
                                          // BUT: scenes are stored with whatever
                                          // imageStatus they have. On rehydrate,
                                          // imageStatus is reset to 'idle'.
    }),
    onRehydrateStorage: () => (state) => {
      if (state) {
        // Reset imageStatus on all scenes — user re-triggers generation
        state.scenes = state.scenes.map(s => ({ ...s, imageStatus: 'idle' as const }));
        state._hasHydrated = true;
      }
    },
  }
)
```

---

## New: VideoJob Payload (Wizard → Render API)

This is the shape sent from the wizard to `POST /api/video/render`:

```typescript
type VideoJobPayload = {
  videoId: string;
  scenes: VideoJobScene[];
  voice: string;              // voice_id
  theme: ScriptTheme;
  captionStyle: CaptionStyle;
  transitionType: TransitionType;
};

type VideoJobScene = {
  order: number;              // 1-based, final user-defined sequence
  narration: string;
  visualDescription: string;
  imageUrl: string;           // must be non-null (all scenes require an image)
  imageSource: 'ai' | 'upload';
  duration: number | null;
};
```

**Validation rules applied before dispatch**:
- `scenes.length >= MIN_SCENES && scenes.length <= MAX_SCENES`
- Every `scene.imageUrl` is non-null (all scenes must have an image)
- `videoId` is non-null (was set in Step 1)

---

## Video Metadata Schema (stored in `videos.metadata` JSONB)

The wizard progressively enriches `videos.metadata` as the user advances. Final shape at submission:

```typescript
type VideoMetadata = {
  voice: string;
  theme: ScriptTheme;
  captionStyle: CaptionStyle;
  transitionType: TransitionType;
  sceneCount: number;
  scenes: Array<{
    order: number;
    narration: string;
    visualDescription: string;
    imageUrl: string;
    imageSource: 'ai' | 'upload';
  }>;
};
```

This is stored at Step 4 final submission via `POST /api/video/render` which updates `videos.metadata` before dispatching to the renderer.

---

## State Transitions

### Video Record Lifecycle (DB)

```
[User submits Step 1]
     ↓
  status: 'processing'   ← created by POST /api/video
     ↓
[User completes wizard + submits Step 4]
     ↓
  POST /api/video/render → Renderer service
     ↓
  status: 'completed'    ← set by renderer on success (F008)
  OR
  status: 'failed'       ← set by renderer on failure (F008)
```

### Wizard Step Transitions

```
Step 1 (Input)
  → [validate prompt 50–500 chars, voice selected, theme selected, caption selected]
  → POST /api/video (create record, get videoId)
  → POST /api/video/generate (script generation)
  → Step 2

Step 2 (Script Editor)
  → [3–5 scenes, each with narration + visual description]
  → [drag to reorder, add/delete scenes]
  → Step 3 (forward) OR Step 1 (back, no data loss)

Step 3 (Image Selection)
  → [each scene: AI generate or upload]
  → [all scenes must have imageUrl before advancing]
  → Step 4 (forward) OR Step 2 (back, images preserved)

Step 4 (Settings + Submit)
  → [transition picker, summary review]
  → [credit check: canGenerate === true]
  → [reserveCredit]
  → POST /api/video/render
  → [on success: reset() + redirect to progress page]
  → [on failure: refundCredit + show error]
```

---

## Entities Summary

| Entity | Lives In | Created When | Notes |
|--------|----------|--------------|-------|
| `Video` (DB) | `videos` table | Step 1 submit | `status: 'processing'`; enriched by renderer |
| `Wizard State` | Zustand + sessionStorage | Page load / hydration | Cleared on submit or "Start Over" |
| `Scene` (client) | Zustand store | Script generation response | Extended with `imageStatus` |
| `VideoJobPayload` | In-memory (Step 4) | Step 4 submit | Derived from Zustand state |
| `GenerationLog` (DB) | `generation_logs` table | Each AI call | FK to `video_id`; managed by AI service layer |
| `UploadedImage` (DB) | `uploaded_images` table | Each user image upload | FK to `video_id` and `user_id` |
| `CreditReservation` | `subscriptions` table | Step 4 submit | `reserveCredit()` → `deductCredit()` on success or `refundCredit()` on failure |
