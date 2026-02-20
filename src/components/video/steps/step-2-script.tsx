"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { SceneListSortable } from "@/components/video/scene-list-sortable";
import { apiClient } from "@/lib/api/client";
import { MAX_SCENES } from "@/lib/constants/video";
import { useVideoStore } from "@/store/video-store";

export function Step2Script() {
  const { scenes, addScene, setStep, videoId } = useVideoStore();
  const [isSaving, setIsSaving] = useState(false);

  const canAddScene = scenes.length < MAX_SCENES;
  const canAdvance = scenes.every((s) => s.narration.trim().length > 0);

  const handleBack = () => setStep(1);
  
  const handleNext = async () => {
    if (!canAdvance || !videoId) return;
    
    // Save scenes to database before advancing
    setIsSaving(true);
    try {
      const scenesForDb = scenes.map((scene) => ({
        id: scene.id,
        order: scene.order,
        narration: scene.narration,
        visualDescription: scene.visualDescription,
        imageUrl: scene.imageUrl,
        imageSource: scene.imageSource,
        duration: scene.duration,
        imageStatus: scene.imageStatus,
      }));

      await apiClient.patch(`/api/video/${videoId}`, {
        scenes: scenesForDb,
      });
      
      setStep(3);
    } catch (error) {
      console.error("Failed to save scenes:", error);
      // Still advance - data is in sessionStorage
      setStep(3);
    } finally {
      setIsSaving(false);
    }
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
        <Button onClick={handleNext} disabled={!canAdvance || isSaving}>
          {isSaving ? "Saving..." : "Next →"}
        </Button>
      </div>
    </div>
  );
}
