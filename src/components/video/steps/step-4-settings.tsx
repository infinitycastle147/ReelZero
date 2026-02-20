"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCredits } from "@/hooks/useCredits";
import { useVideoGeneration } from "@/hooks/useVideoGeneration";
import { apiClient } from "@/lib/api/client";
import { useVideoStore } from "@/store/video-store";
import type { TransitionType } from "@/types/scene";

const TRANSITION_OPTIONS: { value: TransitionType; label: string }[] = [
  { value: "fade", label: "Fade" },
  { value: "crossfade", label: "Crossfade" },
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

  // Check if the user already has a render in flight from a previous/current session
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

  const handleStartFresh = async () => {
    if (!processingVideoId) {
      reset();
      return;
    }

    setDiscarding(true);
    try {
      // Mark the stuck processing video as failed in the DB so the concurrent guard clears
      await apiClient.post("/api/video/render/discard", { videoId: processingVideoId });
    } catch {
      // Best-effort — even if this fails, reset local state so user can retry
    }
    setProcessingVideoId(null);
    reset();
    setDiscarding(false);
  };

  const handleBack = () => setStep(3);

  const handleSubmit = async () => {
    const success = await submitVideoJob();
    if (success) {
      setStep(5);
    }
  };

  const captionStyleLabel =
    captionStyle === "word-by-word"
      ? "Word by Word"
      : captionStyle === "full-sentence"
        ? "Full Sentence"
        : "None";

  // Show the in-progress banner instead of the normal UI while we're still checking
  // or when we've confirmed a render is already running
  if (checkingProcessing) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Checking generation status…</p>
      </div>
    );
  }

  if (processingVideoId) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            A video is already being generated
          </h3>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
            You can only generate one video at a time. Watch its progress or discard it and start
            fresh.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="flex-1" onClick={handleResumeProgress}>
            Watch Progress
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
      <div className="space-y-2">
        <Label htmlFor="transition">Transition Style</Label>
        <Select
          value={transitionType}
          onValueChange={(val) => setTransitionType(val as TransitionType)}
        >
          <SelectTrigger id="transition" className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSITION_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Summary */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Summary</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Topic</dt>
          <dd className="truncate font-medium">
            {prompt.substring(0, 60)}
            {prompt.length > 60 ? "…" : ""}
          </dd>

          <dt className="text-muted-foreground">Scenes</dt>
          <dd className="font-medium">{scenes.length}</dd>

          <dt className="text-muted-foreground">Voice</dt>
          <dd className="font-medium">{selectedVoice ?? "—"}</dd>

          <dt className="text-muted-foreground">Theme</dt>
          <dd className="font-medium capitalize">{selectedTheme ?? "—"}</dd>

          <dt className="text-muted-foreground">Transition</dt>
          <dd className="font-medium capitalize">{transitionType}</dd>

          <dt className="text-muted-foreground">Captions</dt>
          <dd className="font-medium">{captionStyleLabel}</dd>
        </dl>
      </div>

      <Separator />

      {/* Credit status */}
      {!creditsLoading && (
        <div className="rounded-lg border bg-muted/40 p-4">
          {canGenerate ? (
            <p className="text-sm text-muted-foreground">
              You have{" "}
              <span className="font-semibold text-foreground">
                {creditsRemaining} credit{creditsRemaining !== 1 ? "s" : ""}
              </span>{" "}
              remaining. 1 credit will be used.
            </p>
          ) : (
            <p className="text-sm text-destructive">
              You have no credits remaining.{" "}
              <a href="/billing" className="font-medium underline hover:no-underline">
                Upgrade your plan
              </a>{" "}
              to continue.
            </p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="ghost" onClick={handleBack}>
          ← Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canGenerate || creditsLoading}
          aria-disabled={!canGenerate}
        >
          Generate Video
        </Button>
      </div>
    </div>
  );
}
