"use client";
// F008: Generation progress component
// US1 base + US4 enhancements (T036, T037, T038) — labels, progress bar, countdown

import { useEffect, useRef, useState } from "react";

import { useRenderPolling } from "@/hooks/use-render-polling";
import { useVideoStore } from "@/store/video-store";
import type { RenderStage } from "@/types/render";

const STAGES: RenderStage[] = ["audio", "sync", "render", "finalize"];

const STAGE_LABELS: Record<RenderStage, string> = {
  audio: "Generating voiceover",
  sync: "Synchronizing audio & scenes",
  render: "Rendering video",
  finalize: "Finalizing your video",
};

const STAGE_PROGRESS: Record<RenderStage | "completed", number> = {
  audio: 10,
  sync: 30,
  render: 70,
  finalize: 90,
  completed: 100,
};

type GenerationProgressProps = {
  videoId: string;
  onComplete: () => void;
};

export function GenerationProgress({ videoId, onComplete }: GenerationProgressProps) {
  const { renderError, clearRenderState, setStep } = useVideoStore();
  const pollResult = useRenderPolling(videoId, true);
  // T038: Countdown timer — decrements by 3 on each poll response
  const [countdown, setCountdown] = useState<number>(80);
  const pollCountRef = useRef<number>(0);
  // Track whether onComplete has already been called
  const completedRef = useRef<boolean>(false);

  const currentStage = pollResult?.currentStage ?? null;
  const status = pollResult?.status ?? "processing";

  // Decrement countdown on each new poll response
  useEffect(() => {
    if (pollResult) {
      pollCountRef.current += 1;
      const decremented = 80 - pollCountRef.current * 3;
      setCountdown(Math.max(decremented, 5));
    }
  }, [pollResult]);

  // Notify parent when completed (only once)
  useEffect(() => {
    if (status === "completed" && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [status, onComplete]);

  if (status === "completed") {
    return null;
  }

  const progressPct = currentStage ? STAGE_PROGRESS[currentStage] : 0;

  if (status === "failed") {
    return (
      <div className="space-y-4 text-center py-8">
        <p className="text-destructive font-medium">
          {renderError ?? "Video rendering failed — your credit has been refunded"}
        </p>
        <button
          onClick={() => {
            clearRenderState();
            setStep(4);
          }}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    );
  }

  const currentStageIdx = currentStage ? STAGES.indexOf(currentStage) : -1;

  return (
    <div className="space-y-6 py-4">
      {/* T038: Countdown */}
      <div className="text-center">
        <p className="text-muted-foreground text-sm">
          {currentStage === "finalize"
            ? "Almost done…"
            : `~${countdown} seconds remaining`}
        </p>
      </div>

      {/* T037: Progress bar */}
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full"
          style={{
            width: `${progressPct}%`,
            transition: "width 0.5s ease-out",
          }}
        />
      </div>

      {/* T036: Stage list with spinner / checkmarks */}
      <div className="space-y-2">
        {STAGES.map((stage, idx) => {
          const isActive = stage === currentStage;
          const isDone = currentStageIdx >= 0 && idx < currentStageIdx;
          const isPending = !isActive && !isDone;

          return (
            <div
              key={stage}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isDone
                    ? "bg-muted text-muted-foreground"
                    : "text-muted-foreground/40"
              }`}
            >
              {/* Icon */}
              <span className="w-5 text-center text-base">
                {isDone ? "✓" : isActive ? "⟳" : "○"}
              </span>
              {/* Label */}
              <span className="text-sm font-medium flex-1">{STAGE_LABELS[stage]}</span>
              {/* Step number */}
              {!isPending && (
                <span className="text-xs opacity-60">
                  Step {idx + 1} of {STAGES.length}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
