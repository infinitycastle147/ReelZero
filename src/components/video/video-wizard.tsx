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
      <Skeleton className="h-8 w-full rounded-full" />
      <Skeleton className="h-48 w-full rounded-lg" />
      <div className="flex gap-3">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
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
    return <WizardSkeleton />;
  }

  const StepComponent = STEP_COMPONENTS[currentStep] ?? Step1Input;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Step progress indicator */}
      <WizardStepIndicator currentStep={currentStep} />

      {/* Start Over */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          Start Over
        </Button>
      </div>

      {/* Active step content */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <StepComponent />
      </div>
    </div>
  );
}
