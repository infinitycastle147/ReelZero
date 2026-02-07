# Contract: Type System & Constants

**Feature**: 001-foundation
**Date**: 2026-02-07

## Overview

Defines the public API surface for shared types, constants, and store shapes that all subsequent features import.

---

## 1. Import Contracts

All imports follow the direct import pattern (no barrel files):

```text
// Types
import type { Video, VideoStatus, VideoMetadata } from '@/types/video'
import type { Scene, CaptionStyle, TransitionType } from '@/types/scene'
import type { ApiResponse, ApiErrorResponse, PaginatedResponse } from '@/types/api'
import type { DbUser, DbVideo, DbSubscription } from '@/types/database'

// Constants
import { VIDEO_RESOLUTION, VIDEO_FRAME_RATE, MAX_SCENES } from '@/lib/constants/video'
import { PRICING_TIERS } from '@/lib/constants/pricing'
import { VOICE_OPTIONS } from '@/lib/constants/voices'

// Error system
import { AppError } from '@/lib/errors/app-error'
import { ERROR_CODES } from '@/lib/errors/codes'
import { withErrorHandler } from '@/lib/errors/middleware'

// Stores
import { useVideoStore } from '@/store/video-store'
import { useUserStore } from '@/store/user-store'
import { useUIStore } from '@/store/ui-store'
```

---

## 2. Constants Immutability Contract

All constant objects and arrays MUST be:
- Declared with `as const` for literal type inference
- Frozen with `Object.freeze()` at the top level
- Never mutated at runtime

---

## 3. Store Contract

### VideoStore

```text
Selector access:
  const step = useVideoStore(state => state.currentStep)
  const scenes = useVideoStore(state => state.scenes)

Action access:
  const setPrompt = useVideoStore(state => state.setPrompt)
  const reset = useVideoStore(state => state.reset)

Invariants:
  - scenes.length >= 0 (empty initially, 3-5 when populated)
  - currentStep in range [1, 4]
  - reset() returns all state to initial values
```

### UserStore

```text
Selector access:
  const user = useUserStore(state => state.user)
  const subscription = useUserStore(state => state.subscription)

Invariants:
  - user is null until loaded from auth provider
  - subscription is null until fetched from API
  - isLoaded is false until first load completes
```

### UIStore

```text
Selector access:
  const isSidebarOpen = useUIStore(state => state.isSidebarOpen)
  const notifications = useUIStore(state => state.notifications)

Invariants:
  - At most one modal active at a time (activeModal is string | null)
  - Notifications have unique IDs
  - removeNotification with unknown ID is a no-op
```

---

## 4. Type Compatibility Contract

All types in `src/types/` MUST:
- Compile under TypeScript strict mode with no errors
- Use `type` keyword for data shapes (not `interface` unless extensibility is needed)
- Use named exports only (no default exports)
- Use `string` for dates (ISO 8601 format), not `Date` objects (JSON serialization compatibility)
- Use `null` (not `undefined`) for absent optional fields in database/API types
