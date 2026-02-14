/**
 * Crossfade transition overlay for Remotion.
 * F008: Plain Remotion component — NO "use client".
 *
 * Renders an overlay that fades from fully transparent (new scene not visible)
 * to fully opaque at the END of the overlap window. Used at the START of each
 * overlapping <Sequence> to create a crossfade effect.
 *
 * Usage in VideoComposition (crossfade mode):
 *   <Sequence from={prevStartFrame + prevDuration - 15} durationInFrames={curDuration + 15}>
 *     <Scene ... />
 *     <Crossfade durationInFrames={15} />
 *   </Sequence>
 *
 * The incoming scene fades IN over the first `durationInFrames` frames of its sequence.
 */

import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

type CrossfadeProps = {
  durationInFrames: number; // Number of overlap frames (typically 15)
};

export function Crossfade({ durationInFrames }: CrossfadeProps) {
  const frame = useCurrentFrame();

  // Incoming scene: opacity goes 0→1 over the overlap window
  const opacity = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // We actually want the scene to show (opacity 1) and this overlay to be invisible
  // The Crossfade component is NOT needed — the scene itself fades in naturally.
  // Instead, render a white (or neutral) overlay that fades OUT to reveal the scene.
  const overlayOpacity = 1 - opacity; // 1→0: overlay disappears as scene fades in

  if (overlayOpacity <= 0) return null;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        opacity: overlayOpacity,
      }}
    />
  );
}
