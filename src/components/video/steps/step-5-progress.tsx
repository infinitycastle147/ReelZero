"use client";
// F008: Step 5 — Generation Progress
// Shown after user triggers "Generate Video" from Step 4.
// Transitions to Step 6 (VideoPlayer) when render completes.

import { GenerationProgress } from "@/components/video/generation-progress";
import { useVideoStore } from "@/store/video-store";

export function Step5Progress() {
  const { videoId, setStep } = useVideoStore();

  if (!videoId) {
    // Should not happen — Step 4 only advances here after setting videoId
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <p>No video in progress. Please start over.</p>
      </div>
    );
  }

  const handleComplete = () => {
    setStep(6);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Generating Your Video</h2>
      <GenerationProgress videoId={videoId} onComplete={handleComplete} />
    </div>
  );
}
