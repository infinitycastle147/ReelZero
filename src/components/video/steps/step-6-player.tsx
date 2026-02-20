"use client";
// F008: Step 6 — Video Player
// Shown after render completes. Displays the finished video with download.

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useRenderPolling } from "@/hooks/use-render-polling";
import { useVideoStore } from "@/store/video-store";

export function Step6Player() {
  const { videoId, notifyGenerationComplete } = useVideoStore();

  // Poll for render completion and get the video URL
  const pollResult = useRenderPolling(videoId, videoId !== null);

  // Notify store so credit display refreshes
  useEffect(() => {
    if (pollResult?.videoUrl) {
      notifyGenerationComplete();
    }
  }, [pollResult?.videoUrl, notifyGenerationComplete]);

  if (!videoId || !pollResult?.videoUrl) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <p>Loading video…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Your Video Is Ready!</h2>
      {/* Use a native <video> element — the rendered MP4 has audio baked in.
          Remotion Player is not used here because it re-renders the composition
          (including <Audio src="">) which throws an Html5Audio error. */}
      <video
        src={pollResult.videoUrl}
        controls
        playsInline
        className="w-full max-w-sm mx-auto rounded-lg border bg-black"
        style={{ aspectRatio: "9/16" }}
      />
      <div className="flex justify-center">
        <Button asChild>
          <a href={pollResult.videoUrl} download="video.mp4">
            Download MP4
          </a>
        </Button>
      </div>
    </div>
  );
}
