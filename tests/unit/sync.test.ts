// F008: Unit tests for calculateSceneTimings()
// Run with: npm test (jest or vitest)

import type { WordAlignment } from "@/lib/ai/types";
import { VIDEO_FRAME_RATE } from "@/lib/constants/video";
import { AppError } from "@/lib/errors/app-error";
import { calculateSceneTimings } from "@/lib/services/remotion/sync";
import type { Scene } from "@/types/scene";

function makeScene(id: string, narration: string): Scene {
  return {
    id,
    order: 1,
    narration,
    visualDescription: "",
    imageUrl: "https://example.com/img.jpg",
    imageSource: "ai",
    duration: null,
    imageStatus: "idle",
  };
}

function makeWord(word: string, start: number, end: number): WordAlignment {
  return { word, start, end };
}

describe("calculateSceneTimings()", () => {
  it("(a) 3-scene input with 9 words produces correct durationInFrames per scene", () => {
    // Scene 1: "Hello world" (2 words) — 0–2s
    // Scene 2: "Foo bar baz" (3 words) — 2–5s
    // Scene 3: "Alpha beta gamma delta" (4 words) — 5–9s
    const scenes = [
      makeScene("1", "Hello world"),
      makeScene("2", "Foo bar baz"),
      makeScene("3", "Alpha beta gamma delta"),
    ];

    const wordAlignment: WordAlignment[] = [
      makeWord("Hello", 0.0, 0.8),
      makeWord("world", 0.9, 1.8),
      makeWord("Foo", 2.0, 2.6),
      makeWord("bar", 2.7, 3.4),
      makeWord("baz", 3.5, 4.9),
      makeWord("Alpha", 5.0, 5.7),
      makeWord("beta", 5.8, 6.4),
      makeWord("gamma", 6.5, 7.2),
      makeWord("delta", 7.3, 8.9),
    ];

    const result = calculateSceneTimings(scenes, wordAlignment, VIDEO_FRAME_RATE);

    expect(result).toHaveLength(3);
    // Scene 1: 0s → 1.8s → frames 0 to 54
    expect(result[0].startFrame).toBe(0);
    expect(result[0].durationInFrames).toBe(Math.round(1.8 * 30) - 0);
    // Scene 2: 2.0s → 4.9s
    expect(result[1].startFrame).toBe(Math.round(2.0 * 30));
    expect(result[1].durationInFrames).toBe(Math.round(4.9 * 30) - Math.round(2.0 * 30));
    // Scene 3: 5.0s → 8.9s
    expect(result[2].startFrame).toBe(Math.round(5.0 * 30));
    expect(result[2].durationInFrames).toBe(Math.round(8.9 * 30) - Math.round(5.0 * 30));
  });

  it("(b) scene with 0 aligned words gets frames from distributeFrames()", () => {
    const scenes = [
      makeScene("1", "Hello world"),
      makeScene("2", "UNMATCHED XYZ WORDS"), // won't match alignment
    ];

    const wordAlignment: WordAlignment[] = [
      makeWord("Hello", 0.0, 0.8),
      makeWord("world", 0.9, 2.0),
    ];

    const result = calculateSceneTimings(scenes, wordAlignment, VIDEO_FRAME_RATE);

    expect(result).toHaveLength(2);
    // Scene 2 should have > 0 frames (distributed from remaining pool)
    expect(result[1].durationInFrames).toBeGreaterThan(0);
  });

  it("(c) total frame count is consistent with audio duration (within ±2 frames)", () => {
    const scenes = [
      makeScene("1", "One two three"),
      makeScene("2", "Four five six"),
    ];

    const wordAlignment: WordAlignment[] = [
      makeWord("One", 0.0, 0.4),
      makeWord("two", 0.5, 0.9),
      makeWord("three", 1.0, 1.8),
      makeWord("Four", 2.0, 2.5),
      makeWord("five", 2.6, 3.1),
      makeWord("six", 3.2, 4.0),
    ];

    const result = calculateSceneTimings(scenes, wordAlignment, VIDEO_FRAME_RATE);

    const totalFrames = result.reduce((sum, s) => sum + s.durationInFrames, 0);
    const expectedFrames = Math.round(4.0 * VIDEO_FRAME_RATE);

    // Total should be within ±5 frames of expected
    expect(Math.abs(totalFrames - expectedFrames)).toBeLessThanOrEqual(5);
  });

  it("throws AppError when wordAlignment is empty", () => {
    const scenes = [makeScene("1", "Hello world")];

    expect(() => calculateSceneTimings(scenes, [], VIDEO_FRAME_RATE)).toThrow(AppError);
    expect(() => calculateSceneTimings(scenes, [], VIDEO_FRAME_RATE)).toThrow(
      "Word alignment data is missing or empty"
    );
  });

  it("WordFrameTiming uses global frames (not scene-local)", () => {
    const scenes = [
      makeScene("1", "Hello"),
      makeScene("2", "World"),
    ];

    const wordAlignment: WordAlignment[] = [
      makeWord("Hello", 1.0, 1.5),
      makeWord("World", 2.0, 2.7),
    ];

    const result = calculateSceneTimings(scenes, wordAlignment, VIDEO_FRAME_RATE);

    // Scene 1: "Hello" at 1.0s → global frame 30
    expect(result[0].wordTimings[0].startFrame).toBe(Math.round(1.0 * VIDEO_FRAME_RATE));
    // Scene 2: "World" at 2.0s → global frame 60 (NOT scene-local 0)
    expect(result[1].wordTimings[0].startFrame).toBe(Math.round(2.0 * VIDEO_FRAME_RATE));
  });
});
