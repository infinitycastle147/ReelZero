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
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Card header */}
      <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5 rounded-t-xl">
        <div className="flex items-center gap-3">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground focus:outline-none active:cursor-grabbing"
            aria-label={`Drag to reorder scene ${index + 1}`}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          {/* Scene badge */}
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {index + 1}
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Scene
            </span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground/40 hover:text-destructive"
          onClick={() => removeScene(scene.id)}
          disabled={!canDelete}
          aria-label={`Delete scene ${index + 1}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Card body */}
      <div className="space-y-3 p-4">
        <div className="space-y-1.5">
          <Label htmlFor={`narration-${scene.id}`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Narration
          </Label>
          <Textarea
            id={`narration-${scene.id}`}
            value={scene.narration}
            onChange={(e) => updateScene(scene.id, { narration: e.target.value })}
            placeholder="What will be said in this scene…"
            rows={3}
            className="resize-none text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`visual-${scene.id}`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Visual Description
          </Label>
          <Textarea
            id={`visual-${scene.id}`}
            value={scene.visualDescription}
            onChange={(e) =>
              updateScene(scene.id, { visualDescription: e.target.value })
            }
            placeholder="Describe what should appear visually…"
            rows={2}
            className="resize-none text-sm"
          />
        </div>
      </div>
    </div>
  );
}
