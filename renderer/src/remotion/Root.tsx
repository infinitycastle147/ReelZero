/**
 * Remotion root file — registers compositions for the renderer microservice.
 * F008: Used by ReelZero-Renderer for server-side bundling.
 *
 * NOTE: When using <Player> in the main app, import VideoComposition directly.
 * This file is only needed by the renderer bundler entry point.
 */

import { Composition, registerRoot } from "remotion";

import {
  VIDEO_FRAME_RATE,
  VIDEO_RESOLUTION_WIDTH,
  VIDEO_RESOLUTION_HEIGHT,
} from "@/lib/constants/video";
import { VideoComposition } from "@/remotion/VideoComposition";
import type { VideoCompositionProps } from "@/types/remotion";

// 60 seconds at 30fps = 1800 frames (maximum composition duration)
const MAX_DURATION_FRAMES = 1800;

const defaultProps: VideoCompositionProps = {
  audioUrl: "",
  scenes: [],
  captionStyle: "none",
  transitionType: "fade",
  showWatermark: false,
};

export function RemotionRoot() {
  return (
    <Composition
      id="VideoComposition"
      component={VideoComposition}
      durationInFrames={MAX_DURATION_FRAMES}
      width={VIDEO_RESOLUTION_WIDTH}
      height={VIDEO_RESOLUTION_HEIGHT}
      fps={VIDEO_FRAME_RATE}
      defaultProps={defaultProps}
    />
  );
}

registerRoot(RemotionRoot);
