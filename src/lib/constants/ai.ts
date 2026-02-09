// AI service constants — prompt limits, TTS limits, image sizes, upload limits, retry config

// Prompt validation
export const PROMPT_MIN_LENGTH = 50 as const;
export const PROMPT_MAX_LENGTH = 500 as const;

// TTS
export const TTS_MAX_CHARACTERS = 5000 as const;

// Image sizes
export const AI_IMAGE_SIZE = 1024 as const;
export const TARGET_IMAGE_WIDTH = 1080 as const;
export const TARGET_IMAGE_HEIGHT = 1920 as const;

// Scene duration
export const SCENE_DURATION_MIN = 10 as const;
export const SCENE_DURATION_MAX = 12 as const;

// Upload limits
export const MAX_UPLOAD_SIZE_BYTES = 10_485_760; // 10MB (10 * 1024 * 1024)
export const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

// Retry configuration
export const RETRY_MAX_ATTEMPTS = 3 as const;
export const RETRY_BASE_DELAY_MS = 1000 as const;
export const RETRY_MAX_JITTER_MS = 500 as const;
export const RETRYABLE_STATUS_CODES = [429, 500, 503] as const;
export const NON_RETRYABLE_STATUS_CODES = [400, 401, 403] as const;
