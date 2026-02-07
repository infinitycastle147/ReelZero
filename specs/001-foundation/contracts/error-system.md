# Contract: Error Handling System

**Feature**: 001-foundation
**Date**: 2026-02-07

## Overview

The error handling system provides a standardized way to throw, catch, and serialize errors across all API routes. This contract defines the interfaces, expected behaviors, and response formats.

---

## 1. AppError Class Contract

### Constructor

```text
new AppError(code: string, details?: unknown)

- code: MUST be a key from ERROR_CODES
- details: Optional additional context (validation errors, resource IDs, etc.)
- statusCode and message are auto-resolved from the error code mapping
```

### Properties

```text
- code: string (readonly)
- statusCode: number (readonly)
- message: string (readonly)
- details: unknown | undefined (readonly)
- name: "AppError" (readonly)
```

### Methods

```text
toJSON():
  Returns: {
    error: {
      code: string,
      message: string,
      details?: unknown
    }
  }
```

---

## 2. ERROR_CODES Contract

### Structure

```text
ERROR_CODES = {
  // Auth
  AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED",
  AUTH_FORBIDDEN: "AUTH_FORBIDDEN",
  AUTH_TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",

  // Validation
  VALIDATION_FAILED: "VALIDATION_FAILED",
  VALIDATION_INVALID_INPUT: "VALIDATION_INVALID_INPUT",
  VALIDATION_MISSING_FIELD: "VALIDATION_MISSING_FIELD",

  // Credits
  CREDIT_INSUFFICIENT: "CREDIT_INSUFFICIENT",
  CREDIT_RESERVATION_FAILED: "CREDIT_RESERVATION_FAILED",

  // Generation
  GENERATION_SCRIPT_FAILED: "GENERATION_SCRIPT_FAILED",
  GENERATION_IMAGE_FAILED: "GENERATION_IMAGE_FAILED",
  GENERATION_AUDIO_FAILED: "GENERATION_AUDIO_FAILED",
  GENERATION_TIMEOUT: "GENERATION_TIMEOUT",

  // Rendering
  RENDER_FAILED: "RENDER_FAILED",
  RENDER_TIMEOUT: "RENDER_TIMEOUT",
  RENDER_SERVICE_UNAVAILABLE: "RENDER_SERVICE_UNAVAILABLE",

  // Storage
  STORAGE_UPLOAD_FAILED: "STORAGE_UPLOAD_FAILED",
  STORAGE_QUOTA_EXCEEDED: "STORAGE_QUOTA_EXCEEDED",
  STORAGE_FILE_NOT_FOUND: "STORAGE_FILE_NOT_FOUND",

  // External
  EXTERNAL_API_ERROR: "EXTERNAL_API_ERROR",
  EXTERNAL_RATE_LIMITED: "EXTERNAL_RATE_LIMITED",
  EXTERNAL_TIMEOUT: "EXTERNAL_TIMEOUT",

  // Resources
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  RESOURCE_CONFLICT: "RESOURCE_CONFLICT",
  RESOURCE_GONE: "RESOURCE_GONE",

  // Internal
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const
```

---

## 3. Error Message Mapping Contract

### Structure

```text
ERROR_MESSAGES: Record<ErrorCode, { statusCode: number, message: string }>

Example entries:
  AUTH_UNAUTHORIZED:          { statusCode: 401, message: "Authentication required" }
  AUTH_FORBIDDEN:             { statusCode: 403, message: "Access denied" }
  VALIDATION_FAILED:          { statusCode: 400, message: "Validation failed" }
  CREDIT_INSUFFICIENT:        { statusCode: 403, message: "Insufficient credits" }
  GENERATION_SCRIPT_FAILED:   { statusCode: 500, message: "Script generation failed" }
  RENDER_FAILED:              { statusCode: 500, message: "Video rendering failed" }
  RESOURCE_NOT_FOUND:         { statusCode: 404, message: "Resource not found" }
  INTERNAL_ERROR:             { statusCode: 500, message: "An unexpected error occurred" }
```

---

## 4. Error Middleware Contract

### withErrorHandler wrapper

```text
Input: (handler: NextApiHandler) => NextApiHandler

Behavior:
  1. Wraps the handler in try/catch
  2. If handler throws AppError:
     - Returns Response with error.statusCode
     - Body: error.toJSON()
  3. If handler throws unknown Error:
     - Returns Response with 500
     - Body: { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }
  4. Content-Type: application/json
```

---

## 5. API Response Format Contract

### Success Response

```text
Status: 200 (or appropriate 2xx)
Content-Type: application/json
Body: {
  "data": { ... }
}
```

### Error Response

```text
Status: 4xx or 5xx (from error code mapping)
Content-Type: application/json
Body: {
  "error": {
    "code": "ERROR_CODE_NAME",
    "message": "Human-readable message",
    "details": { ... }  // optional
  }
}
```
