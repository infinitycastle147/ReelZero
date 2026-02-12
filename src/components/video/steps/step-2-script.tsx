"use client";

import { Button } from "@/components/ui/button";
import { SceneListSortable } from "@/components/video/scene-list-sortable";
import { MAX_SCENES } from "@/lib/constants/video";
import { useVideoStore } from "@/store/video-store";

export function Step2Script() {
  const { scenes, addScene, setStep } = useVideoStore();

  const canAddScene = scenes.length < MAX_SCENES;
  const canAdvance = scenes.every((s) => s.narration.trim().length > 0);

  const handleBack = () => setStep(1);
  const handleNext = () => {
    if (canAdvance) setStep(3);
  };

  return (
    <div className="space-y-6">
      {/* Sortable scene list with drag-to-reorder (US2) */}
      <SceneListSortable />

      {/* Add scene */}
      <Button
        variant="outline"
        onClick={addScene}
        disabled={!canAddScene}
        className="w-full"
        aria-label="Add a new scene"
      >
        + Add Scene{!canAddScene && ` (max ${MAX_SCENES})`}
      </Button>

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
