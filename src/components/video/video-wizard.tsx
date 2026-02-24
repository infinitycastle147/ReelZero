"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Step1Input } from "@/components/video/steps/step-1-input";
import { Step2Script } from "@/components/video/steps/step-2-script";
import { Step3Images } from "@/components/video/steps/step-3-images";
import { Step4Settings } from "@/components/video/steps/step-4-settings";
import { Step5Progress } from "@/components/video/steps/step-5-progress";
import { Step6Player } from "@/components/video/steps/step-6-player";
import { WizardStepIndicator } from "@/components/video/wizard-step-indicator";
import { apiClient } from "@/lib/api/client";
import type { Video } from "@/lib/db/schema";
import { useVideoStore } from "@/store/video-store";
import type { VideoDbMetadata } from "@/types/video";

// SSR hydration guard — renders a skeleton until sessionStorage has been
// rehydrated by the Zustand persist middleware (T025).
function WizardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading wizard…">
      <Skeleton className="h-10 w-full rounded-full" />
      <div className="h-px w-full bg-border" />
      <Skeleton className="h-52 w-full rounded-xl" />
      <div className="flex gap-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>
    </div>
  );
}

const STEP_COMPONENTS: Record<number, () => React.JSX.Element> = {
  1: Step1Input,
  2: Step2Script,
  3: Step3Images,
  4: Step4Settings,
  5: Step5Progress,
  6: Step6Player,
};

const STEP_TITLES: Record<number, { title: string; subtitle: string }> = {
  1: { title: "Describe your video", subtitle: "Tell us the idea — we'll handle the rest." },
  2: { title: "Review your script", subtitle: "Edit narration and reorder scenes to your liking." },
  3: { title: "Choose your visuals", subtitle: "Generate AI images or upload your own for each scene." },
  4: { title: "Final settings", subtitle: "Review everything before we start rendering." },
  5: { title: "Creating your video", subtitle: "Sit tight — this takes about a minute." },
  6: { title: "Your video is ready", subtitle: "Download or share your creation." },
};

export function VideoWizard() {
  const { currentStep, _hasHydrated, reset, setHasHydrated, prefillFromVideo } = useVideoStore();
  const searchParams = useSearchParams();
  const prefillAttemptedRef = useRef(false);

  // Safety net: if onRehydrateStorage didn't fire (e.g. sessionStorage blocked),
  // set _hasHydrated = true after first client render so the wizard isn't stuck
  // on the skeleton forever.
  useEffect(() => {
    if (!_hasHydrated) {
      setHasHydrated(true);
    }
    // Only run once on mount — intentional empty-after-check deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // F009: T030a — Pre-fill wizard from a previous video when ?regenerateFrom={id} is present.
  // Fetches video data once after hydration; only prefills when wizard is at step 1 (fresh).
  useEffect(() => {
    const regenerateFrom = searchParams.get("regenerateFrom");
    if (!regenerateFrom || !_hasHydrated || prefillAttemptedRef.current) return;
    prefillAttemptedRef.current = true;

    void (async () => {
      const result = await apiClient.get<Video>(`/api/videos/${regenerateFrom}`);
      if (result.error) return; // silently skip if video not found
      const video = result.data;
      const meta = video.metadata as VideoDbMetadata;
      prefillFromVideo({
        prompt: video.prompt,
        voice: meta.voice,
        theme: meta.theme,
        captionStyle: (meta.captionStyle as "word-by-word" | "full-sentence" | "none" | undefined),
        transitionType: (meta.transitionType as "fade" | "crossfade" | undefined),
      });
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated]);

  // Block render until sessionStorage has been rehydrated
  if (!_hasHydrated) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <WizardSkeleton />
      </div>
    );
  }

  const StepComponent = STEP_COMPONENTS[currentStep] ?? Step1Input;
  const stepMeta = STEP_TITLES[currentStep] ?? STEP_TITLES[1];
  const showStepIndicator = currentStep <= 4;
  const showStartOver = currentStep <= 4;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      {/* Step progress indicator */}
      {showStepIndicator && (
        <WizardStepIndicator currentStep={currentStep} />
      )}

      {/* Step context header + Start Over */}
      <div className="flex items-start justify-between gap-4 pt-1">
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-bold leading-tight tracking-tight text-foreground">
            {stepMeta.title}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{stepMeta.subtitle}</p>
        </div>
        {showStartOver && (
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
          >
            Start Over
          </Button>
        )}
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-border" />

      {/* Active step content */}
      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="p-6">
          <StepComponent />
        </div>
      </div>
    </div>
  );
}
