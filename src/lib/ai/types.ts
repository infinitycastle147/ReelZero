// AI service input/output types

// ── Provider Types ───────────────────────────────────────────────────────────

export type TextProvider = "gemini";
export type ImageProvider = "gemini";
export type TTSProvider = "elevenlabs";

// ── Text Generation ──────────────────────────────────────────────────────────

export type TextGenerationInput = {
  prompt: string;
  options?: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: "text" | "json";
  };
};

export type TextGenerationOutput = {
  text: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
};

// ── Image Generation ─────────────────────────────────────────────────────────

export type ImageGenerationInput = {
  prompt: string;
  options?: {
    aspectRatio?: "1:1" | "9:16" | "16:9";
  };
};

export type ImageGenerationOutput = {
  imageBase64: string;
  mimeType: string;
};

// ── Text-to-Speech ───────────────────────────────────────────────────────────

export type TTSInput = {
  text: string;
  voiceId: string;
  options?: {
    model?: string;
    stability?: number;
    similarity?: number;
  };
};

export type TTSOutput = {
  audioBase64: string;
  alignment: WordAlignment[];
};

export type WordAlignment = {
  word: string;
  start: number;
  end: number;
};

// ── Retry ────────────────────────────────────────────────────────────────────

export type RetryOptions = {
  maxRetries: number;
  baseDelayMs: number;
  maxJitterMs: number;
  retryableStatuses: number[];
};

// ── Script Generation ────────────────────────────────────────────────────────

export type ScriptTheme =
  | "realistic"
  | "anime"
  | "artistic"
  | "cinematic"
  | "minimalist";

export type GeneratedScene = {
  sceneNumber: number;
  narration: string;
  visualDescription: string;
  durationSeconds: number;
  keywords: string[];
};

export type GeneratedScript = {
  totalDuration: number;
  scenes: GeneratedScene[];
};

export type GenerateScriptInput = {
  prompt: string;
  theme: ScriptTheme;
  videoId: string;
};

// ── Scene Image Generation ───────────────────────────────────────────────────

export type GenerateSceneImageInput = {
  visualDescription: string;
  theme: ScriptTheme;
  videoId: string;
  userId: string;
  sceneNumber: number;
};

export type GenerateSceneImageOutput = {
  storageUrl: string;
  storagePath: string;
};

export type BatchImageResult = {
  results: Array<{
    sceneNumber: number;
    status: "success" | "error";
    output?: GenerateSceneImageOutput;
    error?: string;
  }>;
  successCount: number;
  errorCount: number;
};

// ── Audio Generation ─────────────────────────────────────────────────────────

export type GenerateAudioInput = {
  narrationText: string;
  voiceId: string;
  videoId: string;
  userId: string;
};

export type GenerateAudioOutput = {
  storageUrl: string;
  storagePath: string;
  alignment: WordAlignment[];
  durationSeconds: number;
};

// ── Image Processing ─────────────────────────────────────────────────────────

export type ProcessImageInput = {
  imageBuffer: Buffer;
  targetWidth: number;
  targetHeight: number;
  cropMode: "centre" | "attention";
};

export type ProcessImageOutput = {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  sizeBytes: number;
};

export type ValidateImageResult = {
  isValid: boolean;
  width?: number;
  height?: number;
  format?: string;
  error?: string;
};

// ── Image Upload ─────────────────────────────────────────────────────────────

export type UploadImageInput = {
  file: Buffer;
  originalFilename: string;
  mimeType: string;
  userId: string;
  videoId?: string;
};

export type UploadImageOutput = {
  storageUrl: string;
  storagePath: string;
  fileSizeBytes: number;
};
