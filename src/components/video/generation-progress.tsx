"use client";
// F008: Generation progress component
// US1 base + US4 enhancements (T036, T037, T038) — labels, progress bar, countdown

import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useRenderPolling } from "@/hooks/use-render-polling";
import { useVideoStore } from "@/store/video-store";
import type { RenderStage } from "@/types/render";

const STAGES: RenderStage[] = ["audio", "sync", "render", "finalize"];

const STAGE_LABELS: Record<RenderStage, string> = {
  audio: "Generating voiceover",
  sync: "Synchronising audio & scenes",
  render: "Rendering video frames",
  finalize: "Packaging your video",
};

const STAGE_DESCRIPTIONS: Record<RenderStage, string> = {
  audio: "Creating the narration with your chosen voice",
  sync: "Aligning words to the right moments",
  render: "Compositing images, captions and transitions",
  finalize: "Uploading and preparing for playback",
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

  const progressPct = currentStage ? STAGE_PROGRESS[currentStage] : 2;
  const currentStageIdx = currentStage ? STAGES.indexOf(currentStage) : -1;

  if (status === "failed") {
    return (
      <div className="flex flex-col items-center gap-5 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-destructive/30 bg-destructive/10">
          <RotateCcw className="h-7 w-7 text-destructive" />
        </div>
        <div>
          <p className="font-heading font-semibold text-foreground">Rendering failed</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {renderError ?? "Your credit has been refunded. Please try again."}
          </p>
        </div>
        <Button
          onClick={() => {
            clearRenderState();
            setStep(4);
          }}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">
            {currentStage === "finalize" ? "Almost done…" : `~${countdown}s remaining`}
          </span>
          <span className="tabular-nums">{progressPct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Stage list */}
      <div className="space-y-2">
        {STAGES.map((stage, idx) => {
          const isActive = stage === currentStage;
          const isDone = currentStageIdx >= 0 && idx < currentStageIdx;
          const isPending = !isActive && !isDone;

          return (
            <div
              key={stage}
              className={[
                "flex items-start gap-4 rounded-xl px-4 py-3 transition-all duration-300",
                isActive
                  ? "border border-primary/20 bg-primary/5"
                  : isDone
                    ? "opacity-60"
                    : "opacity-30",
              ].join(" ")}
            >
              {/* Icon column */}
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" aria-hidden="true" />
                )}
              </div>

              {/* Text column */}
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold leading-none ${isActive ? "text-foreground" : "text-foreground/70"}`}>
                  {STAGE_LABELS[stage]}
                </p>
                {(isActive || isDone) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {STAGE_DESCRIPTIONS[stage]}
                  </p>
                )}
              </div>

              {/* Step number */}
              {!isPending && (
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground/60">
                  {idx + 1}/{STAGES.length}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
