/**
 * Main Remotion composition for ReelZero video generation.
 * F008: Plain Remotion component — NO "use client".
 * Used by both the browser <Player> and the Node.js renderer microservice.
 *
 * Implements both transition types:
 * - "fade": <Series> with <Fade> overlay for fade-to-black
 * - "crossfade": manual <Sequence> blocks with 15-frame overlap + <Crossfade>
 */

import { AbsoluteFill, Audio, Sequence, Series } from "remotion";

import { FullSentence } from "@/remotion/captions/FullSentence";
import { WordByWord } from "@/remotion/captions/WordByWord";
import { Scene } from "@/remotion/Scene";
import { Crossfade } from "@/remotion/transitions/Crossfade";
import { Fade } from "@/remotion/transitions/Fade";
import type { VideoCompositionProps } from "@/types/remotion";
import type { WordFrameTiming } from "@/types/render";

const CROSSFADE_FRAMES = 15; // 0.5s overlap at 30fps

/** Watermark overlay for free-tier users */
function Watermark() {
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "flex-end",
        padding: 24,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          opacity: 0.5,
          backgroundColor: "rgba(0,0,0,0.4)",
          borderRadius: 6,
          padding: "4px 10px",
        }}
      >
        <span style={{ color: "#fff", fontSize: 24, fontFamily: "sans-serif", fontWeight: 600 }}>
          ReelZero
        </span>
      </div>
    </AbsoluteFill>
  );
}

export function VideoComposition({
  audioUrl,
  scenes,
  captionStyle,
  transitionType,
  showWatermark,
}: VideoCompositionProps) {
  if (transitionType === "crossfade") {
    return <CrossfadeComposition {...{ audioUrl, scenes, captionStyle, showWatermark }} />;
  }
  return <FadeComposition {...{ audioUrl, scenes, captionStyle, showWatermark }} />;
}

// ── Fade (Series-based) composition ────────────────────────────────────────────

type CompositionInnerProps = Omit<VideoCompositionProps, "transitionType">;

function FadeComposition({ audioUrl, scenes, captionStyle, showWatermark }: CompositionInnerProps) {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Audio src={audioUrl} volume={1} />

      <Series>
        {scenes.map((scene, idx) => {
          // Convert global word timings to scene-local (0-based)
          const localWordTimings: WordFrameTiming[] = scene.wordTimings.map((wt) => ({
            word: wt.word,
            startFrame: wt.startFrame - scene.startFrame,
            endFrame: wt.endFrame - scene.startFrame,
          }));

          const narrationText = scene.wordTimings.map((wt) => wt.word).join(" ");

          return (
            <Series.Sequence
              key={scene.sceneNumber}
              durationInFrames={scene.durationInFrames}
              name={`Scene ${scene.sceneNumber}`}
            >
              <Scene
                src={scene.imageUrl}
                sceneIndex={idx}
                durationInFrames={scene.durationInFrames}
              />

              {/* Caption overlay */}
              {captionStyle === "word-by-word" && localWordTimings.length > 0 && (
                <WordByWord wordTimings={localWordTimings} />
              )}
              {captionStyle === "full-sentence" && (
                <FullSentence text={narrationText} />
              )}

              {/* Fade-to-black transition */}
              <Fade durationInFrames={scene.durationInFrames} />

              {/* Watermark */}
              {showWatermark && <Watermark />}
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
}

// ── Crossfade (manual Sequence) composition ────────────────────────────────────

function CrossfadeComposition({
  audioUrl,
  scenes,
  captionStyle,
  showWatermark,
}: CompositionInnerProps) {
  // Build sequence start frames with 15-frame overlap between adjacent scenes
  const sequenceFrames: { from: number; duration: number }[] = [];
  let cursor = 0;

  for (let idx = 0; idx < scenes.length; idx++) {
    const isFirst = idx === 0;
    const from = isFirst ? 0 : cursor - CROSSFADE_FRAMES;
    const duration = scenes[idx].durationInFrames + (isFirst ? 0 : CROSSFADE_FRAMES);
    sequenceFrames.push({ from, duration });
    cursor += scenes[idx].durationInFrames;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Audio src={audioUrl} volume={1} />

      {scenes.map((scene, idx) => {
        const { from, duration } = sequenceFrames[idx];

        // Convert global word timings to scene-local (0-based within this Sequence)
        const localWordTimings: WordFrameTiming[] = scene.wordTimings.map((wt) => ({
          word: wt.word,
          startFrame: wt.startFrame - scene.startFrame,
          endFrame: wt.endFrame - scene.startFrame,
        }));

        const narrationText = scene.wordTimings.map((wt) => wt.word).join(" ");

        return (
          <Sequence
            key={scene.sceneNumber}
            from={from}
            durationInFrames={duration}
            name={`Scene ${scene.sceneNumber}`}
          >
            <Scene
              src={scene.imageUrl}
              sceneIndex={idx}
              durationInFrames={duration}
            />

            {/* Crossfade overlay: fades in the incoming scene over first CROSSFADE_FRAMES */}
            {idx > 0 && <Crossfade durationInFrames={CROSSFADE_FRAMES} />}

            {/* Caption overlay */}
            {captionStyle === "word-by-word" && localWordTimings.length > 0 && (
              <WordByWord wordTimings={localWordTimings} />
            )}
            {captionStyle === "full-sentence" && (
              <FullSentence text={narrationText} />
            )}

            {/* Watermark */}
            {showWatermark && <Watermark />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
