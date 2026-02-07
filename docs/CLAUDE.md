# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ReelZero** - An AI-Powered Reel/Shorts Creator SaaS platform that generates 60-second vertical short-form videos from text prompts. The system uses AI to generate scripts, images, and voiceovers, then composes them into videos using Remotion.

**Status:** Pre-development (planning phase complete, spec-kit integrated, implementation pending)

## Technology Stack

- **Frontend:** Next.js 14+ (App Router), React 18+, Tailwind CSS, shadcn/ui, Zustand
- **Backend:** Next.js API Routes, Node.js 20+
- **Video:** Remotion for composition and rendering
- **Database:** Supabase PostgreSQL
- **Storage:** Supabase Storage
- **Auth:** Clerk
- **Payments:** Stripe
- **AI Services:** Google Gemini Flash (text), Imagen 3 (image), ElevenLabs (TTS)

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

## Spec-Kit (Specification-Driven Development)

This project uses [GitHub Spec-Kit](https://github.com/github/spec-kit) for specification-driven development. Specs, plans, and tasks live in `.specify/` and feature-specific `specs/` directories.

### Workflow Commands

```bash
/speckit.constitution    # Define/update project governing principles
/speckit.specify         # Create feature specification from requirements
/speckit.plan            # Create technical implementation plan from spec
/speckit.tasks           # Generate actionable task breakdown from plan
/speckit.implement       # Execute implementation of tasks
```

### Optional Enhancement Commands

```bash
/speckit.clarify         # Resolve ambiguous areas before planning
/speckit.analyze         # Cross-artifact consistency check
/speckit.checklist       # Generate quality validation checklists
```

### Key Directories

- `.specify/memory/constitution.md` - Project constitution (governing principles)
- `.specify/templates/` - Templates for specs, plans, tasks, checklists
- `.specify/scripts/` - Helper scripts for the workflow
- `.claude/commands/` - Slash command definitions for Claude Code
- `specs/` - Feature specifications, plans, and task files (created per feature)

### Workflow Order

constitution → specify → plan → tasks → implement

### Architecture Notes

- **Microservice architecture**: Main app on Vercel + Renderer on Render.com
- **Renderer is a separate repo** (`ReelZero-Renderer`): Express/Fastify API with Remotion
- Main app communicates with renderer via `POST /render` HTTP call

## Active Technologies
- TypeScript 5.x (strict mode), Node.js 20+ + Next.js 14+ (App Router), React 18+, Tailwind CSS 3.x, shadcn/ui (Radix primitives), Zustand 4.x, ESLint 8.x (001-foundation)
- N/A for this feature (Supabase PostgreSQL configured in F003) (001-foundation)

## Recent Changes
- 001-foundation: Added TypeScript 5.x (strict mode), Node.js 20+ + Next.js 14+ (App Router), React 18+, Tailwind CSS 3.x, shadcn/ui (Radix primitives), Zustand 4.x, ESLint 8.x
