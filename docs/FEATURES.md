# Feature Breakdown - ReelZero MVP

**Based on:** [PRD v2.0 FINAL](PRD.md), [ARCHITECTURE.md v1.1](ARCHITECTURE.md)
**Spec-Kit workflow:** For each feature below, run:
`/speckit.specify` → `/speckit.plan` → `/speckit.tasks` → `/speckit.implement`

---

## Dependency Graph

```
F001 Foundation
 ├── F002 Design System & Frontend Standards
 │    └── F003 Auth (uses layout patterns, API patterns)
 │         └── F004 Database & User Sync
 │              ├── F005 AI Services (Script + Image + TTS)
 │              │    └── F007 Video Generation Wizard (UI)
 │              │         └── F008 Remotion Rendering Pipeline
 │              │              └── F009 Video Dashboard & Library
 │              └── F006 Credit & Billing
 │                   └── F007 (credit checks in wizard)
 └── F010 Landing Page
```

---

## F001 - Project Foundation & Scaffolding

**Branch:** `001-foundation`
**PRD Ref:** Section 4.1 (Technology Stack), Section 7.1 Week 1-2
**Blocks:** Every other feature

### Scope

- Initialize Next.js 14+ with App Router, TypeScript strict mode
- Configure Tailwind CSS + shadcn/ui (install base components)
- Set up project directory structure per [ARCHITECTURE.md Section 2](ARCHITECTURE.md#2-directory-structure)
- Configure ESLint, Prettier, path aliases (`@/`)
- Create `package.json` scripts: `dev`, `build`, `lint`, `type-check`, `pre-commit`
- Set up `.env.example` with all required environment variable placeholders
- Create error handling foundation: `AppError`, `ERROR_CODES`, error middleware
- Create constants files: `video.ts`, `pricing.ts`, `voices.ts`
- Create base TypeScript types: `video.ts`, `scene.ts`, `api.ts`, `database.ts`
- Set up Zustand store skeletons: `video-store.ts`, `user-store.ts`, `ui-store.ts`
- Configure `.gitignore` for Next.js + Supabase + environment files

### Deliverable

Running `npm run dev` serves empty Next.js app. `npm run pre-commit` passes.
All directory structure exists. Error system and types are ready for use.

### Estimated Complexity

Medium - lots of files but straightforward setup

---

## F002 - Design System & Frontend Standards

**Branch:** `002-design-system`
**PRD Ref:** Section 4.1 (Technology Stack)
**Depends on:** F001
**Blocks:** F003, F007, F009, F010 (every feature with UI)

### Scope

#### Visual Design Tokens

- Define brand color palette with primary accent hue (extend current neutral-only oklch tokens)
- Establish color usage rules: when to use `primary`, `secondary`, `accent`, `muted`, `destructive`
- Define gradient tokens if gradients are used (e.g., CTA buttons, hero backgrounds), or document "no gradients" as a conscious choice
- Define shadow/elevation scale: `shadow-sm`, `shadow-md`, `shadow-lg` with specific use cases (cards, modals, dropdowns)
- Verify border-radius scale usage rules: which radius for which component type (buttons, cards, inputs, modals)

#### Transitions & Motion

- Define standard transition durations: fast (150ms), normal (200ms), slow (300ms)
- Define standard easing curves (e.g., `ease-out` for entrances, `ease-in` for exits)
- Define hover/focus interaction patterns: color shift, scale, opacity, or combination
- Document when to animate vs. when to use instant state changes
- Configure reusable Tailwind transition classes (e.g., `transition-colors duration-200 ease-out`)

#### Page Layout & Spacing System

- Establish the "empty box" layout approach: every page starts as a full-viewport grid, divide into regions, then fill with components
- Define page-level grid system: use CSS Grid for page structure, Flexbox for component-level alignment
- Define spacing rhythm using `gap` on grid/flex containers — minimize use of `padding` for positioning
- Document standard page regions: header (fixed height), sidebar (fixed/collapsible width), main content (fluid), footer (optional)
- Define responsive breakpoints usage: mobile-first, with `sm`, `md`, `lg`, `xl` breakpoint behavior documented
- Define max content widths for different page types (full-bleed dashboard vs. centered form pages)

#### API Call Patterns (Client-Side)

- Create a minimal `src/lib/api/client.ts` fetch wrapper that:
  - Adds base URL and default headers (Content-Type, Accept)
  - Attaches auth credentials/session tokens automatically (no manual token passing per call)
  - Handles JSON parsing and typed responses
  - Returns consistent `{ data, error }` shape
  - Handles common HTTP errors (401 → redirect to sign-in, 403, 404, 500) in one place
- All client-side API calls MUST go through this wrapper — no raw `fetch()` in components or hooks
- Credential handling: auth tokens are attached at the wrapper level, never passed as function arguments or stored in component state

#### Navigation & Active State Patterns

- Define sidebar navigation active state styling (which tokens: `primary`, `accent`, or custom)
- Define mobile navigation behavior (hamburger toggle, slide-in direction, overlay vs. push)
- Define breadcrumb pattern if applicable, or document that flat nav is the standard
- Define tab/pill navigation styling for in-page section switching

### Deliverable

Updated `globals.css` with any new tokens. `src/lib/api/client.ts` fetch wrapper ready for use.
A `docs/DESIGN_SYSTEM.md` reference documenting all decisions: color usage, spacing rules,
transition standards, layout approach, API call patterns. All subsequent UI features
follow these standards.

### Estimated Complexity

Low-Medium - decisions and documentation with small amount of code (API wrapper, token updates)

---

## F003 - Authentication (Clerk)

**Branch:** `003-auth`
**PRD Ref:** Section 3.1.1
**Depends on:** F001, F002
**Blocks:** F004, F006, F007

### Scope

- Install and configure Clerk SDK (`@clerk/nextjs`)
- Set up Clerk environment variables
- Create auth route group `(auth)/` with sign-in and sign-up pages
- Create protected route group `(dashboard)/` with Clerk middleware
- Configure Google OAuth provider in Clerk dashboard
- Create `src/lib/auth/clerk.ts` (Clerk config)
- Create `src/lib/auth/middleware.ts` (auth helpers for API routes)
- Implement `ClerkProvider` in root layout
- Set up Clerk webhook endpoint `/api/auth/webhook` (user sync placeholder)
- Create dashboard layout shell: header with `UserButton`, sidebar navigation
- All API calls from dashboard use the fetch wrapper from F002

### Deliverable

Users can sign up/in via Google OAuth. Protected routes redirect to sign-in.
Dashboard shell renders for authenticated users.

### Estimated Complexity

Low-Medium - Clerk handles most of the heavy lifting

---

## F004 - Database Schema & User Sync

**Branch:** `004-database`
**PRD Ref:** Section 4.4 (Database Schema)
**Depends on:** F003
**Blocks:** F005, F006, F007

### Scope

- Create Supabase project and configure connection
- Install Supabase client (`@supabase/supabase-js`)
- Create `src/lib/db/client.ts` (Supabase client initialization)
- Implement full database schema from PRD Section 4.4:
  - `users` table (mirrors Clerk)
  - `subscriptions` table (with computed `credits_remaining`)
  - `videos` table (JSONB metadata)
  - `generation_logs` table
  - `uploaded_images` table
  - `usage_tracking` table
  - All indexes
- Create `src/lib/db/schema.ts` (TypeScript types matching schema)
- Create query files in `src/lib/db/queries/`:
  - `users.ts` - CRUD + findByClerkId
  - `videos.ts` - CRUD + listByUserId (paginated)
  - `subscriptions.ts` - CRUD + checkCredits + deductCredit
  - `usage.ts` - log actions + get stats
- Implement Clerk webhook handler: sync Clerk user → `users` table
- Create free-tier subscription automatically on user creation (3 credits)
- Set up Supabase Storage buckets: `videos`, `images`, `audio`, `thumbnails`

### Deliverable

Database is live. New Clerk signups automatically create a user row + free
subscription. All query functions are exported and typed.

### Estimated Complexity

Medium - schema is well-defined, mainly implementation work

---

## F005 - AI Service Integration (Script + Image + TTS)

**Branch:** `005-ai-services`
**PRD Ref:** [Section 5.1, 5.2](PRD.md#5-ai-service-integration-details), [ARCHITECTURE.md Section 11](ARCHITECTURE.md)
**Depends on:** F004
**Blocks:** F007, F008

### Scope

- Create AI provider abstraction layer in `src/lib/ai/`:
  - `types.ts` - TextGenerationInput/Output, ImageGenerationInput/Output, TTSInput/Output
  - `config.ts` - API keys, model names, rate limit configs
  - `text-generation.ts` - Gemini Flash integration (script generation)
  - `image-generation.ts` - Imagen 3 integration (scene images)
  - `tts.ts` - ElevenLabs integration (TTS with word-level alignment)
- Create prompt templates in `src/lib/prompts/`:
  - `script-generation.ts` - buildScriptPrompt()
  - `image-generation.ts` - buildImagePrompt()
  - `types.ts` - prompt input types
- Create API routes:
  - `POST /api/video/generate` - accepts prompt + preferences, returns structured script JSON
  - `POST /api/video/images` - accepts scene descriptions, returns image URLs (supports batch)
  - `POST /api/video/audio` - accepts full narration, returns audio + alignment data
- Create `POST /api/upload/image` - user image upload with validation + resize
- Implement image processing: validate format/size, resize to 1080x1920, upload to Supabase Storage
- Implement retry logic with exponential backoff for all external API calls
- Store generated assets (images, audio) in Supabase Storage

### Deliverable

All three AI endpoints work independently. Can generate a script, generate images
for each scene, generate audio with alignment data. User image upload works.

### Estimated Complexity

High - three different external APIs, error handling, file processing

---

## F006 - Credit System & Stripe Billing

**Branch:** `006-billing`
**PRD Ref:** Section 3.1.4, Section 6.1
**Depends on:** F004
**Blocks:** F007 (credit gating)

### Scope

- Install and configure Stripe SDK
- Create `src/lib/stripe/client.ts` - Stripe client
- Create `src/lib/stripe/products.ts` - define 4 tiers (Free/Basic/Pro/Enterprise) with Stripe Price IDs
- Create `src/lib/stripe/webhooks.ts` - webhook event handlers
- Create API routes:
  - `GET /api/subscription` - get current subscription + credit balance
  - `POST /api/subscription/checkout` - create Stripe Checkout session
  - `POST /api/subscription/portal` - create Stripe Customer Portal session
  - `POST /api/subscription/webhook` - handle Stripe webhook events
  - `GET /api/user/credits` - get credit balance
  - `GET /api/user/usage` - get usage statistics
- Implement credit logic in `src/lib/db/queries/subscriptions.ts`:
  - `checkCredits(userId)` - returns available credits + canGenerate boolean
  - `reserveCredit(userId)` - optimistic lock before generation
  - `deductCredit(userId, videoId)` - finalize after success
  - `refundCredit(userId)` - release on failure
- Handle Stripe webhook events:
  - `checkout.session.completed` - create subscription
  - `customer.subscription.updated` - update tier/credits
  - `customer.subscription.deleted` - cancel
  - `invoice.payment_succeeded` - reset monthly credits
  - `invoice.payment_failed` - grace period
- Create billing UI components:
  - `pricing-table.tsx` - 4 tier cards
  - `subscription-card.tsx` - current plan display
  - `credit-display.tsx` - header credit counter
- Create billing page at `(dashboard)/billing/page.tsx`

### Deliverable

Users can view pricing, subscribe via Stripe Checkout, manage subscription via
Stripe Portal. Credits are tracked and enforced server-side.

### Estimated Complexity

High - Stripe integration, webhook handling, credit state machine

---

## F007 - Video Generation Wizard (UI)

**Branch:** `007-video-wizard`
**PRD Ref:** Section 3.1.2 (Steps 1-4)
**Depends on:** F005, F006
**Blocks:** F008

### Scope

- Create multi-step wizard component at `(dashboard)/create/page.tsx`
- Create `src/components/video/video-wizard.tsx` - step orchestrator
- **Step 1 - Input Form:**
  - `PromptInput` - text prompt (50-500 chars, validation)
  - `VoiceSelector` - voice picker (ElevenLabs voice list)
  - `ThemeSelector` - visual theme (realistic/anime/artistic/cinematic/minimalist)
  - `CaptionStylePicker` - 3 caption styles
- **Step 2 - Script Editor:**
  - `ScriptEditor` - scene list with CRUD
  - `SceneCard` - editable narration + visual description
  - Add/delete scene controls (min 3, max 5)
  - Call `POST /api/video/generate` to get initial script
- **Step 3 - Image Selection:**
  - `ImageSelector` per scene - AI generate or upload toggle
  - `ImageUploader` - drag-drop with React Dropzone
  - "Generate All Images" bulk button
  - Image preview with replace option
  - Call `POST /api/video/images` or `POST /api/upload/image`
- **Step 4 - Settings Confirmation:**
  - `TransitionPicker` - fade or crossfade
  - Caption style confirmation
  - Settings summary before generation
- Create `src/store/video-store.ts` - full wizard state management with Zustand
- Create `src/hooks/use-video-generation.ts` - orchestration hook
- Integrate credit check before proceeding to generation (from F006)

### Deliverable

Complete multi-step wizard UI. User can input prompt → get script → edit scenes →
select/upload images → configure settings. All state managed in Zustand.
Ready to hand off to rendering pipeline.

### Estimated Complexity

High - complex multi-step UI, state management, multiple API calls

---

## F008 - Remotion Rendering Pipeline

**Branch:** `008-rendering`
**PRD Ref:** [Section 3.1.2 (Steps 5-6)](PRD.md#312-video-generation-workflow), [ARCHITECTURE.md Section 7](ARCHITECTURE.md)
**Depends on:** F007
**Blocks:** F009

### Scope

- **Remotion Compositions** (in `src/remotion/`):
  - `Root.tsx` - Remotion root
  - `Video.tsx` - main composition (1800 frames @ 30fps)
  - `Scene.tsx` - individual scene with image + Ken Burns effect
  - `transitions/Fade.tsx` - fade to black transition
  - `transitions/Crossfade.tsx` - crossfade transition
  - `captions/WordByWord.tsx` - word-by-word pop-in captions
  - `captions/FullSentence.tsx` - static sentence captions
  - `utils/timing.ts` - frame calculation helpers
  - `utils/interpolation.ts` - animation helpers
- **Synchronization Engine** (`src/lib/services/remotion/sync.ts`):
  - Parse ElevenLabs alignment data → word timings
  - Map words to scenes
  - Calculate exact scene start/end frames
  - Generate caption timing arrays
- **Render Orchestration** (`src/lib/services/remotion/render.ts`):
  - Build composition props from wizard state
  - Call renderer microservice (`POST /render` to Render.com)
  - Poll for render status
  - Upload final MP4 to Supabase Storage
  - Update video record in database
- **API Routes:**
  - `POST /api/video/render` - trigger rendering
  - `GET /api/video/render/status` - poll progress
- **Generation Progress UI** (`src/components/video/generation-progress.tsx`):
  - Stage indicator (audio → sync → render → finalize)
  - Progress bar
  - Estimated time display
- **Video Preview** (`src/components/video/video-player.tsx`):
  - Remotion Player wrapper
  - Play/pause, seek, volume
  - Download MP4 button
- Credit deduction on successful render, refund on failure

### Deliverable

End-to-end video generation works. User clicks "Generate Video" → sees progress →
gets playable video preview → can download MP4. Note: Renderer microservice
(ReelZero-Renderer) is a separate repo and must be set up independently.

### Estimated Complexity

Very High - Remotion compositions, synchronization math, microservice communication

---

## F009 - Video Dashboard & Library

**Branch:** `009-dashboard`
**PRD Ref:** Section 3.1.3
**Depends on:** F008

### Scope

- Create dashboard page at `(dashboard)/dashboard/page.tsx`:
  - `WelcomeCard` - greeting + quick stats
  - `QuickActions` - "Create Video" CTA
  - `RecentVideos` - last 3-5 videos
  - `UsageChart` - credits used this month
- Create video library at `(dashboard)/videos/page.tsx`:
  - `VideoGrid` / `VideoList` with toggle
  - `VideoCard` - thumbnail, title, duration, date, actions
  - Search by title/prompt
  - Filter by date, sort by newest/oldest
  - Pagination
- Create single video view at `(dashboard)/videos/[id]/page.tsx`:
  - Remotion Player (full preview)
  - Video metadata display
  - Download button
  - Delete button (with confirmation)
  - Regenerate option
- Create `GET /api/videos` - list user's videos (paginated, filterable)
- Create `GET /api/videos/:id` - single video details
- Create `DELETE /api/videos/:id` - delete video + storage cleanup
- Create usage stats components:
  - `StatsCard` - credits remaining, videos this month, storage used
  - `UsageChart` - monthly usage visualization

### Deliverable

Users have a complete dashboard with video library, search/filter, preview,
download, and delete capabilities.

### Estimated Complexity

Medium - standard CRUD UI, well-defined patterns

---

## F010 - Landing Page

**Branch:** `010-landing`
**PRD Ref:** Section 6.1 (pricing display), general marketing
**Depends on:** F001, F002
**Can be built in parallel with F003-F009**

### Scope

- Create landing page at `app/page.tsx`:
  - Hero section - headline, subheadline, CTA button
  - Features section - key selling points (speed, quality, ease)
  - How It Works - 3-step process visual
  - Pricing section - 4 tier cards (reuse `pricing-table.tsx` from F006 or build standalone)
  - FAQ section
  - Footer with links
- Mobile-responsive design (Tailwind breakpoints)
- SEO meta tags
- "Get Started" CTA → routes to sign-up

### Deliverable

Public-facing landing page that explains the product, shows pricing,
and drives sign-ups.

### Estimated Complexity

Low-Medium - static page with reusable components

---

## Implementation Order

### Phase 1: Foundation (F001 → F002 → F003 → F004)

Build the base. After this phase: design system established, app runs, users can sign in, database is ready.

```
/speckit.specify "Project foundation - Next.js scaffolding, directory structure, error system, types, constants"
/speckit.specify "Design system & frontend standards - color tokens, spacing system, layout approach, API wrapper, transition standards"
/speckit.specify "Clerk authentication - Google OAuth, protected routes, dashboard shell"
/speckit.specify "Database schema and user sync - Supabase tables, query layer, Clerk webhook, storage buckets"
```

### Phase 2: Core Services (F005 + F006 in parallel)

AI services and billing can be built in parallel since they share only the database layer.

```
/speckit.specify "AI service integration - Gemini script generation, Imagen 3 images, ElevenLabs TTS, image upload"
/speckit.specify "Credit system and Stripe billing - subscriptions, credit tracking, Stripe checkout and webhooks"
```

### Phase 3: Video Pipeline (F007 → F008)

The core product experience. Wizard feeds into rendering.

```
/speckit.specify "Video generation wizard - multi-step form, script editor, image selector, settings"
/speckit.specify "Remotion rendering pipeline - compositions, sync engine, render orchestration, progress UI, preview"
```

### Phase 4: Dashboard & Polish (F009 + F010 in parallel)

```
/speckit.specify "Video dashboard and library - video grid, search, filter, preview, download, delete, usage stats"
/speckit.specify "Landing page - hero, features, pricing, FAQ, responsive design"
```

---

## Feature Summary Table

| ID   | Feature                          | Depends On   | Complexity | Phase |
|------|----------------------------------|--------------|------------|-------|
| F001 | Foundation & Scaffolding         | -            | Medium     | 1     |
| F002 | Design System & Frontend Standards | F001       | Low-Medium | 1     |
| F003 | Authentication (Clerk)           | F001, F002   | Low-Medium | 1     |
| F004 | Database & User Sync             | F003         | Medium     | 1     |
| F005 | AI Services (Script+Image+TTS)   | F004         | High       | 2     |
| F006 | Credit System & Stripe           | F004         | High       | 2     |
| F007 | Video Generation Wizard          | F005, F006   | High       | 3     |
| F008 | Remotion Rendering Pipeline      | F007         | Very High  | 3     |
| F009 | Video Dashboard & Library        | F008         | Medium     | 4     |
| F010 | Landing Page                     | F001, F002   | Low-Medium | 4     |

---

## Implementation Status

> Last reviewed: 2026-02-14. All 10 features are complete and MVP-ready.

| ID   | Feature                          | Status     |
|------|----------------------------------|------------|
| F001 | Foundation & Scaffolding         | ✅ Complete |
| F002 | Design System & Frontend Standards | ✅ Complete |
| F003 | Authentication (Clerk)           | ✅ Complete |
| F004 | Database & User Sync             | ✅ Complete |
| F005 | AI Services (Script+Image+TTS)   | ✅ Complete |
| F006 | Credit System & Stripe           | ✅ Complete |
| F007 | Video Generation Wizard          | ✅ Complete |
| F008 | Remotion Rendering Pipeline      | ✅ Complete |
| F009 | Video Dashboard & Library        | ✅ Complete |
| F010 | Landing Page                     | ✅ Complete |

### Resolved Implementation Notes
- ✅ `userId` derived from `auth()` server-side on all API routes — never trusted from request body
- ✅ `reserveCredit()` used atomically before AI calls; `refundCredit()` on failure
- ✅ Rate limiting implemented via `src/lib/db/queries/rate-limits.ts` (Supabase-backed)
- ✅ Server-side `auth()` + redirect guards on all dashboard page components
- ✅ Stripe webhook idempotency via `stripe_webhook_events` table
