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
  GENERATION_IMAGE_FAILED: "Image generation failed for this scene.",
  RENDER_SERVICE_UNAVAILABLE:
    "Video generation is temporarily unavailable. Please try again shortly.",
  VALIDATION_INVALID_INPUT: "Please check your inputs and try again.",
  AUTH_UNAUTHORIZED: "Your session has expired. Please sign in again.",
};

function getErrorMessage(code: string | undefined): string {
  if (!code) return "An unexpected error occurred. Please try again.";
  return ERROR_MESSAGES[code] ?? "An unexpected error occurred. Please try again.";
}

// ---------------------------------------------------------------------------
// Response shapes
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
    useVideoStore.setState({ isGenerating: true });

    const response = await apiClient.post<CreateVideoData>("/api/video", {
      prompt,
      theme: selectedTheme,
      voice: selectedVoice,
      captionStyle,
    });

    if (response.error) {
      useVideoStore.setState({ isGenerating: false });
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
      // isGenerating already true from createVideoRecord
      const response = await apiClient.post<GenerateScriptData>("/api/video/generate", {
        prompt,
        theme: selectedTheme,
        videoId: currentVideoId,
      });

      useVideoStore.setState({ isGenerating: false });

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
  // (c) generateAllImages — fan-out per-scene, Promise.allSettled
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

    // Mark all AI-mode scenes as loading
    currentScenes.forEach((scene) => {
      if (scene.imageSource === "ai") {
        setSceneImageStatus(scene.id, "loading");
      }
    });

    // Fan-out: one request per scene (parallel, not batch — FR-014)
    const results = await Promise.allSettled(
      currentScenes
        .filter((scene) => scene.imageSource === "ai")
        .map(async (scene) => {
          const response = await apiClient.post<GenerateImagesData>(
            "/api/video/images",
            {
              scenes: [
                {
                  visualDescription: scene.visualDescription,
                  sceneNumber: scene.order,
                },
              ],
              theme: currentTheme,
              videoId: currentVideoId,
            }
          );

          return { scene, response };
        })
    );

    results.forEach((result) => {
      if (result.status === "rejected") return;
      const { scene, response } = result.value;

      if (response.error || response.data.errorCount > 0) {
        setSceneImageStatus(scene.id, "error");
        return;
      }

      const firstResult = response.data.results[0];
      if (firstResult?.status === "success" && firstResult.output) {
        updateScene(scene.id, {
          imageUrl: firstResult.output.storageUrl,
          imageStatus: "success",
        });
      } else {
        setSceneImageStatus(scene.id, "error");
      }
    });
  }, [setSceneImageStatus, updateScene]);

  // -------------------------------------------------------------------------
  // (d) submitVideoJob — POST /api/video/render
  // -------------------------------------------------------------------------
  const submitVideoJob = useCallback(async (): Promise<boolean> => {
    setError(null);
    const state = useVideoStore.getState();

    if (!state.videoId) {
      setError("Missing video ID. Please start over.");
      return false;
    }

    const response = await apiClient.post<{ videoId: string; status: string }>(
      "/api/video/render",
      {
        videoId: state.videoId,
        scenes: state.scenes.map((s) => ({
          order: s.order,
          narration: s.narration,
          visualDescription: s.visualDescription,
          imageUrl: s.imageUrl,
          imageSource: s.imageSource,
          duration: s.duration,
        })),
        voice: state.selectedVoice,
        theme: state.selectedTheme,
        captionStyle: state.captionStyle,
        transitionType: state.transitionType,
      }
    );

    if (response.error) {
      setError(getErrorMessage(response.error.code));
      return false;
    }

    return true;
  }, []);

  // -------------------------------------------------------------------------
  // Composite: createVideoRecord + generateScript in one loading state
  // -------------------------------------------------------------------------
  const createAndGenerateScript = useCallback(async (): Promise<boolean> => {
    const newVideoId = await createVideoRecord();
    if (!newVideoId) return false;
    return generateScript(newVideoId);
  }, [createVideoRecord, generateScript]);

  return {
    error,
    setError,
    createAndGenerateScript,
    generateAllImages,
    submitVideoJob,
  };
}
