"use client";

import { useState, useCallback } from "react";

import { apiClient } from "@/lib/api/client";
import { MAX_SCENES, MIN_SCENES } from "@/lib/constants/video";
import { useVideoStore } from "@/store/video-store";
import type { Scene } from "@/types/scene";

// ---------------------------------------------------------------------------
// Error message map — maps API error codes to user-friendly strings
// ---------------------------------------------------------------------------
const ERROR_MESSAGES: Record<string, string> = {
  CREDIT_INSUFFICIENT: "You have no credits remaining.",
  GENERATION_SCRIPT_FAILED: "Script generation failed. Please try again.",
  GENERATION_IMAGE_FAILED: "Image generation failed. You can upload your own image instead.",
  QUOTA_EXCEEDED: "AI image generation quota exceeded. Please upload your own images to continue.",
  RENDER_SERVICE_UNAVAILABLE:
    "Video generation is temporarily unavailable. Please try again shortly.",
  RESOURCE_CONFLICT:
    "You already have a video being generated. Please wait for it to finish.",
  VALIDATION_INVALID_INPUT: "Please check your inputs and try again.",
  AUTH_UNAUTHORIZED: "Your session has expired. Please sign in again.",
};

function getErrorMessage(code: string | undefined): string {
  if (!code) return "An unexpected error occurred. Please try again.";
  return ERROR_MESSAGES[code] ?? "An unexpected error occurred. Please try again.";
}

// ---------------------------------------------------------------------------
// Response shapes — these represent the unwrapped payload T that apiClient
// extracts from the server's { data: T } envelope.
// ---------------------------------------------------------------------------
type CreateVideoData = { videoId: string };

type ScriptSceneResponse = {
  sceneNumber: number;
  narration: string;
  visualDescription: string;
  durationSeconds: number;
  keywords: string[];
};

type GenerateScriptData = {
  totalDuration: number;
  scenes: ScriptSceneResponse[];
};

type GenerateImagesData = {
  results: Array<{
    sceneNumber: number;
    status: "success" | "error";
    output?: { storageUrl: string; storagePath: string };
    error?: string;
  }>;
  successCount: number;
  errorCount: number;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useVideoGeneration() {
  const [error, setError] = useState<string | null>(null);

  const {
    prompt,
    selectedVoice,
    selectedTheme,
    captionStyle,
    setVideoId,
    setScenes,
    setStep,
    setSceneImageStatus,
    updateScene,
  } = useVideoStore();

  // -------------------------------------------------------------------------
  // (a) createVideoRecord — POST /api/video, stores videoId in Zustand
  // -------------------------------------------------------------------------
  const createVideoRecord = useCallback(async (): Promise<string | null> => {
    setError(null);

    const response = await apiClient.post<CreateVideoData>("/api/video", {
      prompt,
      theme: selectedTheme,
      voice: selectedVoice,
      captionStyle,
    });

    if (response.error) {
      setError(getErrorMessage(response.error.code));
      return null;
    }

    const newVideoId = response.data.videoId;
    setVideoId(newVideoId);
    return newVideoId;
  }, [prompt, selectedTheme, selectedVoice, captionStyle, setVideoId]);

  // -------------------------------------------------------------------------
  // (b) generateScript — POST /api/video/generate, normalises scenes to [3,5]
  // -------------------------------------------------------------------------
  const generateScript = useCallback(
    async (currentVideoId: string): Promise<boolean> => {
      // isGenerating is managed by createAndGenerateScript's try/finally
      const response = await apiClient.post<GenerateScriptData>("/api/video/generate", {
        prompt,
        theme: selectedTheme,
        videoId: currentVideoId,
      });

      if (response.error) {
        setError(getErrorMessage(response.error.code));
        return false;
      }

      // Normalise scene count to [MIN_SCENES, MAX_SCENES]
      let apiScenes = response.data.scenes;
      if (apiScenes.length > MAX_SCENES) {
        apiScenes = apiScenes.slice(0, MAX_SCENES);
      }

      const mappedScenes: Scene[] = apiScenes.map((s, index) => ({
        id: crypto.randomUUID(),
        order: index + 1,
        narration: s.narration,
        visualDescription: s.visualDescription,
        imageUrl: null,
        imageSource: "ai" as const,
        duration: s.durationSeconds ?? null,
        imageStatus: "idle" as const,
      }));

      // Pad to MIN_SCENES with blank scenes if under minimum
      while (mappedScenes.length < MIN_SCENES) {
        mappedScenes.push({
          id: crypto.randomUUID(),
          order: mappedScenes.length + 1,
          narration: "",
          visualDescription: "",
          imageUrl: null,
          imageSource: "ai" as const,
          duration: null,
          imageStatus: "idle" as const,
        });
      }

      setScenes(mappedScenes);
      setStep(2);
      return true;
    },
    [prompt, selectedTheme, setScenes, setStep]
  );

  // -------------------------------------------------------------------------
  // (c) generateSceneImage — generate image for a single scene by ID
  // -------------------------------------------------------------------------
  const generateSceneImage = useCallback(
    async (sceneId: string): Promise<void> => {
      const currentVideoId = useVideoStore.getState().videoId;
      const currentTheme = useVideoStore.getState().selectedTheme;
      const scene = useVideoStore.getState().scenes.find((s) => s.id === sceneId);

      if (!currentVideoId || !currentTheme || !scene) {
        setError("Missing video context. Please start over.");
        return;
      }

      setSceneImageStatus(sceneId, "loading");

      try {
        const response = await apiClient.post<GenerateImagesData>("/api/video/images", {
          scenes: [{ visualDescription: scene.visualDescription, sceneNumber: scene.order }],
          theme: currentTheme,
          videoId: currentVideoId,
        });

        if (response.error) {
          setSceneImageStatus(sceneId, "error");
          return;
        }

        const firstResult = response.data.results[0];
        if (firstResult?.status === "success" && firstResult.output) {
          updateScene(sceneId, {
            imageUrl: firstResult.output.storageUrl,
            imageSource: "ai",
            imageStatus: "success",
          });
        } else {
          setSceneImageStatus(sceneId, "error");
        }
      } catch {
        setSceneImageStatus(sceneId, "error");
      }
    },
    [setSceneImageStatus, updateScene]
  );

  // -------------------------------------------------------------------------
  // (d) generateAllImages — fan-out per-scene, skips already-successful scenes
  // -------------------------------------------------------------------------
  const generateAllImages = useCallback(async (): Promise<void> => {
    setError(null);
    const currentScenes = useVideoStore.getState().scenes;
    const currentVideoId = useVideoStore.getState().videoId;
    const currentTheme = useVideoStore.getState().selectedTheme;

    if (!currentVideoId || !currentTheme) {
      setError("Missing video context. Please start over.");
      return;
    }

    // Only process AI-source scenes that don't already have a successful image
    const scenesToGenerate = currentScenes.filter(
      (scene) => scene.imageSource === "ai" && scene.imageStatus !== "success"
    );

    if (scenesToGenerate.length === 0) return;

    // Mark pending scenes as loading
    scenesToGenerate.forEach((scene) => {
      setSceneImageStatus(scene.id, "loading");
    });

    // Fan-out: one request per scene (parallel, not batch — FR-014)
    const results = await Promise.allSettled(
      scenesToGenerate.map(async (scene) => {
        const response = await apiClient.post<GenerateImagesData>("/api/video/images", {
          scenes: [{ visualDescription: scene.visualDescription, sceneNumber: scene.order }],
          theme: currentTheme,
          videoId: currentVideoId,
        });
        return { scene, response };
      })
    );

    results.forEach((result) => {
      if (result.status === "rejected") {
        // Network-level failure — mark the scene as error
        // We can't know which scene failed from a rejected promise without re-mapping,
        // so we fall through; individual scenes were already marked loading and
        // will be left in "loading" if we don't resolve — mark all unresolved as error.
        return;
      }
      const { scene, response } = result.value;

      if (response.error || response.data.errorCount > 0) {
        setSceneImageStatus(scene.id, "error");
        return;
      }

      const firstResult = response.data.results[0];
      if (firstResult?.status === "success" && firstResult.output) {
        updateScene(scene.id, {
          imageUrl: firstResult.output.storageUrl,
          imageSource: "ai",
          imageStatus: "success",
        });
      } else {
        setSceneImageStatus(scene.id, "error");
      }
    });

    // Clean up any scenes still stuck in "loading" due to rejected promises
    useVideoStore.getState().scenes.forEach((scene) => {
      if (scene.imageStatus === "loading") {
        setSceneImageStatus(scene.id, "error");
      }
    });
  }, [setSceneImageStatus, updateScene]);

  // -------------------------------------------------------------------------
  // (e) submitVideoJob — POST /api/video/render
  // -------------------------------------------------------------------------
  const submitVideoJob = useCallback(async (): Promise<boolean> => {
    setError(null);
    const state = useVideoStore.getState();

    if (!state.videoId) {
      setError("Missing video ID. Please start over.");
      return false;
    }

    // F008: POST /api/video/render only needs videoId (wizard data already stored in video metadata)
    const response = await apiClient.post<{ videoId: string; status: string }>(
      "/api/video/render",
      { videoId: state.videoId }
    );

    if (response.error) {
      setError(getErrorMessage(response.error.code));
      return false;
    }

    return true;
  }, []);

  // -------------------------------------------------------------------------
  // (f) Composite: createVideoRecord + generateScript in one loading state
  // isGenerating is owned here with try/finally — guaranteed to reset on any
  // failure path including unhandled exceptions.
  // -------------------------------------------------------------------------
  const createAndGenerateScript = useCallback(async (): Promise<boolean> => {
    useVideoStore.setState({ isGenerating: true });
    try {
      const newVideoId = await createVideoRecord();
      if (!newVideoId) return false;
      return await generateScript(newVideoId);
    } catch {
      setError("An unexpected error occurred. Please try again.");
      return false;
    } finally {
      useVideoStore.setState({ isGenerating: false });
    }
  }, [createVideoRecord, generateScript]);

  return {
    error,
    setError,
    createAndGenerateScript,
    generateSceneImage,
    generateAllImages,
    submitVideoJob,
  };
}
