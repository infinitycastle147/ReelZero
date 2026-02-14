/**
 * Word-by-word caption component for Remotion.
 * F008: Plain Remotion component — NO "use client".
 *
 * Renders each word with a 2-frame pop-in animation at its scene-local startFrame.
 * IMPORTANT: wordTimings values must be SCENE-LOCAL (0-based).
 * VideoComposition subtracts scene.startFrame before passing props here.
 */

import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

import type { WordFrameTiming } from "@/types/render";

type WordByWordProps = {
  wordTimings: WordFrameTiming[]; // scene-local frames (startFrame 0-based from scene start)
};

export function WordByWord({ wordTimings }: WordByWordProps) {
  const frame = useCurrentFrame();

  // Find the current active word: the last word whose startFrame <= frame
  const activeWordIndex = wordTimings.reduce<number>((lastActive, wt, idx) => {
    if (wt.startFrame <= frame) return idx;
    return lastActive;
  }, -1);

  if (activeWordIndex === -1) return null;

  const activeWord = wordTimings[activeWordIndex];

  // 2-frame pop-in: opacity 0→1 over [startFrame-2, startFrame+2]
  const opacity = interpolate(
    frame,
    [activeWord.startFrame - 2, activeWord.startFrame + 2],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 120,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          opacity,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          borderRadius: 8,
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: 8,
          paddingBottom: 8,
          maxWidth: "80%",
          textAlign: "center",
        }}
      >
        <span
          style={{
            color: "#fff",
            fontSize: 48,
            fontWeight: 700,
            fontFamily: "sans-serif",
            lineHeight: 1.2,
          }}
        >
          {activeWord.word}
        </span>
      </div>
    </AbsoluteFill>
  );
}
