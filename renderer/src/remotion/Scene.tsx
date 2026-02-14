/**
 * Scene component for Remotion VideoComposition.
 * F008: Plain Remotion component — NO "use client".
 * Runs in both browser <Player> and Node.js renderer.
 *
 * Renders a scene image with a Ken Burns (slow pan+zoom) effect.
 * Pan direction alternates per sceneIndex for visual variety.
 */

import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";

type SceneProps = {
  src: string;
  sceneIndex: number; // 0-based; used to alternate pan direction
  durationInFrames: number;
};

export function Scene({ src, sceneIndex, durationInFrames }: SceneProps) {
  const frame = useCurrentFrame();

  // Linear interpolation 0→1 over the full scene duration
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = 1 + progress * 0.08; // 1.0 → 1.08 (8% zoom)

  // Alternate pan direction: even scenes pan right+up, odd scenes pan left+down
  const isEven = sceneIndex % 2 === 0;
  const translateX = isEven ? progress * 4 : -(progress * 4); // ±4% of width
  const translateY = isEven ? -(progress * 2) : progress * 2; // ±2% of height

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translateX(${translateX}%) translateY(${translateY}%)`,
        }}
      />
    </AbsoluteFill>
  );
}
