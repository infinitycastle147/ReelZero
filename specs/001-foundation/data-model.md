# Data Model: Project Foundation & Scaffolding

**Feature**: 001-foundation
**Date**: 2026-02-07

## Overview

F001 does not introduce any database tables or persistent storage. However, it defines the **type system** and **constant data structures** that all subsequent features build upon. This document specifies the entities, their shapes, validation rules, and relationships as TypeScript types and constants.

---

## 1. Error System Entities

### ErrorCode

A string identifier for a specific error condition, organized by category prefix.

```text
Fields:
  - code: string (SCREAMING_SNAKE_CASE, category-prefixed)
  - statusCode: number (HTTP status code, 400-599)
  - message: string (human-readable, suitable for API responses)

Categories:
  - AUTH_*           (401, 403)
  - VALIDATION_*     (400, 422)
  - CREDIT_*         (402, 403)
  - GENERATION_*     (500, 502, 503)
  - RENDER_*         (500, 502, 503)
  - STORAGE_*        (500, 507)
  - EXTERNAL_*       (502, 503, 504)
  - RESOURCE_*       (404, 409, 410)
  - INTERNAL_*       (500)
```

### AppError

A structured error class extending native `Error`.

```text
Fields:
  - code: string (from ERROR_CODES)
  - statusCode: number (derived from error code mapping)
  - message: string (derived from error code mapping)
  - details: unknown | undefined (optional additional context)

Methods:
  - toJSON(): { error: { code: string, message: string, details?: unknown } }
```

---

## 2. Video Constants

### VideoSpec (constant, not configurable)

```text
Fields:
  - RESOLUTION_WIDTH: 1080
  - RESOLUTION_HEIGHT: 1920
  - FRAME_RATE: 30
  - MIN_DURATION_SECONDS: 50
  - MAX_DURATION_SECONDS: 60
  - MAX_SCENES: 5
  - MIN_SCENES: 3
  - CODEC: "H.264"
  - CONTAINER: "MP4"
  - ASPECT_RATIO: "9:16"
```

---

## 3. Pricing Constants

### PricingTier (constant array)

```text
Each tier:
  - id: string ("free" | "basic" | "pro" | "enterprise")
  - name: string (display name)
  - monthlyPrice: number (USD cents, 0 for free)
  - annualPrice: number (USD cents, 0 for free)
  - creditsPerMonth: number
  - storageQuotaMb: number
  - features:
    - hasWatermark: boolean
    - maxResolution: string
    - voiceOptions: "basic" | "all"
    - hasPrioritySupport: boolean

Tiers:
  - Free:       0/mo, 3 credits, 500MB, watermark, 720p, basic voices
  - Basic:      $9/mo, 15 credits, 2GB, no watermark, 1080p, basic voices
  - Pro:        $29/mo, 50 credits, 10GB, no watermark, 1080p, all voices, priority
  - Enterprise: $79/mo, 200 credits, 50GB, no watermark, 1080p, all voices, priority
```

---

## 4. Voice Constants

### VoiceOption (constant array)

```text
Each voice:
  - id: string (ElevenLabs voice ID)
  - name: string (display name)
  - gender: "male" | "female" | "neutral"
  - accent: string (e.g., "American", "British")
  - tier: "basic" | "premium"
  - previewUrl: string (audio sample URL placeholder)
```

---

## 5. Type Definitions

### Video Types (`src/types/video.ts`)

```text
VideoStatus:
  "draft" | "generating" | "rendering" | "completed" | "failed"

Video:
  - id: string
  - userId: string
  - title: string
  - prompt: string
  - status: VideoStatus
  - voiceId: string
  - theme: string
  - captionStyle: CaptionStyle
  - scenes: Scene[]
  - metadata: VideoMetadata
  - videoUrl: string | null
  - thumbnailUrl: string | null
  - duration: number | null (seconds)
  - createdAt: string (ISO 8601)
  - updatedAt: string (ISO 8601)

VideoMetadata:
  - resolution: { width: number, height: number }
  - frameRate: number
  - codec: string
  - fileSize: number | null (bytes)
```

### Scene Types (`src/types/scene.ts`)

```text
Scene:
  - id: string
  - order: number (1-based)
  - narration: string
  - visualDescription: string
  - imageUrl: string | null
  - imageSource: "ai" | "upload"
  - duration: number | null (seconds, computed from audio)

CaptionStyle:
  "word-by-word" | "full-sentence" | "none"

TransitionType:
  "fade" | "crossfade"
```

### API Types (`src/types/api.ts`)

```text
ApiSuccessResponse<T>:
  - data: T

ApiErrorResponse:
  - error:
    - code: string
    - message: string
    - details?: unknown

ApiResponse<T>: ApiSuccessResponse<T> | ApiErrorResponse

PaginatedResponse<T>:
  - data: T[]
  - pagination:
    - page: number
    - pageSize: number
    - total: number
    - totalPages: number
```

### Database Types (`src/types/database.ts`)

```text
DbUser:
  - id: string (UUID)
  - clerkId: string
  - email: string
  - name: string | null
  - avatarUrl: string | null
  - createdAt: string
  - updatedAt: string

DbSubscription:
  - id: string (UUID)
  - userId: string (FK → DbUser.id)
  - tier: "free" | "basic" | "pro" | "enterprise"
  - stripeCustomerId: string | null
  - stripeSubscriptionId: string | null
  - creditsUsed: number
  - creditsTotal: number
  - currentPeriodStart: string
  - currentPeriodEnd: string
  - status: "active" | "cancelled" | "past_due" | "trialing"
  - createdAt: string
  - updatedAt: string

DbVideo:
  - id: string (UUID)
  - userId: string (FK → DbUser.id)
  - title: string
  - prompt: string
  - status: VideoStatus
  - metadata: Record<string, unknown> (JSONB)
  - videoUrl: string | null
  - thumbnailUrl: string | null
  - duration: number | null
  - createdAt: string
  - updatedAt: string

DbGenerationLog:
  - id: string (UUID)
  - userId: string (FK → DbUser.id)
  - videoId: string | null (FK → DbVideo.id)
  - action: string
  - provider: string
  - inputTokens: number | null
  - outputTokens: number | null
  - durationMs: number | null
  - status: "success" | "failed"
  - errorDetails: string | null
  - createdAt: string
```

---

## 6. Store Shapes

### VideoStore (`src/store/video-store.ts`)

```text
State:
  - currentStep: number (1-4)
  - prompt: string
  - selectedVoice: string | null
  - selectedTheme: string | null
  - captionStyle: CaptionStyle
  - transitionType: TransitionType
  - scenes: Scene[]
  - isGenerating: boolean
  - generationProgress: number (0-100)

Actions:
  - setStep(step: number): void
  - setPrompt(prompt: string): void
  - setVoice(voiceId: string): void
  - setTheme(theme: string): void
  - setCaptionStyle(style: CaptionStyle): void
  - setTransitionType(type: TransitionType): void
  - setScenes(scenes: Scene[]): void
  - updateScene(id: string, updates: Partial<Scene>): void
  - addScene(): void
  - removeScene(id: string): void
  - reset(): void
```

### UserStore (`src/store/user-store.ts`)

```text
State:
  - user: { id: string, name: string, email: string, avatarUrl: string | null } | null
  - subscription: { tier: string, creditsRemaining: number, creditsTotal: number } | null
  - isLoaded: boolean

Actions:
  - setUser(user): void
  - setSubscription(subscription): void
  - clearUser(): void
```

### UIStore (`src/store/ui-store.ts`)

```text
State:
  - isSidebarOpen: boolean
  - activeModal: string | null
  - notifications: Array<{ id: string, type: "success" | "error" | "info", message: string }>

Actions:
  - toggleSidebar(): void
  - openModal(id: string): void
  - closeModal(): void
  - addNotification(notification): void
  - removeNotification(id: string): void
```

---

## Relationships

```text
DbUser 1──* DbSubscription (one active subscription per user)
DbUser 1──* DbVideo
DbUser 1──* DbGenerationLog
DbVideo 1──* DbGenerationLog
Video ──* Scene (1 video has 3-5 scenes)
```

Note: These relationships will be enforced at the database level in F003. F001 only defines the TypeScript types.
