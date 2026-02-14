"use client";
// F008: Step 6 — Video Player
// Shown after render completes. Displays the finished video with download.

import { VideoPlayer } from "@/components/video/video-player";
import { useRenderPolling } from "@/hooks/use-render-polling";
import { useVideoStore } from "@/store/video-store";
import type { VideoCompositionProps } from "@/types/remotion";

export function Step6Player() {
  const {
    videoId,
    captionStyle,
    transitionType,
  } = useVideoStore();

  // Get the latest status (for videoUrl)
  const pollResult = useRenderPolling(videoId, videoId !== null);

  if (!videoId || !pollResult?.videoUrl) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <p>Loading video…</p>
      </div>
    );
  }

  // Build composition props from store state + render data
  const compositionProps: VideoCompositionProps = {
    audioUrl: "", // Audio is embedded in the rendered MP4; not needed for Player playback of the mp4
    scenes: [], // The rendered MP4 is played directly — scenes/timing not needed here
    captionStyle,
    transitionType,
    showWatermark: false,
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Your Video Is Ready!</h2>
      <VideoPlayer
        videoId={videoId}
        videoUrl={pollResult.videoUrl}
        compositionProps={compositionProps}
      />
    </div>
  );
}
