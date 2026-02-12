"use client";

import { useRouter } from "next/navigation";

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
import { useVideoStore } from "@/store/video-store";
import type { TransitionType } from "@/types/scene";

const TRANSITION_OPTIONS: { value: TransitionType; label: string }[] = [
  { value: "fade", label: "Fade" },
  { value: "crossfade", label: "Crossfade" },
];

export function Step4Settings() {
  const router = useRouter();
  const {
    prompt,
    scenes,
    selectedVoice,
    selectedTheme,
    captionStyle,
    transitionType,
    setTransitionType,
    setStep,
    reset,
  } = useVideoStore();

  const { canGenerate, creditsRemaining, isLoading: creditsLoading } = useCredits();
  const { submitVideoJob, error } = useVideoGeneration();

  const handleBack = () => setStep(3);

  const handleSubmit = async () => {
    const success = await submitVideoJob();
    if (success) {
      // Clear wizard state and draft (persist.clearStorage happens inside reset())
      reset();
      router.push("/dashboard");
    }
  };

  const captionStyleLabel =
    captionStyle === "word-by-word"
      ? "Word by Word"
      : captionStyle === "full-sentence"
        ? "Full Sentence"
        : "None";

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
              <a
                href="/billing"
                className="underline hover:no-underline font-medium"
              >
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
