<!--
  Sync Impact Report
  ====================
  Version change: N/A → 1.0.0 (initial ratification)
  Modified principles: N/A (initial creation)
  Added sections:
    - Core Principles (7 principles)
    - Technology Stack & Constraints
    - Development Workflow & Quality Gates
    - Governance
  Removed sections: N/A
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ (no updates needed - generic template)
    - .specify/templates/spec-template.md ✅ (no updates needed - generic template)
    - .specify/templates/tasks-template.md ✅ (no updates needed - generic template)
    - .specify/templates/checklist-template.md ✅ (no updates needed - generic template)
    - .specify/templates/agent-file-template.md ✅ (no updates needed - generic template)
  Follow-up TODOs: None
-->

# ReelZero Constitution

## Core Principles

### I. AI Provider Abstraction

All AI service calls (text generation, image generation, TTS) MUST go through the
abstraction layer in `src/lib/ai/`. Direct API calls to Gemini, ElevenLabs, Imagen, or
any external AI provider from route handlers or components are forbidden.

- Text generation: `src/lib/ai/text-generation.ts`
- Image generation: `src/lib/ai/image-generation.ts`
- TTS: `src/lib/ai/tts.ts`
- Provider configuration: `src/lib/ai/config.ts`

All prompt strings MUST live in `src/lib/prompts/`. Inline prompt strings in route
handlers, services, or components are forbidden. Prompt builder functions accept typed
inputs and return formatted prompt strings.

**Rationale**: Enables provider swapping (Gemini to OpenAI, ElevenLabs to OpenAI TTS)
without modifying business logic. Centralizes prompt management for consistency and
iteration.

### II. Strict Type Safety

- No `any` type anywhere in the codebase. Use `unknown` with type guards for dynamic data.
- No nested ternaries. Extract to named functions for clarity.
- No magic numbers or strings. All constants MUST be defined in `src/lib/constants/`.
- All API responses MUST follow the standardized format:
  - Success: `{ data: { ... } }`
  - Error: `{ error: { code: string, message: string, details?: unknown } }`
- `AppError` with `ERROR_CODES` from `src/lib/errors/` is the only error pattern. Never
  throw raw `Error` instances or return ad-hoc error shapes from API routes.

**Rationale**: TypeScript strict mode is the first line of defense. Consistent error
shapes enable reliable client-side handling and debugging.

### III. Direct Imports Only

- No barrel files (`index.ts`) or re-export files.
- Import directly from source: `import { Button } from '@/components/ui/button'`.
- Import order (with blank line separators):
  1. Node built-ins
  2. External packages
  3. Internal aliases (`@/`)
  4. Relative imports
- One primary export per file. Named exports only (no default exports).

**Rationale**: Barrel files create hidden dependency chains, complicate tree-shaking, and
obscure where code lives. Direct imports make the dependency graph explicit.

### IV. Database Abstraction

- All database access MUST go through query functions in `src/lib/db/queries/`.
- No raw Supabase client calls in route handlers, services, or components.
- Each database table has its own query file (e.g., `videos.ts`, `users.ts`,
  `subscriptions.ts`).
- Route handler structure MUST follow: validate input → check permissions → execute
  business logic → return standardized response.
- Database schema changes MUST be documented and applied via migration scripts.

**Rationale**: Centralizing data access prevents SQL injection, ensures consistent query
patterns, and makes database provider migration feasible.

### V. Microservice Boundary

ReelZero is split into two independently deployable services:

| Service | Host | Responsibility |
|---------|------|----------------|
| Main App (`ReelZero`) | Vercel | UI, auth (Clerk), payments (Stripe), AI generation |
| Renderer (`ReelZero-Renderer`) | Render.com | Remotion video rendering, FFmpeg encoding |

- Communication between services is via HTTP (`POST /render`).
- Each service MUST be independently deployable and testable.
- Video specifications are fixed and MUST NOT be made configurable in MVP:
  - Aspect ratio: 9:16 (vertical)
  - Resolution: 1080x1920
  - Frame rate: 30 fps
  - Codec: H.264 (MP4)
  - Max scenes: 5
  - Duration: 50-60 seconds

**Rationale**: Vercel's serverless environment cannot run Remotion/FFmpeg. Separating
the renderer enables independent scaling, dedicated compute resources, and avoids
serverless timeout constraints.

### VI. Credit-Gated Operations

- Every video generation MUST check credit availability before starting.
- Credits are reserved (optimistic lock) before generation begins.
- Successful generation deducts the reserved credit permanently.
- Failed generation MUST refund the reserved credit automatically.
- Subscription tier determines available features and monthly credit limits.
- Stripe webhooks manage the full subscription lifecycle (creation, update,
  cancellation, invoice payment, payment failure).
- Credit balance MUST be enforced server-side. Client-side checks are for UX only.

**Rationale**: Credits are the monetization mechanism. Server-side enforcement prevents
abuse. Reserve-then-deduct prevents double-spend without blocking the user.

### VII. Consistent Naming & Structure

| Element | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `video-player.tsx` |
| Hooks | camelCase with `use` prefix | `useVideoGeneration.ts` |
| Functions/variables | camelCase | `generateScript()` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_SCENES` |
| Booleans | is/has/can prefix | `isLoading`, `hasCredits` |
| Service interfaces | `I` prefix | `ITextProvider` |
| Components | Named exports | `export function VideoPlayer()` |
| Tests | Collocated, `.test.ts` suffix | `text-generation.test.ts` |
| Commits | `type(scope): description` | `feat(video): add crossfade transition` |

- Test names describe behavior, not implementation:
  `it('returns script with 5 scenes for valid prompt')`.
- Commit types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`.

**Rationale**: Uniform conventions eliminate bikeshedding and make the codebase
navigable for any contributor without a style guide lookup.

## Technology Stack & Constraints

### Core Stack

- **Framework**: Next.js 14+ (App Router), React 18+, TypeScript (strict mode)
- **Styling**: Tailwind CSS, shadcn/ui (Radix primitives)
- **State Management**: Zustand
- **Video**: Remotion (composition + rendering)
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage (images, audio, videos)
- **Authentication**: Clerk (Google OAuth)
- **Payments**: Stripe (subscriptions, webhooks)
- **AI - Text**: Google Gemini Flash
- **AI - Image**: Google Imagen 3
- **AI - TTS**: ElevenLabs (with word-level alignment)

### Deployment

- Main app: Vercel (free tier)
- Renderer: Render.com (free/$7 tier)
- CDN: Supabase CDN for video delivery
- Monitoring: Vercel Analytics + Sentry

### Constraints

- Serverless function timeout on Vercel limits long-running tasks (renderer is separate)
- ElevenLabs free tier: 10,000 characters/month (~6-7 videos)
- Gemini free tier: 10 RPM, 250 RPD
- Supabase free tier: 1GB storage
- Video generation is synchronous in MVP (user waits ~70-90 seconds)

## Development Workflow & Quality Gates

### Pre-Commit Checks (NON-NEGOTIABLE)

Every commit MUST pass all three checks:

```bash
npm run lint         # ESLint - zero warnings, zero errors
npm run type-check   # TypeScript - strict mode, no errors
npm run build        # Next.js production build - must succeed
```

Combined as: `npm run pre-commit`

### Spec-Driven Development

This project uses GitHub Spec-Kit for structured development:

1. `/speckit.constitution` - Define project governing principles (this document)
2. `/speckit.specify` - Create feature specification from requirements
3. `/speckit.plan` - Create technical implementation plan from spec
4. `/speckit.tasks` - Generate actionable task breakdown from plan
5. `/speckit.implement` - Execute implementation of tasks

Feature specifications live in `specs/{feature-name}/` directories.

### Commit Conventions

- Format: `type(scope): description`
- Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
- Each commit MUST be atomic and independently revertible
- Run `npm run pre-commit` before every commit

## Governance

- This constitution supersedes all other coding practices and conventions in the project.
  When conflicts arise between this document and other guidance, this document wins.
- Amendments require: documentation of the change, rationale, and migration plan for
  any existing code that violates the new rule.
- Version numbering follows semantic versioning:
  - MAJOR: Principle removal or backward-incompatible redefinition
  - MINOR: New principle added or existing principle materially expanded
  - PATCH: Clarifications, wording fixes, non-semantic refinements
- All code reviews and PRs MUST verify compliance with these principles.
- Complexity beyond what is specified here MUST be justified in writing (in the PR
  description or plan document) before implementation.
- Reference documents: `CLAUDE.md` (agent guidance), `CODE_CONSTITUTION.md` (detailed
  code rules), `PRD.md` (product requirements), `ARCHITECTURE.md` (system design).

**Version**: 1.0.0 | **Ratified**: 2026-02-07 | **Last Amended**: 2026-02-07
