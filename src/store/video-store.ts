import { create } from "zustand";

import type { CaptionStyle, Scene, TransitionType } from "@/types/scene";

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
};

export const useVideoStore = create<VideoStoreState & VideoStoreActions>()(
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
          },
        ],
      })),

    removeScene: (id) =>
      set((state) => ({
        scenes: state.scenes
          .filter((scene) => scene.id !== id)
          .map((scene, index) => ({ ...scene, order: index + 1 })),
      })),

    reset: () => set(INITIAL_STATE),
  })
);
