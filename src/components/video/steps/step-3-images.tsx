"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ImageSelector } from "@/components/video/image-selector";
import { useVideoGeneration } from "@/hooks/useVideoGeneration";
import { useVideoStore } from "@/store/video-store";

export function Step3Images() {
  const { scenes, setStep } = useVideoStore();
  const { generateAllImages, generateSceneImage, error } = useVideoGeneration();

  const allHaveImages = scenes.every((s) => s.imageUrl !== null);
  const anyLoading = scenes.some((s) => s.imageStatus === "loading");
  const anyError = scenes.some((s) => s.imageStatus === "error");
  const canAdvance = allHaveImages && !anyLoading;

  const handleBack = () => setStep(2);
  const handleNext = () => {
    if (canAdvance) setStep(4);
  };

  return (
    <div className="space-y-6">
      {/* Generate all AI images button — always visible so user can opt in to AI generation */}
      <Button
        onClick={generateAllImages}
        disabled={anyLoading}
        variant="outline"
        className="w-full"
      >
        {anyLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating images…
          </>
        ) : anyError ? (
          "Retry Failed AI Images"
        ) : (
          "Generate All Images with AI"
        )}
      </Button>

      {/* Hook-level error (e.g. missing context) */}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* Per-scene cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {scenes.map((scene, index) => (
          <div
            key={scene.id}
            className="overflow-hidden rounded-lg border bg-card"
          >
            {/* Scene label */}
            <div className="border-b px-3 py-2">
              <p className="text-sm font-medium">Scene {index + 1}</p>
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {scene.visualDescription || scene.narration || "No description"}
              </p>
            </div>

            {/* Per-scene loading overlay — replaces selector while generating */}
            <div className="p-3">
              {scene.imageStatus === "loading" ? (
                <div className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-2 rounded-lg bg-muted">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Generating…</p>
                </div>
              ) : (
                // ImageSelector always renders — shows AI image, error state with
                // upload fallback hint, or upload dropzone. User can always switch
                // to the Upload tab regardless of AI generation status.
                <ImageSelector
                  sceneId={scene.id}
                  sceneIndex={index}
                  onRetryAi={() => generateSceneImage(scene.id)}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="ghost" onClick={handleBack}>
          ← Back
        </Button>
        <Button onClick={handleNext} disabled={!canAdvance}>
          Next →
        </Button>
      </div>
    </div>
  );
}
