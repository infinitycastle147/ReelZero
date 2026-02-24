"use client";
// F008: Video player component — renders completed video with Remotion <Player>.
// Accepts compositionProps built by the parent from Zustand store state.

import { Player } from "@remotion/player";
import { useEffect } from "react";

import { downloadFile } from "@/lib/utils";

import {
  VIDEO_FRAME_RATE,
  VIDEO_RESOLUTION_WIDTH,
  VIDEO_RESOLUTION_HEIGHT,
} from "@/lib/constants/video";
import { VideoComposition } from "@/remotion/VideoComposition";
import { useVideoStore } from "@/store/video-store";
import type { VideoCompositionProps } from "@/types/remotion";

type VideoPlayerProps = {
  videoId: string;
  videoUrl: string;
  compositionProps: VideoCompositionProps;
};

export function VideoPlayer(props: VideoPlayerProps) {
  const { videoUrl, compositionProps } = props;
  const { notifyGenerationComplete } = useVideoStore();

  // Trigger credit balance refresh on mount
  useEffect(() => {
    notifyGenerationComplete();
  }, [notifyGenerationComplete]);

  // Calculate total composition duration from scene data
  const totalDurationInFrames = compositionProps.scenes.reduce(
    (sum, scene) => sum + scene.durationInFrames,
    0
  ) || VIDEO_FRAME_RATE * 60; // fallback: 60s if no scenes

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
      <Player
        component={VideoComposition}
        durationInFrames={totalDurationInFrames}
        compositionWidth={VIDEO_RESOLUTION_WIDTH}
        compositionHeight={VIDEO_RESOLUTION_HEIGHT}
        fps={VIDEO_FRAME_RATE}
        inputProps={compositionProps}
        controls
        style={{ width: "100%", maxWidth: 400 }}
      />

      <button
        onClick={() => downloadFile(videoUrl, "video.mp4")}
        style={{
          display: "inline-block",
          padding: "0.6rem 1.5rem",
          background: "#000",
          color: "#fff",
          borderRadius: "6px",
          border: "none",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Download MP4
      </button>
    </div>
  );
}
