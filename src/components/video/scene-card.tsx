"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MIN_SCENES } from "@/lib/constants/video";
import { useVideoStore } from "@/store/video-store";
import type { Scene } from "@/types/scene";

type SceneCardProps = {
  scene: Scene;
  index: number;
  totalScenes: number;
};

export function SceneCard({ scene, index, totalScenes }: SceneCardProps) {
  const { updateScene, removeScene } = useVideoStore();
  const canDelete = totalScenes > MIN_SCENES;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border bg-card p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground focus:outline-none"
            aria-label={`Drag to reorder scene ${index + 1}`}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-muted-foreground">
            Scene {index + 1}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => removeScene(scene.id)}
          disabled={!canDelete}
          aria-label={`Delete scene ${index + 1}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`narration-${scene.id}`}>Narration</Label>
        <Textarea
          id={`narration-${scene.id}`}
          value={scene.narration}
          onChange={(e) => updateScene(scene.id, { narration: e.target.value })}
          placeholder="What will be said in this scene…"
          rows={3}
          className="resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`visual-${scene.id}`}>Visual Description</Label>
        <Textarea
          id={`visual-${scene.id}`}
          value={scene.visualDescription}
          onChange={(e) =>
            updateScene(scene.id, { visualDescription: e.target.value })
          }
          placeholder="Describe what should appear visually…"
          rows={2}
          className="resize-none"
        />
      </div>
    </div>
  );
}
