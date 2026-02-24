"use client";

import { ImageIcon, Loader2, Sparkles } from "lucide-react";

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
      {/* Generate all button */}
      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">AI Image Generation</p>
            <p className="text-xs text-muted-foreground">
              {anyError
                ? "Some images failed — retry below."
                : "Generate all scene images with one click, or upload your own."}
            </p>
          </div>
          <Button
            onClick={generateAllImages}
            disabled={anyLoading}
            size="sm"
            variant={anyError ? "destructive" : "default"}
            className="shrink-0 gap-1.5"
          >
            {anyLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating…
              </>
            ) : anyError ? (
              "Retry Failed"
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Generate All
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Hook-level error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
          <p className="text-sm text-destructive" role="alert">{error}</p>
        </div>
      )}

      {/* Per-scene cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {scenes.map((scene, index) => (
          <div
            key={scene.id}
            className="overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Scene header */}
            <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <p className="truncate text-xs text-muted-foreground">
                  {scene.visualDescription || scene.narration || "No description"}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 shrink-0 gap-1 px-2 text-xs"
                disabled={scene.imageStatus === "loading"}
                onClick={() => generateSceneImage(scene.id)}
                title="Generate image for this scene with AI"
              >
                {scene.imageStatus === "loading" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" />
                    {scene.imageUrl ? "Redo" : "AI"}
                  </>
                )}
              </Button>
            </div>

            {/* Image area */}
            <div className="p-3">
              {scene.imageStatus === "loading" ? (
                <div className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-3 rounded-xl bg-muted">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Generating image…</p>
                </div>
              ) : (
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
        <Button onClick={handleNext} disabled={!canAdvance} className="gap-2">
          {canAdvance ? (
            <>
              Next →
            </>
          ) : (
            <>
              <ImageIcon className="h-4 w-4" />
              Add all images to continue
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
