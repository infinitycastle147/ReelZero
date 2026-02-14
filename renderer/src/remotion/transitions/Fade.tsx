/**
 * Fade-to-black transition overlay for Remotion.
 * F008: Plain Remotion component — NO "use client".
 *
 * Renders a black overlay that fades in over the last FADE_FRAMES frames
 * of a scene sequence. Place inside <Series.Sequence> after <Scene>.
 */

import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

const FADE_FRAMES = 15; // 0.5s at 30fps

type FadeProps = {
  durationInFrames: number;
};

export function Fade({ durationInFrames }: FadeProps) {
  const frame = useCurrentFrame();

  // Fade starts FADE_FRAMES before the end of the sequence
  const fadeStartFrame = Math.max(0, durationInFrames - FADE_FRAMES);

  const opacity = interpolate(
    frame,
    [fadeStartFrame, durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  if (opacity <= 0) return null;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        opacity,
      }}
    />
  );
}
