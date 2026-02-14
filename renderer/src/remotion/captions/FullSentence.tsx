/**
 * Full-sentence caption component for Remotion.
 * F008: Plain Remotion component — NO "use client".
 *
 * Renders the complete scene narration text as a static overlay
 * for the entire scene duration. No frame-gating — visible from frame 0.
 */

import { AbsoluteFill } from "remotion";

type FullSentenceProps = {
  text: string; // Full narration text for the scene
};

export function FullSentence({ text }: FullSentenceProps) {
  if (!text) return null;

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
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          borderRadius: 8,
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 12,
          paddingBottom: 12,
          maxWidth: "85%",
          textAlign: "center",
        }}
      >
        <span
          style={{
            color: "#fff",
            fontSize: 40,
            fontWeight: 600,
            fontFamily: "sans-serif",
            lineHeight: 1.4,
          }}
        >
          {text}
        </span>
      </div>
    </AbsoluteFill>
  );
}
