/**
 * Remotion timing utilities for frame-accurate audio-scene synchronization.
 * F008: Used by calculateSceneTimings() in sync.ts.
 */

/**
 * Convert seconds to an absolute frame number.
 * @param seconds - Time in seconds (float)
 * @param fps     - Frames per second (e.g., VIDEO_FRAME_RATE = 30)
 * @returns       Nearest integer frame number
 */
export function secondsToFrame(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

/**
 * Distribute totalFrames evenly across `count` silent scenes.
 * Returns an array of length `count` where each element is the frame count for that scene.
 * Any remainder frames are added to the last scene.
 *
 * @param totalFrames - Number of frames to distribute
 * @param count       - Number of scenes to distribute across
 * @returns           Array of frame counts (length === count)
 */
export function distributeFrames(totalFrames: number, count: number): number[] {
  if (count === 0) return [];
  const base = Math.floor(totalFrames / count);
  const remainder = totalFrames - base * count;
  const result = Array.from({ length: count }, () => base);
  // Add remainder to the last scene
  result[count - 1] += remainder;
  return result;
}
