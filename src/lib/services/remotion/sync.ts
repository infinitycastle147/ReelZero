/**
 * Audio-scene synchronization engine.
 * F008: Converts word-level audio timing (seconds) to frame-accurate
 * composition data (global frames) for Remotion rendering.
 */

import type { WordAlignment } from "@/lib/ai/types";
import { VIDEO_FRAME_RATE } from "@/lib/constants/video";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { secondsToFrame, distributeFrames } from "@/remotion/utils/timing";
import type { RenderScene, WordFrameTiming } from "@/types/render";
import type { Scene } from "@/types/scene";

/**
 * Calculate frame-accurate per-scene timing from audio alignment data.
 *
 * Returns RenderScene[] where each WordFrameTiming uses GLOBAL frames
 * (absolute position from composition frame 0). VideoComposition must
 * subtract scene.startFrame to get scene-local values before passing
 * to caption components.
 *
 * @throws AppError(AUDIO_ALIGNMENT_EMPTY) if wordAlignment is empty
 */
export function calculateSceneTimings(
  scenes: Scene[],
  wordAlignment: WordAlignment[],
  fps: number = VIDEO_FRAME_RATE
): RenderScene[] {
  if (wordAlignment.length === 0) {
    throw new AppError(
      ERROR_CODES.VALIDATION_FAILED,
      "Word alignment data is missing or empty — cannot calculate scene timings"
    );
  }

  // Build a map from word index to its alignment entry
  // Strategy: iterate scenes in order and greedily assign words whose text
  // matches the scene's narration words (whitespace-split)
  const renderScenes: RenderScene[] = [];
  let wordCursor = 0;
  const silentSceneIndices: number[] = [];

  // First pass: assign words to scenes
  const sceneWordAssignments: WordAlignment[][] = scenes.map(() => []);

  for (let sceneIdx = 0; sceneIdx < scenes.length; sceneIdx++) {
    const scene = scenes[sceneIdx];
    const narrationWords = scene.narration
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);

    let matched = 0;
    const savedCursor = wordCursor;

    for (let ni = 0; ni < narrationWords.length && wordCursor < wordAlignment.length; ni++) {
      sceneWordAssignments[sceneIdx].push(wordAlignment[wordCursor]);
      wordCursor++;
      matched++;
    }

    if (matched === 0) {
      // No words matched — this is a silent scene; restore cursor
      wordCursor = savedCursor;
      silentSceneIndices.push(sceneIdx);
    }
  }

  // Calculate total composition frames from last aligned word's end time
  const lastWord = wordAlignment[wordAlignment.length - 1];
  const totalCompositionFrames = secondsToFrame(lastWord.end, fps);

  // Calculate frames used by non-silent scenes
  let usedFrames = 0;
  const nonSilentFrames: number[] = [];

  for (let sceneIdx = 0; sceneIdx < scenes.length; sceneIdx++) {
    const words = sceneWordAssignments[sceneIdx];
    if (words.length > 0) {
      const startFrame = secondsToFrame(words[0].start, fps);
      const endFrame = secondsToFrame(words[words.length - 1].end, fps);
      const duration = Math.max(endFrame - startFrame, 1);
      nonSilentFrames[sceneIdx] = duration;
      usedFrames += duration;
    }
  }

  // Distribute remaining frames across silent scenes
  const remainingFrames = Math.max(totalCompositionFrames - usedFrames, 0);
  const silentFrameDistribution =
    silentSceneIndices.length > 0
      ? distributeFrames(
          silentSceneIndices.length > 0 ? Math.max(remainingFrames, silentSceneIndices.length * 30) : 0,
          silentSceneIndices.length
        )
      : [];

  // Build RenderScene array with global frame positions
  let globalFrame = 0;
  let silentIdx = 0;

  for (let sceneIdx = 0; sceneIdx < scenes.length; sceneIdx++) {
    const words = sceneWordAssignments[sceneIdx];
    const isSilent = silentSceneIndices.includes(sceneIdx);

    let startFrame: number;
    let durationInFrames: number;
    let wordTimings: WordFrameTiming[];

    if (!isSilent && words.length > 0) {
      startFrame = secondsToFrame(words[0].start, fps);
      const endFrame = secondsToFrame(words[words.length - 1].end, fps);
      durationInFrames = Math.max(endFrame - startFrame, 1);

      wordTimings = words.map((w) => ({
        word: w.word,
        startFrame: secondsToFrame(w.start, fps), // global
        endFrame: secondsToFrame(w.end, fps), // global
      }));
    } else {
      startFrame = globalFrame;
      durationInFrames = silentFrameDistribution[silentIdx] ?? 90; // 3s fallback
      silentIdx++;
      wordTimings = [];
    }

    renderScenes.push({
      sceneNumber: sceneIdx + 1,
      imageUrl: scenes[sceneIdx].imageUrl ?? "",
      durationInFrames,
      startFrame,
      wordTimings,
    });

    globalFrame = startFrame + durationInFrames;
  }

  return renderScenes;
}
