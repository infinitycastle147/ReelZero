import type { ErrorCode } from "@/lib/errors/codes";

type ErrorMeta = {
  statusCode: number;
  message: string;
};

export const ERROR_MESSAGES: Record<ErrorCode, ErrorMeta> = {
  // Auth
  AUTH_UNAUTHORIZED: { statusCode: 401, message: "Authentication required" },
  AUTH_FORBIDDEN: { statusCode: 403, message: "Access denied" },
  AUTH_TOKEN_EXPIRED: { statusCode: 401, message: "Authentication token has expired" },

  // Validation
  VALIDATION_FAILED: { statusCode: 400, message: "Validation failed" },
  VALIDATION_INVALID_INPUT: { statusCode: 400, message: "Invalid input provided" },
  VALIDATION_MISSING_FIELD: { statusCode: 400, message: "Required field is missing" },

  // Credits
  CREDIT_INSUFFICIENT: { statusCode: 403, message: "Insufficient credits" },
  CREDIT_RESERVATION_FAILED: { statusCode: 500, message: "Failed to reserve credit" },

  // Generation
  GENERATION_SCRIPT_FAILED: { statusCode: 500, message: "Script generation failed" },
  GENERATION_IMAGE_FAILED: { statusCode: 500, message: "Image generation failed" },
  GENERATION_AUDIO_FAILED: { statusCode: 500, message: "Audio generation failed" },
  GENERATION_TIMEOUT: { statusCode: 504, message: "Generation timed out" },

  // Rendering
  RENDER_FAILED: { statusCode: 500, message: "Video rendering failed" },
  RENDER_TIMEOUT: { statusCode: 504, message: "Video rendering timed out" },
  RENDER_SERVICE_UNAVAILABLE: { statusCode: 503, message: "Render service is unavailable" },

  // Storage
  STORAGE_UPLOAD_FAILED: { statusCode: 500, message: "File upload failed" },
  STORAGE_QUOTA_EXCEEDED: { statusCode: 507, message: "Storage quota exceeded" },
  STORAGE_FILE_NOT_FOUND: { statusCode: 404, message: "File not found in storage" },

  // External
  EXTERNAL_API_ERROR: { statusCode: 502, message: "External service error" },
  EXTERNAL_RATE_LIMITED: { statusCode: 503, message: "External service rate limit reached" },
  EXTERNAL_TIMEOUT: { statusCode: 504, message: "External service timed out" },

  // Resources
  RESOURCE_NOT_FOUND: { statusCode: 404, message: "Resource not found" },
  RESOURCE_CONFLICT: { statusCode: 409, message: "Resource conflict" },
  RESOURCE_GONE: { statusCode: 410, message: "Resource no longer available" },

  // Internal
  INTERNAL_ERROR: { statusCode: 500, message: "An unexpected error occurred" },
};
