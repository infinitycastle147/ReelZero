# Data Model: AI Service Integration

**Feature**: 004-ai-services
**Date**: 2026-02-08

## Overview

This feature introduces the AI abstraction layer, prompt templates, retry utilities, and image processing pipeline. No new database tables are created — the feature uses existing tables (`generation_logs`, `uploaded_images`, `videos`) from F003 and existing storage buckets (`images`, `audio`). All new types define the shapes of AI service inputs/outputs and internal data structures.

## AI Service Types (src/lib/ai/types.ts)

### Provider Types

```typescript
type TextProvider = "gemini";
type ImageProvider = "gemini";
type TTSProvider = "elevenlabs";
```

### Text Generation

```typescript
type TextGenerationInput = {
  prompt: string;
  options?: {
    temperature?: number;   // default: 0.7
    maxTokens?: number;     // default: 2048
    responseFormat?: "text" | "json"; // default: "json"
  };
};

type TextGenerationOutput = {
  text: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
};
```

### Image Generation

```typescript
type ImageGenerationInput = {
  prompt: string;
  options?: {
    aspectRatio?: "1:1" | "9:16" | "16:9"; // default: "1:1"
  };
};

type ImageGenerationOutput = {
  imageBase64: string;
  mimeType: string; // "image/png"
};
```

### Text-to-Speech

```typescript
type TTSInput = {
  text: string;
  voiceId: string;
  options?: {
    model?: string;        // default: "eleven_multilingual_v2"
    stability?: number;    // default: 0.5
    similarity?: number;   // default: 0.75
  };
};

type TTSOutput = {
  audioBase64: string;
  alignment: WordAlignment[];
};

type WordAlignment = {
  word: string;
  start: number; // seconds
  end: number;   // seconds
};
```

## Script Generation Types (src/lib/ai/script-generation.ts)

### Script Input/Output

```typescript
type GenerateScriptInput = {
  prompt: string;          // 50-500 characters, user's topic
  theme: ScriptTheme;
  videoId: string;         // for generation_log association
};

type ScriptTheme = "realistic" | "anime" | "artistic" | "cinematic" | "minimalist";

type GeneratedScript = {
  totalDuration: number;   // 50-60 seconds
  scenes: GeneratedScene[];
};

type GeneratedScene = {
  sceneNumber: number;     // 1-indexed
  narration: string;
  visualDescription: string;
  durationSeconds: number; // 10-12 seconds each
  keywords: string[];      // 3-5 per scene
};
```

### JSON Schema for Gemini (responseJsonSchema)

```json
{
  "type": "object",
  "properties": {
    "total_duration": { "type": "integer" },
    "scenes": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "scene_number": { "type": "integer" },
          "narration": { "type": "string" },
          "visual_description": { "type": "string" },
          "duration_seconds": { "type": "integer" },
          "keywords": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["scene_number", "narration", "visual_description", "duration_seconds", "keywords"]
      }
    }
  },
  "required": ["total_duration", "scenes"]
}
```

## Image Generation Types (src/lib/ai/image-generation.ts)

### Scene Image Input/Output

```typescript
type GenerateSceneImageInput = {
  visualDescription: string;
  theme: ScriptTheme;
  videoId: string;
  userId: string;
  sceneNumber: number;
};

type GenerateSceneImageOutput = {
  storageUrl: string;      // signed URL from Supabase
  storagePath: string;     // {userId}/{filename}
};

type BatchImageResult = {
  results: Array<{
    sceneNumber: number;
    status: "success" | "error";
    output?: GenerateSceneImageOutput;
    error?: string;
  }>;
  successCount: number;
  errorCount: number;
};
```

## Audio Generation Types (src/lib/ai/tts.ts)

### TTS Input/Output

```typescript
type GenerateAudioInput = {
  narrationText: string;   // combined narration from all scenes, max 5000 chars
  voiceId: string;         // maps to ElevenLabs voice ID
  videoId: string;
  userId: string;
};

type GenerateAudioOutput = {
  storageUrl: string;      // signed URL to MP3
  storagePath: string;     // {userId}/{videoId}.mp3
  alignment: WordAlignment[];
  durationSeconds: number;
};
```

### ElevenLabs Character-to-Word Aggregation

```
Input (from ElevenLabs normalized_alignment):
  characters: ["H","e","l","l","o"," ","w","o","r","l","d"]
  character_start_times_seconds: [0.0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55]
  character_end_times_seconds:   [0.05, 0.1, 0.15, 0.2, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6]

Output (aggregated to word-level):
  [
    { word: "Hello", start: 0.0, end: 0.3 },
    { word: "world", start: 0.35, end: 0.6 }
  ]

Logic: Accumulate characters until whitespace, then emit word with
       start = first char's start, end = last char's end.
```

## Image Processing Types (src/lib/ai/image-processing.ts)

```typescript
type ProcessImageInput = {
  imageBuffer: Buffer;
  targetWidth: number;     // 1080
  targetHeight: number;    // 1920
  cropMode: "centre" | "attention"; // centre for AI, attention for uploads
};

type ProcessImageOutput = {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;          // "jpeg"
  sizeBytes: number;
};

type ValidateImageResult = {
  isValid: boolean;
  width?: number;
  height?: number;
  format?: string;
  error?: string;
};
```

## Upload Types (src/lib/ai/image-upload.ts)

```typescript
type UploadImageInput = {
  file: Buffer;
  originalFilename: string;
  mimeType: string;        // "image/png" | "image/jpeg" | "image/webp"
  userId: string;
  videoId?: string;
};

type UploadImageOutput = {
  storageUrl: string;
  storagePath: string;
  fileSizeBytes: number;
};
```

## Retry Utility Types (src/lib/ai/retry.ts)

```typescript
type RetryOptions = {
  maxRetries: number;      // default: 3
  baseDelayMs: number;     // default: 1000
  maxJitterMs: number;     // default: 500
  retryableStatuses: number[]; // default: [429, 500, 503]
};
```

## Prompt Template Types (src/lib/prompts/types.ts)

```typescript
type ScriptPromptInput = {
  topic: string;
  theme: ScriptTheme;
  sceneCount: number;      // 3-5
  targetDuration: number;  // 50-60
};

type ImagePromptInput = {
  visualDescription: string;
  theme: ScriptTheme;
  style?: string;
};
```

## AI Config (src/lib/ai/config.ts)

```typescript
const AI_CONFIG = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY!,
    textModel: "gemini-2.5-flash",
    imageModel: "gemini-2.5-flash-image",
    textEndpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    imageEndpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY!,
    defaultModel: "eleven_multilingual_v2",
    baseUrl: "https://api.elevenlabs.io/v1",
  },
} as const;
```

## Voice ID Mapping

```typescript
// Maps application voice IDs to ElevenLabs voice IDs
const VOICE_ID_MAP: Record<string, string> = {
  voice_adam: "<elevenlabs_adam_id>",
  voice_bella: "<elevenlabs_bella_id>",
  voice_charlie: "<elevenlabs_charlie_id>",
  voice_diana: "<elevenlabs_diana_id>",
  voice_echo: "<elevenlabs_echo_id>",
};
```

## Constants (src/lib/constants/ai.ts)

```typescript
const PROMPT_MIN_LENGTH = 50;
const PROMPT_MAX_LENGTH = 500;
const TTS_MAX_CHARACTERS = 5000;
const AI_IMAGE_SIZE = 1024;          // square input from Gemini
const SCENE_DURATION_MIN = 10;
const SCENE_DURATION_MAX = 12;
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_UPLOAD_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const RETRY_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_JITTER_MS = 500;
```

## Existing Tables Used (no changes)

| Table | Usage in This Feature |
|-------|----------------------|
| `generation_logs` | Auto-logged by each AI service call (stage, status, duration_ms, error_message) |
| `uploaded_images` | New record created when user uploads a custom scene image |
| `videos` | Read `id` for association; metadata field may store script/scene data |

## Existing Storage Buckets Used (no changes)

| Bucket | Usage |
|--------|-------|
| `images` | Store AI-generated scene images + user-uploaded images (1080x1920 JPEG) |
| `audio` | Store TTS narration audio (MP3) |

## Validation Rules

| Rule | Applies To | Constraint |
|------|-----------|------------|
| Prompt length 50-500 chars | Script generation | Reject before API call |
| Scene count 3-5 | Script output | Validate after generation, retry once if out of range |
| Total duration 50-60s | Script output | Validate after generation |
| Narration ≤ 5000 chars | TTS input | Reject before API call |
| Upload ≤ 10MB | Image upload | Reject before processing |
| Upload MIME type | Image upload | Must be PNG, JPEG, or WebP |
| Image integrity | Image upload + AI output | Sharp metadata check, reject corrupt images |
| Non-retryable errors | All services | 400, 401, 403 — do not retry |
| Retryable errors | All services | 429, 500, 503 — retry with backoff |
