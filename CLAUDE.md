# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ReelZero** - An AI-Powered Reel/Shorts Creator SaaS platform that generates 60-second vertical short-form videos from text prompts. The system uses AI to generate scripts, images, and voiceovers, then composes them into videos using Remotion.

**Status:** Pre-development (planning phase complete, implementation pending)

## Technology Stack

- **Frontend:** Next.js 14+ (App Router), React 18+, Tailwind CSS, Zustand
- **Backend:** Next.js API Routes, Node.js 20+
- **Video:** Remotion for composition and rendering
- **Database:** Supabase PostgreSQL
- **Storage:** Supabase Storage
- **Auth:** Clerk
- **Payments:** Stripe
- **AI Services:** Google Gemini 2.5 Flash (text/image), ElevenLabs (TTS)

## Build & Development Commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # TypeScript checking
npm run pre-commit   # All checks (lint + type-check + build)
```

## Code Architecture

### Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth routes (sign-in, sign-up)
│   ├── (dashboard)/        # Protected routes
│   └── api/                # API endpoints
│       ├── video/generate/ # Script generation
│       ├── video/images/   # Image generation
│       ├── video/audio/    # TTS generation
│       └── video/render/   # Video rendering
├── components/
│   ├── ui/                 # Base components
│   ├── video/              # Video generation components
│   └── dashboard/          # Dashboard components
├── lib/
│   ├── ai/                 # AI provider abstraction
│   ├── db/queries/         # Database query functions
│   ├── errors/             # Error handling (AppError, codes)
│   ├── prompts/            # Centralized prompt templates
│   └── services/           # Business logic
├── store/                  # Zustand stores
├── hooks/                  # React hooks
├── types/                  # TypeScript types
└── remotion/               # Video compositions
```

### Key Patterns

**AI Provider Abstraction:** All AI calls go through `src/lib/ai/` functions, not direct API calls:
```typescript
import { generateText } from '@/lib/ai/text-generation';
import { generateImage } from '@/lib/ai/image-generation';
```

**Error Handling:** Use `AppError` with predefined codes from `src/lib/errors/codes.ts`:
```typescript
import { AppError } from '@/lib/errors/AppError';
import { ERROR_CODES } from '@/lib/errors/codes';

throw new AppError(ERROR_CODES.INSUFFICIENT_CREDITS);
```

**Database Access:** Use query functions from `src/lib/db/queries/`, no raw SQL in route handlers:
```typescript
import { getVideoById } from '@/lib/db/queries/videos';
```

**Prompts:** All prompts in `src/lib/prompts/`, no inline prompt strings:
```typescript
import { buildScriptPrompt } from '@/lib/prompts/script-generation';
```

## Code Constitution Rules

### Imports
- No re-exports or barrel files (`index.ts`)
- Import directly from source: `import { Button } from '@/components/ui/button'`
- Import order: Node built-ins → External packages → Internal (@/) → Relative

### Naming
- Files: kebab-case (`video-player.tsx`)
- Hooks: camelCase with `use` prefix (`useVideoGeneration.ts`)
- Functions/variables: camelCase
- Constants: SCREAMING_SNAKE_CASE
- Booleans: is/has/can prefix (`isLoading`, `hasCredits`)
- Service interfaces: `I` prefix (`ITextProvider`)

### Forbidden
- No `any` type - use `unknown` with type guards
- No nested ternaries
- No magic numbers/strings - use constants
- No backward compatibility shims

### API Responses
```typescript
// Success
{ data: { ... } }

// Error
{
  error: {
    code: "ERROR_CODE",
    message: "Human-readable message",
    details?: { ... }
  }
}
```

### Testing
- Tests collocated with source: `text-generation.test.ts`
- Name tests by behavior: `it('returns script with 5 scenes for valid prompt')`

### Commits
- Run `npm run pre-commit` before committing
- Format: `type(scope): description`
- Types: feat, fix, refactor, docs, test, chore

## Video Generation Pipeline

```
User Input → Script Generation (Gemini) → User Editing →
Image Generation (Parallel) → Audio Generation (ElevenLabs) →
Synchronization → Remotion Render → Storage/Delivery

Total: ~70-90 seconds
```

## Error Code Categories

- `AUTH_*` - Authentication errors
- `VALIDATION_*` - Input validation
- `CREDIT_*` - Billing/credits
- `GENERATION_*` - AI generation failures
- `RENDER_*` - Video rendering
- `STORAGE_*` - File operations
- `EXTERNAL_*` - Third-party API failures
