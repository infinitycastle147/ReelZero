import type { CaptionStyle, TransitionType } from "@/types/scene";

/** Stage of an in-progress render */
export type RenderStage = "audio" | "sync" | "render" | "finalize";

/** Payload sent from main app to ReelZero-Renderer microservice */
export type RenderJobPayload = {
  videoId: string;
  userId: string;
  audioUrl: string; // Signed Supabase URL for the generated MP3 (1hr expiry)
  scenes: RenderScene[];
  captionStyle: CaptionStyle;
  transitionType: TransitionType;
  showWatermark: boolean;
  callbackUrl: string; // POST /api/video/render/complete URL
  stageCallbackUrl: string; // POST /api/video/render/stage URL
};

/** Per-scene data sent to renderer */
export type RenderScene = {
  sceneNumber: number;
  imageUrl: string; // Signed Supabase URL for scene image (1hr expiry)
  durationInFrames: number; // Pre-calculated from audio alignment
  startFrame: number; // Global start frame in the composition
  wordTimings: WordFrameTiming[];
};

/**
 * Word timing in GLOBAL (absolute) frames from composition start (frame 0).
 * NOT scene-local. Convert to scene-local inside VideoComposition by subtracting
 * scene.startFrame before passing to WordByWord / FullSentence caption components.
 */
export type WordFrameTiming = {
  word: string;
  startFrame: number; // global frame (from composition start)
  endFrame: number; // global frame (from composition start)
};

/** Render complete callback body from microservice → main app */
export type RenderCompleteCallback = {
  videoId: string;
  status: "completed" | "failed";
  outputUrl?: string;    // Supabase signed URL for the rendered MP4
  audioUrl?: string;     // Echoed back from RenderJobPayload — used to upsert audio_url column
  fileSizeBytes?: number;
  durationSeconds?: number;
  error?: string;        // Human-readable error when failed
};

/** Render stage update callback body from microservice → main app */
export type RenderStageCallback = {
  videoId: string;
  stage: Exclude<RenderStage, "audio">; // renderer sends sync | render | finalize
};

/** Response from GET /api/video/render/status */
export type RenderStatusResponse = {
  status: "processing" | "completed" | "failed";
  currentStage: RenderStage | null;
  videoUrl: string | null; // signed URL, present when status === "completed"
  error: string | null; // human-readable, present when status === "failed"
};
