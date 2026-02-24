"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Layers,
  Mic2,
  Palette,
  Play,
  Subtitles,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCredits } from "@/hooks/useCredits";
import { useVideoGeneration } from "@/hooks/useVideoGeneration";
import { apiClient } from "@/lib/api/client";
import { useVideoStore } from "@/store/video-store";
import type { TransitionType } from "@/types/scene";

const TRANSITION_OPTIONS: { value: TransitionType; label: string; description: string }[] = [
  { value: "fade", label: "Fade", description: "Smooth black fade" },
  { value: "crossfade", label: "Crossfade", description: "Blend between scenes" },
];

type ProcessingVideoData = { videoId: string | null; status: string | null };

export function Step4Settings() {
  const {
    prompt,
    scenes,
    selectedVoice,
    selectedTheme,
    captionStyle,
    transitionType,
    setTransitionType,
    setStep,
    setVideoId,
    reset,
  } = useVideoStore();

  const { canGenerate, creditsRemaining, isLoading: creditsLoading } = useCredits();
  const { submitVideoJob, error } = useVideoGeneration();

  const [processingVideoId, setProcessingVideoId] = useState<string | null>(null);
  const [checkingProcessing, setCheckingProcessing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function checkProcessing() {
      const response = await apiClient.get<ProcessingVideoData>("/api/video/render");
      if (!cancelled && !response.error && response.data.videoId) {
        setProcessingVideoId(response.data.videoId);
      }
      if (!cancelled) setCheckingProcessing(false);
    }
    void checkProcessing();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleResumeProgress = () => {
    if (processingVideoId) {
      setVideoId(processingVideoId);
      setStep(5);
    }
  };

  const [discarding, setDiscarding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartFresh = async () => {
    if (!processingVideoId) {
      reset();
      return;
    }
    setDiscarding(true);
    try {
      await apiClient.post("/api/video/render/discard", { videoId: processingVideoId });
    } catch {
      // Best-effort
    }
    setProcessingVideoId(null);
    reset();
    setDiscarding(false);
  };

  const handleBack = () => setStep(3);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const success = await submitVideoJob();
      if (success) {
        setStep(5);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const captionStyleLabel =
    captionStyle === "word-by-word"
      ? "Word by Word"
      : captionStyle === "full-sentence"
        ? "Full Sentence"
        : "None";

  if (checkingProcessing) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Checking generation status…
        </div>
      </div>
    );
  }

  if (processingVideoId) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                A video is already generating
              </h3>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                You can only render one video at a time. Resume the existing job or discard it to start fresh.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="flex-1 gap-2" onClick={handleResumeProgress}>
            <Play className="h-4 w-4" />
            Resume Progress
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleStartFresh} disabled={discarding}>
            {discarding ? "Discarding…" : "Discard & Start Fresh"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Transition picker */}
      <div className="space-y-2.5">
        <Label className="text-sm font-semibold">Transition Style</Label>
        <div className="grid grid-cols-2 gap-2">
          {TRANSITION_OPTIONS.map((t) => {
            const isSelected = transitionType === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTransitionType(t.value as TransitionType)}
                className={[
                  "flex flex-col items-start gap-0.5 rounded-xl border-2 px-4 py-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-primary/40 hover:bg-accent/50",
                ].join(" ")}
              >
                <span className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>
                  {t.label}
                </span>
                <span className="text-xs text-muted-foreground">{t.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-xl border bg-muted/20 p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Video Summary
        </h3>
        <div className="space-y-2.5">
          {[
            {
              icon: Zap,
              label: "Topic",
              value: prompt.length > 60 ? prompt.substring(0, 60) + "…" : prompt,
            },
            { icon: Layers, label: "Scenes", value: `${scenes.length} scene${scenes.length !== 1 ? "s" : ""}` },
            { icon: Mic2, label: "Voice", value: selectedVoice ?? "—" },
            { icon: Palette, label: "Theme", value: selectedTheme ? selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1) : "—" },
            { icon: Subtitles, label: "Captions", value: captionStyleLabel },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex flex-1 items-baseline justify-between gap-2 min-w-0">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="truncate text-sm font-medium text-foreground">{value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Credit status */}
      {!creditsLoading && (
        <div className={[
          "flex items-center gap-3 rounded-xl border px-4 py-3",
          canGenerate
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50"
            : "border-destructive/30 bg-destructive/5",
        ].join(" ")}>
          {canGenerate ? (
            <>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                <span className="font-semibold">{creditsRemaining} credit{creditsRemaining !== 1 ? "s" : ""}</span>
                {" "}remaining — 1 will be used for this video.
              </p>
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">
                No credits remaining.{" "}
                <a href="/billing" className="font-semibold underline hover:no-underline">
                  Upgrade your plan
                </a>{" "}
                to continue.
              </p>
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
          <p className="text-sm text-destructive" role="alert">{error}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="ghost" onClick={handleBack}>
          ← Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canGenerate || creditsLoading || isSubmitting}
          className="gap-2"
        >
          {isSubmitting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {isSubmitting ? "Starting…" : "Generate Video"}
        </Button>
      </div>
    </div>
  );
}
