import { arrayMove } from "@dnd-kit/sortable";
import { create } from "zustand";
import { persist, type StorageValue } from "zustand/middleware";

import { MIN_SCENES } from "@/lib/constants/video";
import type { RenderStage } from "@/types/render";
import type { CaptionStyle, ImageStatus, Scene, TransitionType } from "@/types/scene";

type VideoStoreState = {
  currentStep: number;
  prompt: string;
  selectedVoice: string | null;
  selectedTheme: string | null;
  captionStyle: CaptionStyle;
  transitionType: TransitionType;
  scenes: Scene[];
  isGenerating: boolean;
  generationProgress: number;
  // Credit refresh callback — set by DashboardHeader after mount
  onGenerationComplete: (() => void) | null;
  // F007: video record ID — set after POST /api/video on Step 1 submit
  videoId: string | null;
  // F007: hydration guard — set to true by onRehydrateStorage callback
  _hasHydrated: boolean;
  // F008: render pipeline state — NOT persisted in sessionStorage
  renderStatus: RenderStage | null;
  renderError: string | null;
};

type VideoStoreActions = {
  setStep: (step: number) => void;
  setPrompt: (prompt: string) => void;
  setVoice: (voiceId: string) => void;
  setTheme: (theme: string) => void;
  setCaptionStyle: (style: CaptionStyle) => void;
  setTransitionType: (type: TransitionType) => void;
  setScenes: (scenes: Scene[]) => void;
  updateScene: (id: string, updates: Partial<Scene>) => void;
  addScene: () => void;
  removeScene: (id: string) => void;
  reset: () => void;
  setOnGenerationComplete: (callback: (() => void) | null) => void;
  notifyGenerationComplete: () => void;
  // F007: new actions
  setVideoId: (id: string) => void;
  reorderScenes: (activeId: string, overId: string) => void;
  setSceneImageStatus: (id: string, status: ImageStatus) => void;
  setHasHydrated: (value: boolean) => void;
  // F008: render state actions
  setRenderStatus: (status: RenderStage | null) => void;
  setRenderError: (error: string | null) => void;
  clearRenderState: () => void;
  // F009: T030a — pre-fill wizard from a previous video for regeneration
  prefillFromVideo: (data: {
    prompt: string;
    voice?: string;
    theme?: string;
    captionStyle?: CaptionStyle;
    transitionType?: TransitionType;
  }) => void;
};

const INITIAL_STATE: VideoStoreState = {
  currentStep: 1,
  prompt: "",
  selectedVoice: null,
  selectedTheme: null,
  captionStyle: "word-by-word",
  transitionType: "fade",
  scenes: [],
  isGenerating: false,
  generationProgress: 0,
  onGenerationComplete: null,
  videoId: null,
  _hasHydrated: false,
  // F008: render state — never persisted
  renderStatus: null,
  renderError: null,
};

type StoreState = VideoStoreState & VideoStoreActions;

// SSR-safe sessionStorage factory — returns undefined during server render.
// Typed to satisfy Zustand's PersistStorage interface.
function getSessionStorage():
  | {
      getItem: (key: string) => StorageValue<StoreState> | null;
      setItem: (key: string, value: StorageValue<StoreState>) => void;
      removeItem: (key: string) => void;
    }
  | undefined {
  if (typeof window === "undefined") return undefined;
  return {
    getItem: (key: string): StorageValue<StoreState> | null => {
      try {
        const item = window.sessionStorage.getItem(key);
        return item ? (JSON.parse(item) as StorageValue<StoreState>) : null;
      } catch {
        return null;
      }
    },
    setItem: (key: string, value: StorageValue<StoreState>) => {
      try {
        window.sessionStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Quota exceeded or private mode — fail silently
      }
    },
    removeItem: (key: string) => {
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        // fail silently
      }
    },
  };
}

export const useVideoStore = create<VideoStoreState & VideoStoreActions>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      setStep: (step) => set({ currentStep: step }),

      setPrompt: (prompt) => set({ prompt }),

      setVoice: (voiceId) => set({ selectedVoice: voiceId }),

      setTheme: (theme) => set({ selectedTheme: theme }),

      setCaptionStyle: (style) => set({ captionStyle: style }),

      setTransitionType: (type) => set({ transitionType: type }),

      setScenes: (scenes) => set({ scenes }),

      updateScene: (id, updates) =>
        set((state) => ({
          scenes: state.scenes.map((scene) =>
            scene.id === id ? { ...scene, ...updates } : scene
          ),
        })),

      addScene: () =>
        set((state) => ({
          scenes: [
            ...state.scenes,
            {
              id: crypto.randomUUID(),
              order: state.scenes.length + 1,
              narration: "",
              visualDescription: "",
              imageUrl: null,
              imageSource: "ai" as const,
              duration: null,
              imageStatus: "idle" as const,
            },
          ],
        })),

      removeScene: (id) =>
        set((state) => {
          if (state.scenes.length <= MIN_SCENES) return state;
          return {
            scenes: state.scenes
              .filter((scene) => scene.id !== id)
              .map((scene, index) => ({ ...scene, order: index + 1 })),
          };
        }),

      reset: () => {
        // Explicitly clear the sessionStorage draft when resetting
        if (typeof window !== "undefined") {
          try {
            window.sessionStorage.removeItem("reelzero-video-wizard-draft");
          } catch {
            // fail silently
          }
        }
        set({ ...INITIAL_STATE, _hasHydrated: true });
      },

      setOnGenerationComplete: (callback) => set({ onGenerationComplete: callback }),

      notifyGenerationComplete: () => {
        const { onGenerationComplete } = useVideoStore.getState();
        onGenerationComplete?.();
      },

      // F007: new actions
      setVideoId: (id) => set({ videoId: id }),

      reorderScenes: (activeId, overId) =>
        set((state) => {
          const oldIndex = state.scenes.findIndex((s) => s.id === activeId);
          const newIndex = state.scenes.findIndex((s) => s.id === overId);
          if (oldIndex === -1 || newIndex === -1) return state;
          const reordered = arrayMove(state.scenes, oldIndex, newIndex).map(
            (scene, index) => ({ ...scene, order: index + 1 })
          );
          return { scenes: reordered };
        }),

      setSceneImageStatus: (id, status) =>
        set((state) => ({
          scenes: state.scenes.map((scene) =>
            scene.id === id ? { ...scene, imageStatus: status } : scene
          ),
        })),

      setHasHydrated: (value) => set({ _hasHydrated: value }),

      // F008: render state actions (not persisted)
      setRenderStatus: (status) => set({ renderStatus: status }),
      setRenderError: (error) => set({ renderError: error }),
      clearRenderState: () => set({ renderStatus: null, renderError: null }),

      // F009: T030a — reset to step 1 and pre-fill with prior video's settings
      prefillFromVideo: (data) => {
        if (typeof window !== "undefined") {
          try {
            window.sessionStorage.removeItem("reelzero-video-wizard-draft");
          } catch {
            // fail silently
          }
        }
        set({
          ...INITIAL_STATE,
          _hasHydrated: true,
          prompt: data.prompt,
          selectedVoice: data.voice ?? null,
          selectedTheme: data.theme ?? null,
          captionStyle: data.captionStyle ?? "word-by-word",
          transitionType: data.transitionType ?? "fade",
        });
      },
    }),
    {
      name: "reelzero-video-wizard-draft",
      storage: getSessionStorage(),
      partialize: (state) =>
        ({
          currentStep: state.currentStep,
          prompt: state.prompt,
          videoId: state.videoId,
          selectedVoice: state.selectedVoice,
          selectedTheme: state.selectedTheme,
          captionStyle: state.captionStyle,
          transitionType: state.transitionType,
          scenes: state.scenes,
        }) as StoreState,
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Reset imageStatus on all scenes — user must re-trigger generation after resume
          state.scenes = state.scenes.map((s) => ({
            ...s,
            imageStatus: "idle" as const,
          }));
          state._hasHydrated = true;
        }
      },
    }
  )
);
