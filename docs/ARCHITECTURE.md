# System Architecture Document
## ReelZero - AI-Powered Reel/Shorts Creator

**Version:** 1.1
**Date:** January 31, 2026
**Based on:** PRD v2.0 FINAL

> **Architecture Note:** This system uses a microservice architecture with the main app on Vercel and a dedicated video rendering service on Render.com.

---

## 1. High-Level Architecture Overview

### 1.1 Multi-Service Architecture

ReelZero uses a **microservice architecture** with two separate deployments:

| Service | Repository | Host | Purpose |
|---------|------------|------|---------|
| **Main App** | `ReelZero` | Vercel (free) | UI, Auth, Payments, AI generation |
| **Renderer** | `ReelZero-Renderer` | Render.com (free/$7) | Video rendering with Remotion |

### 1.2 System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Next.js    │  │   Remotion   │  │    Zustand   │  │    React     │   │
│  │   App Router │  │   Player     │  │    Store     │  │   Dropzone   │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
└─────────┼──────────────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │                  │
          └──────────────────┴────────┬─────────┴──────────────────┘
                                      │ HTTPS
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     MAIN APP - VERCEL (ReelZero)                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │ /api/auth   │ │ /api/video  │ │ /api/upload │ │ /api/subscription   │   │
│  │   (Clerk)   │ │  generate   │ │   images    │ │    (Stripe)         │   │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────────┬──────────┘   │
│         │               │               │                   │              │
│         ▼               ▼               ▼                   ▼              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │   Script    │ │   Image     │ │   Audio     │ │   Render Client     │   │
│  │   Service   │ │   Service   │ │   Service   │ │   (HTTP call)       │   │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────────┬──────────┘   │
└─────────┼───────────────┼───────────────┼───────────────────┼──────────────┘
          │               │               │                   │
          ▼               ▼               ▼                   │
┌──────────────────────────────────────────────┐              │
│              EXTERNAL AI SERVICES            │              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │              │
│  │   Gemini    │ │   Imagen    │ │Eleven   │ │              │
│  │   Flash     │ │     3       │ │Labs TTS │ │              │
│  └─────────────┘ └─────────────┘ └─────────┘ │              │
└──────────────────────────────────────────────┘              │
                                                              │
                    ┌─────────────────────────────────────────┘
                    │ POST /render
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│               RENDERER MICROSERVICE - RENDER.COM (ReelZero-Renderer)         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Express/Fastify API                           │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │   │
│  │  │  POST /render   │  │  GET /health    │  │  GET /status/:id    │  │   │
│  │  └────────┬────────┘  └─────────────────┘  └─────────────────────┘  │   │
│  │           │                                                          │   │
│  │           ▼                                                          │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │                   Remotion Renderer                          │    │   │
│  │  │  • Download assets (images, audio)                           │    │   │
│  │  │  • Build composition                                         │    │   │
│  │  │  • Render frames (headless Chrome)                           │    │   │
│  │  │  • Encode with FFmpeg (H.264)                                 │    │   │
│  │  │  • Upload to Supabase Storage                                 │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                         │
│  ┌───────────────────────┐              ┌───────────────────────────────┐   │
│  │   Supabase Postgres   │              │      Supabase Storage         │   │
│  │   • users             │              │      • /videos/{user_id}/     │   │
│  │   • subscriptions     │              │      • /images/{user_id}/     │   │
│  │   • videos            │              │      • /thumbnails/           │   │
│  │   • generation_logs   │              │      • /audio/                │   │
│  │   • uploaded_images   │              │                               │   │
│  │   • usage_tracking    │              │                               │   │
│  └───────────────────────┘              └───────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```
/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth routes group
│   │   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   │   └── sign-up/[[...sign-up]]/page.tsx
│   │   ├── (dashboard)/              # Protected routes group
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx          # Main dashboard
│   │   │   ├── create/
│   │   │   │   └── page.tsx          # Video creation wizard
│   │   │   ├── videos/
│   │   │   │   ├── page.tsx          # Video library
│   │   │   │   └── [id]/page.tsx     # Single video view
│   │   │   ├── settings/
│   │   │   │   └── page.tsx          # User settings
│   │   │   └── billing/
│   │   │       └── page.tsx          # Subscription management
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── webhook/route.ts  # Clerk webhook handler
│   │   │   ├── video/
│   │   │   │   ├── generate/route.ts # Script generation
│   │   │   │   ├── images/route.ts   # Image generation
│   │   │   │   ├── audio/route.ts    # TTS generation
│   │   │   │   ├── render/route.ts   # Video rendering
│   │   │   │   └── [id]/route.ts     # CRUD operations
│   │   │   ├── upload/
│   │   │   │   └── route.ts          # Image upload handling
│   │   │   ├── subscription/
│   │   │   │   ├── route.ts          # Subscription management
│   │   │   │   └── webhook/route.ts  # Stripe webhook
│   │   │   └── user/
│   │   │       └── credits/route.ts  # Credit operations
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Landing page
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components (auto-generated)
│   │   │   ├── button.tsx            # npx shadcn add button
│   │   │   ├── card.tsx              # npx shadcn add card
│   │   │   ├── dialog.tsx            # npx shadcn add dialog
│   │   │   ├── dropdown-menu.tsx     # npx shadcn add dropdown-menu
│   │   │   ├── input.tsx             # npx shadcn add input
│   │   │   ├── label.tsx             # npx shadcn add label
│   │   │   ├── progress.tsx          # npx shadcn add progress
│   │   │   ├── select.tsx            # npx shadcn add select
│   │   │   ├── skeleton.tsx          # npx shadcn add skeleton
│   │   │   ├── slider.tsx            # npx shadcn add slider
│   │   │   ├── switch.tsx            # npx shadcn add switch
│   │   │   ├── tabs.tsx              # npx shadcn add tabs
│   │   │   ├── textarea.tsx          # npx shadcn add textarea
│   │   │   ├── toast.tsx             # npx shadcn add toast
│   │   │   ├── toaster.tsx           # npx shadcn add toast
│   │   │   └── tooltip.tsx           # npx shadcn add tooltip
│   │   ├── layout/
│   │   │   ├── header.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── footer.tsx
│   │   │   └── dashboard-layout.tsx
│   │   ├── video/
│   │   │   ├── video-wizard.tsx      # Multi-step creation form
│   │   │   ├── script-editor.tsx     # Scene editing UI
│   │   │   ├── scene-card.tsx        # Individual scene component
│   │   │   ├── image-selector.tsx    # AI/upload image choice
│   │   │   ├── image-uploader.tsx    # Drag-drop upload
│   │   │   ├── voice-selector.tsx    # Voice options
│   │   │   ├── caption-style.tsx     # Caption style picker
│   │   │   ├── transition-picker.tsx # Transition selection
│   │   │   ├── generation-progress.tsx
│   │   │   └── video-player.tsx      # Remotion Player wrapper
│   │   ├── dashboard/
│   │   │   ├── video-grid.tsx
│   │   │   ├── video-card.tsx
│   │   │   ├── stats-card.tsx
│   │   │   └── usage-chart.tsx
│   │   └── billing/
│   │       ├── pricing-table.tsx
│   │       ├── subscription-card.tsx
│   │       └── credit-display.tsx
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── client.ts             # Supabase client
│   │   │   ├── schema.ts             # TypeScript types from schema
│   │   │   └── queries/
│   │   │       ├── users.ts
│   │   │       ├── videos.ts
│   │   │       ├── subscriptions.ts
│   │   │       └── usage.ts
│   │   ├── ai/                       # AI Provider Abstraction
│   │   │   ├── text-generation.ts    # Text generation (provider-agnostic)
│   │   │   ├── image-generation.ts   # Image generation (provider-agnostic)
│   │   │   ├── tts.ts                # Text-to-speech (provider-agnostic)
│   │   │   ├── types.ts              # AI input/output interfaces
│   │   │   └── config.ts             # Provider configs (endpoints, keys)
│   │   ├── prompts/                  # Centralized Prompts
│   │   │   ├── script-generation.ts  # Script generation prompts
│   │   │   ├── image-generation.ts   # Image generation prompts
│   │   │   └── types.ts              # Prompt input types
│   │   ├── errors/                   # Error Handling System
│   │   │   ├── codes.ts              # ERROR_CODES enum
│   │   │   ├── messages.ts           # Error code → message mapping
│   │   │   ├── AppError.ts           # Base error class
│   │   │   └── middleware.ts         # Error handling middleware
│   │   ├── services/
│   │   │   ├── remotion/
│   │   │   │   ├── render.ts         # Render orchestration
│   │   │   │   └── sync.ts           # Audio-scene synchronization
│   │   │   └── storage/
│   │   │       ├── upload.ts         # File upload handling
│   │   │       └── cdn.ts            # CDN URL generation
│   │   ├── auth/
│   │   │   ├── clerk.ts              # Clerk configuration
│   │   │   └── middleware.ts         # Auth middleware helpers
│   │   ├── stripe/
│   │   │   ├── client.ts             # Stripe client
│   │   │   ├── products.ts           # Product/price definitions
│   │   │   └── webhooks.ts           # Webhook handlers
│   │   ├── utils/
│   │   │   ├── image.ts              # Image processing utils
│   │   │   ├── time.ts               # Duration calculations
│   │   │   └── validation.ts         # Input validation
│   │   └── constants/
│   │       ├── video.ts              # Video specs constants
│   │       ├── pricing.ts            # Pricing tiers
│   │       └── voices.ts             # Voice options
│   │
│   ├── store/
│   │   ├── video-store.ts            # Video creation state
│   │   ├── user-store.ts             # User/subscription state
│   │   └── ui-store.ts               # UI state (modals, etc.)
│   │
│   ├── hooks/
│   │   ├── use-video-generation.ts   # Video gen orchestration
│   │   ├── use-subscription.ts       # Subscription state
│   │   ├── use-credits.ts            # Credit management
│   │   └── use-upload.ts             # File upload logic
│   │
│   ├── types/
│   │   ├── video.ts                  # Video-related types
│   │   ├── scene.ts                  # Scene types
│   │   ├── api.ts                    # API request/response types
│   │   └── database.ts               # Database types
│   │
│   └── remotion/
│       ├── Root.tsx                  # Remotion root component
│       ├── Video.tsx                 # Main video composition
│       ├── Scene.tsx                 # Scene component
│       ├── transitions/
│       │   ├── Fade.tsx
│       │   └── Crossfade.tsx
│       ├── captions/
│       │   ├── WordByWord.tsx
│       │   └── FullSentence.tsx
│       └── utils/
│           ├── timing.ts             # Frame calculations
│           └── interpolation.ts      # Animation helpers
│
├── public/
│   ├── fonts/
│   └── images/
│
├── prisma/                           # Alternative to raw SQL
│   └── schema.prisma                 # (Optional: if using Prisma)
│
├── scripts/
│   ├── setup-db.ts                   # Database setup
│   └── seed.ts                       # Seed data
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.local                        # Local environment
├── .env.example                      # Environment template
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 3. Core Data Flow

### 3.1 Video Generation Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VIDEO GENERATION FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 1: USER INPUT
┌─────────────────┐
│   User submits  │
│   • prompt      │──────────────────────────────────────────┐
│   • voice       │                                          │
│   • theme       │                                          │
│   • captions    │                                          │
└─────────────────┘                                          │
                                                             ▼
STEP 2: SCRIPT GENERATION                           ┌─────────────────┐
┌─────────────────┐                                 │   POST /api/    │
│  Gemini Flash   │◄────────────────────────────────│ video/generate  │
│  Flash API      │                                 └────────┬────────┘
│                 │                                          │
│  Input: prompt  │                                          │
│  Output: JSON   │──────────────────────────────────────────┤
│  • 5 scenes     │                                          │
│  • narration    │                                          │
│  • descriptions │                                          │
└─────────────────┘                                          │
                                                             ▼
STEP 3: USER EDITING                                ┌─────────────────┐
┌─────────────────┐                                 │  Script Editor  │
│  Client-side    │◄────────────────────────────────│  Component      │
│  state (Zustand)│                                 └────────┬────────┘
│                 │                                          │
│  Actions:       │                                          │
│  • Edit text    │──────────────────────────────────────────┤
│  • Add scene    │                                          │
│  • Delete scene │                                          │
└─────────────────┘                                          │
                                                             ▼
STEP 4: IMAGE GENERATION                            ┌─────────────────┐
┌─────────────────┐                                 │ POST /api/video │
│  Per scene:     │◄────────────────────────────────│    /images      │
│                 │                                 └────────┬────────┘
│  Option A:      │                                          │
│  Gemini Image   │     ┌─────────────────┐                 │
│  1024x1024      │────►│ Resize to       │                 │
│                 │     │ 1080x1920       │                 │
│  Option B:      │     │ (letterbox)     │                 │
│  User upload    │────►│                 │                 │
│  5MB max        │     └────────┬────────┘                 │
└─────────────────┘              │                          │
                                 ▼                          │
                        ┌─────────────────┐                 │
                        │ Supabase Storage│                 │
                        │ /images/{id}/   │─────────────────┤
                        └─────────────────┘                 │
                                                            ▼
STEP 5: AUDIO GENERATION                            ┌─────────────────┐
┌─────────────────┐                                 │ POST /api/video │
│  ElevenLabs     │◄────────────────────────────────│    /audio       │
│  TTS API        │                                 └────────┬────────┘
│                 │                                          │
│  Input:         │                                          │
│  • Full script  │                                          │
│  • Voice ID     │                                          │
│                 │                                          │
│  Output:        │                                          │
│  • MP3 audio    │──────────────────────────────────────────┤
│  • Alignment    │                                          │
│    metadata     │                                          │
└─────────────────┘                                          │
                                                             ▼
STEP 6: SYNCHRONIZATION                             ┌─────────────────┐
┌─────────────────┐                                 │  Sync Engine    │
│  Calculate:     │◄────────────────────────────────│  (Server-side)  │
│                 │                                 └────────┬────────┘
│  • Scene start  │                                          │
│  • Scene end    │                                          │
│  • Word timings │                                          │
│  • Total frames │──────────────────────────────────────────┤
│                 │                                          │
└─────────────────┘                                          │
                                                             ▼
STEP 7: REMOTION RENDER                             ┌─────────────────┐
┌─────────────────┐                                 │ POST /api/video │
│  Remotion       │◄────────────────────────────────│    /render      │
│  @remotion/     │                                 └────────┬────────┘
│  renderer       │                                          │
│                 │                                          │
│  • Build comp   │                                          │
│  • Frame render │                                          │
│  • FFmpeg encode│                                          │
│  • Output MP4   │──────────────────────────────────────────┤
│                 │                                          │
│  ~40-60 seconds │                                          │
└─────────────────┘                                          │
                                                             ▼
STEP 8: STORAGE & DELIVERY                          ┌─────────────────┐
┌─────────────────┐                                 │  Final Response │
│  Supabase       │◄────────────────────────────────│  to Client      │
│  Storage        │                                 └────────┬────────┘
│                 │                                          │
│  • Store MP4    │                                          │
│  • Generate URL │                                          │
│  • CDN delivery │──────────────────────────────────────────┘
│                 │
└─────────────────┘

TOTAL TIME: 70-90 seconds
```

### 3.2 State Machine for Video Generation

```
┌─────────────┐
│    IDLE     │
└──────┬──────┘
       │ User clicks "Generate"
       ▼
┌─────────────┐
│  GENERATING │──────────────────────────┐
│   SCRIPT    │                          │
└──────┬──────┘                          │
       │ Script ready                    │ Error
       ▼                                 ▼
┌─────────────┐                    ┌─────────────┐
│   EDITING   │                    │   FAILED    │
│   SCRIPT    │                    │             │
└──────┬──────┘                    └─────────────┘
       │ User confirms                   ▲
       ▼                                 │
┌─────────────┐                          │
│  GENERATING │──────────────────────────┤
│   IMAGES    │                          │
└──────┬──────┘                          │
       │ Images ready                    │
       ▼                                 │
┌─────────────┐                          │
│  GENERATING │──────────────────────────┤
│    AUDIO    │                          │
└──────┬──────┘                          │
       │ Audio ready                     │
       ▼                                 │
┌─────────────┐                          │
│   SYNCING   │──────────────────────────┤
│   TIMING    │                          │
└──────┬──────┘                          │
       │ Timing calculated               │
       ▼                                 │
┌─────────────┐                          │
│  RENDERING  │──────────────────────────┘
│    VIDEO    │
└──────┬──────┘
       │ Render complete
       ▼
┌─────────────┐
│  COMPLETED  │
│             │
└─────────────┘
```

---

## 4. Component Architecture

### 4.1 Frontend Component Tree

```
App
├── ClerkProvider
│   └── QueryClientProvider
│       ├── LandingPage
│           │   ├── Hero
│           │   ├── Features
│           │   ├── Pricing
│           │   └── CTA
│           │
│       └── DashboardLayout
│               ├── Header
│               │   ├── Logo
│               │   ├── Navigation
│               │   ├── CreditDisplay
│               │   └── UserMenu
│               │
│               ├── Sidebar
│               │   ├── NavLinks
│               │   └── UsageStats
│               │
│               └── MainContent
│                   │
│                   ├── Dashboard (/)
│                   │   ├── WelcomeCard
│                   │   ├── QuickActions
│                   │   ├── RecentVideos
│                   │   └── UsageChart
│                   │
│                   ├── CreateVideo (/create)
│                   │   └── VideoWizard
│                   │       ├── Step1_InputForm
│                   │       │   ├── PromptInput
│                   │       │   ├── VoiceSelector
│                   │       │   ├── ThemeSelector
│                   │       │   └── CaptionStylePicker
│                   │       │
│                   │       ├── Step2_ScriptEditor
│                   │       │   ├── SceneList
│                   │       │   │   └── SceneCard (×5)
│                   │       │   │       ├── NarrationEditor
│                   │       │   │       ├── DescriptionEditor
│                   │       │   │       └── SceneActions
│                   │       │   └── AddSceneButton
│                   │       │
│                   │       ├── Step3_ImageSelection
│                   │       │   ├── ImageGrid
│                   │       │   │   └── ImageSelector (×5)
│                   │       │   │       ├── AIGenerateButton
│                   │       │   │       ├── UploadButton
│                   │       │   │       └── ImagePreview
│                   │       │   └── GenerateAllButton
│                   │       │
│                   │       ├── Step4_Settings
│                   │       │   ├── TransitionPicker
│                   │       │   ├── CaptionConfirm
│                   │       │   └── SettingsSummary
│                   │       │
│                   │       ├── Step5_Generation
│                   │       │   └── GenerationProgress
│                   │       │       ├── StageIndicator
│                   │       │       ├── ProgressBar
│                   │       │       └── TimeRemaining
│                   │       │
│                   │       └── Step6_Preview
│                   │           ├── VideoPlayer (Remotion)
│                   │           ├── DownloadButton
│                   │           └── RegenerateButton
│                   │
│                   ├── VideoLibrary (/videos)
│                   │   ├── SearchBar
│                   │   ├── FilterControls
│                   │   ├── ViewToggle (Grid/List)
│                   │   └── VideoGrid
│                   │       └── VideoCard (×n)
│                   │           ├── Thumbnail
│                   │           ├── Title
│                   │           ├── Duration
│                   │           ├── Date
│                   │           └── Actions
│                   │
│                   ├── VideoDetail (/videos/[id])
│                   │   ├── VideoPlayer
│                   │   ├── VideoInfo
│                   │   └── VideoActions
│                   │
│                   ├── Settings (/settings)
│                   │   ├── ProfileSection
│                   │   ├── PreferencesSection
│                   │   └── DangerZone
│                   │
│                   └── Billing (/billing)
│                       ├── CurrentPlan
│                       ├── UsageBreakdown
│                       ├── PricingTable
│                       └── BillingHistory
```

### 4.2 Service Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SERVICE LAYER                                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  VideoService                                                                │
│  ─────────────                                                               │
│  Orchestrates the entire video generation pipeline                          │
│                                                                              │
│  Methods:                                                                    │
│  • generateScript(prompt, options) → Script                                 │
│  • generateImages(scenes) → ImageUrls[]                                     │
│  • generateAudio(script, voiceId) → AudioData                               │
│  • synchronize(audio, scenes) → TimingData                                  │
│  • renderVideo(composition) → VideoUrl                                      │
│  • createVideo(input) → Video (full orchestration)                          │
│                                                                              │
│  Dependencies: GeminiService, ElevenLabsService, RemotionService, Storage  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  GeminiService      │  │  ElevenLabsService  │  │  RemotionService    │
│  ──────────────     │  │  ─────────────────  │  │  ───────────────    │
│                     │  │                     │  │                     │
│  • generateScript() │  │  • synthesize()     │  │  • buildComp()      │
│  • generateImage()  │  │  • getAlignment()   │  │  • render()         │
│  • batchGenImages() │  │  • listVoices()     │  │  • getProgress()    │
│                     │  │                     │  │                     │
│  Config:            │  │  Config:            │  │  Config:            │
│  • API key          │  │  • API key          │  │  • Output dir       │
│  • Rate limits      │  │  • Voice settings   │  │  • FFmpeg path      │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
            │                       │                       │
            └───────────────────────┼───────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  StorageService                                                              │
│  ──────────────                                                              │
│                                                                              │
│  Methods:                                                                    │
│  • uploadImage(file, userId) → url                                          │
│  • uploadVideo(file, userId) → url                                          │
│  • uploadAudio(file, videoId) → url                                         │
│  • deleteFile(path) → void                                                  │
│  • getSignedUrl(path) → url                                                 │
│                                                                              │
│  Config: Supabase bucket, CDN settings                                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  SubscriptionService                                                         │
│  ───────────────────                                                         │
│                                                                              │
│  Methods:                                                                    │
│  • getSubscription(userId) → Subscription                                   │
│  • checkCredits(userId) → { available: number, canGenerate: boolean }       │
│  • deductCredit(userId, videoId) → void                                     │
│  • upgradeSubscription(userId, tier) → void                                 │
│  • handleWebhook(event) → void                                              │
│                                                                              │
│  Dependencies: Stripe, Database                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  UserService                                                                 │
│  ───────────                                                                 │
│                                                                              │
│  Methods:                                                                    │
│  • syncFromClerk(clerkUser) → User                                          │
│  • getUser(clerkId) → User                                                  │
│  • updateUser(userId, data) → User                                          │
│  • deleteUser(userId) → void                                                │
│                                                                              │
│  Dependencies: Clerk, Database                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Database Schema

### 5.1 Entity Relationship Diagram

```
┌──────────────────────┐       ┌──────────────────────┐
│        users         │       │    subscriptions     │
├──────────────────────┤       ├──────────────────────┤
│ id (PK)              │──┐    │ id (PK)              │
│ clerk_user_id (UK)   │  │    │ user_id (FK)         │──┐
│ email (UK)           │  │    │ tier                 │  │
│ name                 │  │    │ status               │  │
│ created_at           │  │    │ credits_total        │  │
│ updated_at           │  │    │ credits_used         │  │
└──────────────────────┘  │    │ credits_remaining    │  │
                          │    │ billing_cycle_start  │  │
                          │    │ billing_cycle_end    │  │
                          │    │ stripe_subscription_id│  │
                          │    │ created_at           │  │
                          │    │ updated_at           │  │
                          │    └──────────────────────┘  │
                          │                              │
                          │    ┌──────────────────────┐  │
                          └───►│       videos         │◄─┘
                               ├──────────────────────┤
                          ┌───►│ id (PK)              │
                          │    │ user_id (FK)         │
                          │    │ title                │
                          │    │ prompt               │
                          │    │ duration_seconds     │
                          │    │ status               │
                          │    │ video_url            │
                          │    │ thumbnail_url        │
                          │    │ storage_path         │
                          │    │ file_size_bytes      │
                          │    │ metadata (JSONB)     │
                          │    │ created_at           │
                          │    │ updated_at           │
                          │    └──────────────────────┘
                          │                    │
                          │                    │
         ┌────────────────┴────────┐           │
         │                         │           │
         ▼                         ▼           ▼
┌──────────────────────┐  ┌──────────────────────┐
│   uploaded_images    │  │   generation_logs    │
├──────────────────────┤  ├──────────────────────┤
│ id (PK)              │  │ id (PK)              │
│ user_id (FK)         │  │ video_id (FK)        │
│ video_id (FK)        │  │ stage                │
│ original_filename    │  │ status               │
│ storage_path         │  │ duration_ms          │
│ file_size_bytes      │  │ error_message        │
│ mime_type            │  │ created_at           │
│ created_at           │  └──────────────────────┘
└──────────────────────┘

┌──────────────────────┐
│   usage_tracking     │
├──────────────────────┤
│ id (PK)              │
│ user_id (FK)         │
│ action               │
│ credits_used         │
│ metadata (JSONB)     │
│ created_at           │
└──────────────────────┘
```

### 5.2 Video Metadata JSONB Structure

```json
{
  "settings": {
    "voice_id": "string",
    "voice_name": "string",
    "caption_style": "word_by_word | full_sentence | none",
    "transition_type": "fade | crossfade",
    "visual_theme": "realistic | anime | artistic | etc"
  },
  "scenes": [
    {
      "scene_number": 1,
      "narration": "Welcome to our exploration...",
      "visual_description": "Wide shot of a lush green forest...",
      "duration_seconds": 12,
      "start_frame": 0,
      "end_frame": 360,
      "image_source": "ai | user",
      "image_url": "https://..."
    }
  ],
  "audio": {
    "url": "https://...",
    "duration_seconds": 58.5,
    "alignment": {
      "words": [
        { "word": "Welcome", "start": 0.0, "end": 0.45 },
        { "word": "to", "start": 0.45, "end": 0.55 }
      ]
    }
  },
  "render": {
    "fps": 30,
    "total_frames": 1800,
    "width": 1080,
    "height": 1920,
    "codec": "h264",
    "bitrate": "2.5M"
  }
}
```

---

## 6. API Specification

### 6.1 API Endpoints

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API ROUTES                                         │
└─────────────────────────────────────────────────────────────────────────────┘

AUTHENTICATION (handled by Clerk)
─────────────────────────────────
POST   /api/auth/webhook          # Clerk webhook for user sync

VIDEO GENERATION
────────────────
POST   /api/video/generate        # Generate script from prompt
POST   /api/video/images          # Generate/batch generate images
POST   /api/video/audio           # Generate TTS audio
POST   /api/video/render          # Trigger video rendering
GET    /api/video/render/status   # Check render progress

VIDEO CRUD
──────────
GET    /api/videos                # List user's videos (paginated)
GET    /api/videos/:id            # Get single video details
DELETE /api/videos/:id            # Delete video

FILE UPLOAD
───────────
POST   /api/upload/image          # Upload user image
DELETE /api/upload/image/:id      # Delete uploaded image

SUBSCRIPTION
────────────
GET    /api/subscription          # Get current subscription
POST   /api/subscription/checkout # Create Stripe checkout session
POST   /api/subscription/portal   # Create Stripe portal session
POST   /api/subscription/webhook  # Stripe webhook handler

USER
────
GET    /api/user/credits          # Get credit balance
GET    /api/user/usage            # Get usage statistics
```

### 6.2 Key Request/Response Schemas

```typescript
// POST /api/video/generate
interface GenerateScriptRequest {
  prompt: string;           // 50-500 chars
  voice_id: string;
  visual_theme: 'realistic' | 'anime' | 'artistic' | 'cinematic' | 'minimalist';
  caption_style: 'word_by_word' | 'full_sentence' | 'none';
}

interface GenerateScriptResponse {
  script_id: string;
  total_duration: number;
  scenes: Scene[];
}

interface Scene {
  scene_number: number;
  narration: string;
  visual_description: string;
  duration_seconds: number;
  keywords: string[];
}

// POST /api/video/images
interface GenerateImagesRequest {
  script_id: string;
  scenes: {
    scene_number: number;
    source: 'ai' | 'upload';
    upload_id?: string;     // If source is 'upload'
  }[];
}

interface GenerateImagesResponse {
  images: {
    scene_number: number;
    url: string;
    source: 'ai' | 'upload';
  }[];
}

// POST /api/video/render
interface RenderVideoRequest {
  script_id: string;
  transition_type: 'fade' | 'crossfade';
  caption_style: 'word_by_word' | 'full_sentence' | 'none';
}

interface RenderVideoResponse {
  video_id: string;
  status: 'processing';
  estimated_time_seconds: number;
}

// GET /api/video/render/status
interface RenderStatusResponse {
  video_id: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;           // 0-100
  current_stage: string;      // 'audio' | 'sync' | 'render' | 'finalize'
  video_url?: string;         // Present when completed
  error?: string;             // Present when failed
}
```

---

## 7. Remotion Composition Structure

### 7.1 Composition Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       REMOTION COMPOSITION                                   │
└─────────────────────────────────────────────────────────────────────────────┘

VideoComposition (1800 frames @ 30fps = 60s)
│
├── Audio
│   └── <Audio src={audioUrl} />
│
├── Scenes (Sequential)
│   │
│   ├── Scene 1 (frames 0-360)
│   │   ├── <Img src={scene1Image} />
│   │   ├── <Transition type="fade" />
│   │   └── <Captions words={scene1Words} style="word_by_word" />
│   │
│   ├── Scene 2 (frames 360-720)
│   │   ├── <Img src={scene2Image} />
│   │   ├── <Transition type="fade" />
│   │   └── <Captions words={scene2Words} style="word_by_word" />
│   │
│   ├── Scene 3 (frames 720-1080)
│   │   └── ...
│   │
│   ├── Scene 4 (frames 1080-1440)
│   │   └── ...
│   │
│   └── Scene 5 (frames 1440-1800)
│       └── ...
│
└── Watermark (Free tier only)
    └── <Logo position="bottom-right" opacity={0.5} />
```

### 7.2 Frame Calculation Logic

```typescript
// Video constants
const FPS = 30;
const TOTAL_DURATION_SECONDS = 60;
const TOTAL_FRAMES = FPS * TOTAL_DURATION_SECONDS; // 1800

// Scene timing calculation from audio alignment
function calculateSceneTimings(
  scenes: Scene[],
  audioAlignment: WordAlignment[]
): SceneTiming[] {
  const timings: SceneTiming[] = [];
  let currentFrame = 0;

  for (const scene of scenes) {
    const durationFrames = Math.round(scene.duration_seconds * FPS);

    timings.push({
      scene_number: scene.scene_number,
      start_frame: currentFrame,
      end_frame: currentFrame + durationFrames,
      duration_frames: durationFrames,
      words: getWordsForScene(scene, audioAlignment)
    });

    currentFrame += durationFrames;
  }

  return timings;
}

// Word-level timing for captions
interface WordTiming {
  word: string;
  start_frame: number;
  end_frame: number;
}

function getWordTimings(
  words: WordAlignment[],
  sceneStartFrame: number
): WordTiming[] {
  return words.map(w => ({
    word: w.word,
    start_frame: Math.round(w.start * FPS) + sceneStartFrame,
    end_frame: Math.round(w.end * FPS) + sceneStartFrame
  }));
}
```

---

## 8. Authentication & Authorization Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AUTH FLOW (Clerk)                                     │
└─────────────────────────────────────────────────────────────────────────────┘

1. SIGN UP / SIGN IN
   ┌─────────────┐
   │   User      │
   │   Browser   │
   └──────┬──────┘
          │
          │ OAuth (Google)
          ▼
   ┌─────────────┐
   │   Clerk     │──────────────────┐
   │   Hosted    │                  │
   └──────┬──────┘                  │
          │                         │ Webhook
          │ Session Token           │
          ▼                         ▼
   ┌─────────────┐          ┌─────────────┐
   │  Next.js    │          │  /api/auth  │
   │  Middleware │          │  /webhook   │
   └──────┬──────┘          └──────┬──────┘
          │                        │
          │ Verify Token           │ Sync user to DB
          ▼                        ▼
   ┌─────────────┐          ┌─────────────┐
   │  Protected  │          │  Supabase   │
   │  Routes     │          │  Database   │
   └─────────────┘          └─────────────┘


2. API REQUEST AUTHORIZATION
   ┌─────────────┐
   │  Client     │
   │  Request    │
   └──────┬──────┘
          │ Authorization: Bearer <session_token>
          ▼
   ┌─────────────────────────────────────────┐
   │           API MIDDLEWARE                 │
   │  ┌─────────────────────────────────┐    │
   │  │  1. Verify Clerk session        │    │
   │  │  2. Extract userId              │    │
   │  │  3. Check subscription status   │    │
   │  │  4. Check credit balance        │    │
   │  └─────────────────────────────────┘    │
   └──────────────────┬──────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
   ┌─────────────┐         ┌─────────────┐
   │  Authorized │         │ Unauthorized│
   │  → Handler  │         │ → 401/403   │
   └─────────────┘         └─────────────┘


3. MIDDLEWARE PSEUDOCODE

   async function authMiddleware(req) {
     // 1. Get Clerk session
     const session = await clerkClient.verifySession(req);
     if (!session) return unauthorized();

     // 2. Get user from database
     const user = await db.users.findByClerkId(session.userId);
     if (!user) return unauthorized();

     // 3. Get subscription
     const subscription = await db.subscriptions.findByUserId(user.id);

     // 4. Attach to request
     req.user = user;
     req.subscription = subscription;

     return next();
   }
```

---

## 9. Payment & Subscription Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STRIPE INTEGRATION FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

1. CHECKOUT FLOW
   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
   │  User       │      │  Our API    │      │   Stripe    │
   │  clicks     │─────►│  /checkout  │─────►│  Checkout   │
   │  "Upgrade"  │      │             │      │  Session    │
   └─────────────┘      └─────────────┘      └──────┬──────┘
                                                    │
                                                    │ Redirect
                                                    ▼
   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
   │  Dashboard  │◄─────│  Success    │◄─────│  Stripe     │
   │  (updated)  │      │  Page       │      │  Checkout   │
   └─────────────┘      └─────────────┘      └─────────────┘
                               ▲
                               │ Webhook
   ┌─────────────┐      ┌──────┴──────┐
   │  Supabase   │◄─────│  /webhook   │
   │  DB Update  │      │  handler    │
   └─────────────┘      └─────────────┘


2. WEBHOOK EVENTS TO HANDLE

   checkout.session.completed
   ├── Create subscription record
   ├── Set credits based on tier
   └── Send welcome email

   customer.subscription.updated
   ├── Update tier/status
   └── Adjust credits

   customer.subscription.deleted
   ├── Set status to 'cancelled'
   └── Send cancellation email

   invoice.payment_succeeded
   └── Reset monthly credits

   invoice.payment_failed
   ├── Send payment failed email
   └── Grace period handling


3. CREDIT MANAGEMENT

   ┌───────────────────────────────────────────────────────────────┐
   │                    CREDIT DEDUCTION FLOW                      │
   └───────────────────────────────────────────────────────────────┘

   User starts generation
          │
          ▼
   ┌─────────────────────┐
   │  Check credits      │
   │  available > 0 ?    │
   └──────────┬──────────┘
              │
       ┌──────┴──────┐
       │             │
       ▼             ▼
   ┌───────┐    ┌───────────┐
   │  Yes  │    │    No     │
   └───┬───┘    └─────┬─────┘
       │              │
       ▼              ▼
   ┌───────────┐  ┌───────────────┐
   │ Reserve   │  │ Show upgrade  │
   │ 1 credit  │  │ modal         │
   └─────┬─────┘  └───────────────┘
         │
         │ Generation succeeds
         ▼
   ┌─────────────────────┐
   │  Deduct credit      │
   │  credits_used += 1  │
   └─────────────────────┘
         │
         │ Generation fails
         ▼
   ┌─────────────────────┐
   │  Release reserved   │
   │  credit (no charge) │
   └─────────────────────┘
```

---

## 10. Error Handling Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ERROR HANDLING                                        │
└─────────────────────────────────────────────────────────────────────────────┘

ERROR CATEGORIES
────────────────
1. API Rate Limits (Gemini, ElevenLabs)
   → Retry with exponential backoff
   → Show "Please wait" to user
   → Queue if persistent

2. API Failures (timeout, 5xx)
   → Retry up to 3 times
   → Log to generation_logs
   → Refund credit if unrecoverable

3. Validation Errors (bad input)
   → Return 400 with specific message
   → Show inline error to user

4. Auth Errors (no session, expired)
   → Return 401
   → Redirect to login

5. Permission Errors (no credits, wrong tier)
   → Return 403
   → Show upgrade modal

6. Render Failures (Remotion crash)
   → Log full error with stack trace
   → Notify admin
   → Refund credit
   → Show retry option


ERROR RESPONSE FORMAT
─────────────────────
{
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "You have no credits remaining. Please upgrade your plan.",
    "details": {
      "credits_remaining": 0,
      "required": 1
    },
    "action": "upgrade"  // Hint for UI
  }
}


ERROR CODES
───────────
AUTH_REQUIRED          - No valid session
AUTH_EXPIRED           - Session expired
INSUFFICIENT_CREDITS   - No credits left
TIER_REQUIRED          - Feature needs higher tier
VALIDATION_ERROR       - Invalid input
RATE_LIMITED           - Too many requests
GENERATION_FAILED      - AI service error
RENDER_FAILED          - Video render error
STORAGE_ERROR          - File upload/download error
INTERNAL_ERROR         - Unexpected server error


RETRY STRATEGY
──────────────
┌─────────────┐
│  API Call   │
└──────┬──────┘
       │
       ▼
   ┌───────┐     ┌─────────────┐
   │Success│────►│   Return    │
   └───────┘     └─────────────┘
       │
       │ Failure
       ▼
   ┌─────────────────────┐
   │  Attempt < 3?       │
   └──────────┬──────────┘
              │
       ┌──────┴──────┐
       │             │
       ▼             ▼
   ┌───────┐    ┌───────────┐
   │  Yes  │    │    No     │
   └───┬───┘    └─────┬─────┘
       │              │
       │ Wait         │
       │ 2^n seconds  ▼
       │         ┌───────────┐
       ▼         │   Log &   │
   ┌───────┐     │   Return  │
   │ Retry │     │   Error   │
   └───────┘     └───────────┘
```

### 10.1 Error Codes Reference

```typescript
// src/lib/errors/codes.ts
export const ERROR_CODES = {
  // Authentication (AUTH_*)
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',

  // Validation (VALIDATION_*)
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_PROMPT_TOO_SHORT: 'VALIDATION_PROMPT_TOO_SHORT',
  VALIDATION_PROMPT_TOO_LONG: 'VALIDATION_PROMPT_TOO_LONG',
  VALIDATION_INVALID_VOICE: 'VALIDATION_INVALID_VOICE',
  VALIDATION_INVALID_THEME: 'VALIDATION_INVALID_THEME',
  VALIDATION_MAX_SCENES_EXCEEDED: 'VALIDATION_MAX_SCENES_EXCEEDED',
  VALIDATION_MIN_SCENES_REQUIRED: 'VALIDATION_MIN_SCENES_REQUIRED',

  // Credits (CREDIT_*)
  CREDIT_INSUFFICIENT: 'CREDIT_INSUFFICIENT',
  CREDIT_DEDUCTION_FAILED: 'CREDIT_DEDUCTION_FAILED',
  CREDIT_REFUND_FAILED: 'CREDIT_REFUND_FAILED',

  // Generation (GENERATION_*)
  GENERATION_SCRIPT_FAILED: 'GENERATION_SCRIPT_FAILED',
  GENERATION_IMAGE_FAILED: 'GENERATION_IMAGE_FAILED',
  GENERATION_AUDIO_FAILED: 'GENERATION_AUDIO_FAILED',
  GENERATION_SYNC_FAILED: 'GENERATION_SYNC_FAILED',

  // Render (RENDER_*)
  RENDER_FAILED: 'RENDER_FAILED',
  RENDER_TIMEOUT: 'RENDER_TIMEOUT',
  RENDER_COMPOSITION_ERROR: 'RENDER_COMPOSITION_ERROR',

  // Storage (STORAGE_*)
  STORAGE_UPLOAD_FAILED: 'STORAGE_UPLOAD_FAILED',
  STORAGE_DOWNLOAD_FAILED: 'STORAGE_DOWNLOAD_FAILED',
  STORAGE_FILE_TOO_LARGE: 'STORAGE_FILE_TOO_LARGE',
  STORAGE_INVALID_FILE_TYPE: 'STORAGE_INVALID_FILE_TYPE',
  STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',

  // External APIs (EXTERNAL_*)
  EXTERNAL_GEMINI_ERROR: 'EXTERNAL_GEMINI_ERROR',
  EXTERNAL_ELEVENLABS_ERROR: 'EXTERNAL_ELEVENLABS_ERROR',
  EXTERNAL_STRIPE_ERROR: 'EXTERNAL_STRIPE_ERROR',
  EXTERNAL_RATE_LIMITED: 'EXTERNAL_RATE_LIMITED',

  // Resource (RESOURCE_*)
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ACCESS_DENIED: 'RESOURCE_ACCESS_DENIED',

  // Internal (INTERNAL_*)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
```

### 10.2 Error Message Mapping

```typescript
// src/lib/errors/messages.ts
import { ERROR_CODES } from './codes';

export const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.AUTH_REQUIRED]: 'Authentication required. Please sign in.',
  [ERROR_CODES.AUTH_EXPIRED]: 'Session expired. Please sign in again.',
  [ERROR_CODES.CREDIT_INSUFFICIENT]: 'Insufficient credits. Please upgrade your plan.',
  [ERROR_CODES.VALIDATION_PROMPT_TOO_SHORT]: 'Prompt must be at least 50 characters.',
  [ERROR_CODES.VALIDATION_PROMPT_TOO_LONG]: 'Prompt must not exceed 500 characters.',
  [ERROR_CODES.GENERATION_SCRIPT_FAILED]: 'Failed to generate script. Please try again.',
  [ERROR_CODES.GENERATION_IMAGE_FAILED]: 'Failed to generate image. Please try again.',
  [ERROR_CODES.RENDER_FAILED]: 'Video rendering failed. Your credit has been refunded.',
  [ERROR_CODES.STORAGE_FILE_TOO_LARGE]: 'File exceeds 5MB limit.',
  [ERROR_CODES.EXTERNAL_RATE_LIMITED]: 'Service temporarily unavailable. Please wait a moment.',
  [ERROR_CODES.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again.',
  // ... add all mappings
};
```

### 10.3 AppError Class

```typescript
// src/lib/errors/AppError.ts
import { ERROR_CODES } from './codes';
import { ERROR_MESSAGES } from './messages';

type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, details?: unknown, statusCode?: number) {
    const message = ERROR_MESSAGES[code] || 'An error occurred';
    super(message);
    
    this.code = code;
    this.details = details;
    this.statusCode = statusCode || this.inferStatusCode(code);
    this.name = 'AppError';
  }

  private inferStatusCode(code: string): number {
    if (code.startsWith('AUTH_')) return 401;
    if (code.startsWith('VALIDATION_')) return 400;
    if (code.startsWith('CREDIT_')) return 403;
    if (code.startsWith('RESOURCE_NOT_FOUND')) return 404;
    if (code.startsWith('RESOURCE_ACCESS')) return 403;
    if (code.startsWith('EXTERNAL_RATE')) return 429;
    return 500;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}
```

### 10.4 Error Middleware

```typescript
// src/lib/errors/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { AppError } from './AppError';
import { ERROR_CODES } from './codes';

type Handler = (req: NextRequest) => Promise<NextResponse>;

export function withErrorHandler(handler: Handler): Handler {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (error) {
      if (error instanceof AppError) {
        return NextResponse.json(error.toJSON(), { status: error.statusCode });
      }

      // Log unexpected errors
      console.error('Unexpected error:', error);

      const appError = new AppError(ERROR_CODES.INTERNAL_ERROR);
      return NextResponse.json(appError.toJSON(), { status: 500 });
    }
  };
}
```

---

## 11. AI Provider Abstraction

### 11.1 Overview

The AI abstraction layer allows switching between providers (Gemini, OpenAI, HuggingFace) without changing business logic.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AI ABSTRACTION LAYER                                  │
└─────────────────────────────────────────────────────────────────────────────┘

   Route Handler / Service
          │
          │ generateText({ prompt, provider: 'gemini' })
          ▼
   ┌─────────────────┐
   │  text-generation│
   │      .ts        │
   └────────┬────────┘
            │
     ┌──────┴──────┐
     │   switch    │
     │  provider   │
     └──────┬──────┘
            │
   ┌────────┼────────┐
   ▼        ▼        ▼
┌──────┐ ┌──────┐ ┌──────────┐
│Gemini│ │OpenAI│ │HuggingFace│
│ API  │ │ API  │ │   API    │
└──────┘ └──────┘ └──────────┘
```

### 11.2 Types

```typescript
// src/lib/ai/types.ts

export type TextProvider = 'gemini' | 'openai' | 'huggingface';
export type ImageProvider = 'gemini' | 'openai' | 'stability';
export type TTSProvider = 'elevenlabs' | 'openai';

export interface TextGenerationInput {
  prompt: string;
  provider: TextProvider;
  options?: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'text' | 'json';
  };
}

export interface TextGenerationOutput {
  text: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface ImageGenerationInput {
  prompt: string;
  provider: ImageProvider;
  options?: {
    width?: number;
    height?: number;
    style?: string;
  };
}

export interface ImageGenerationOutput {
  imageUrl?: string;
  imageBase64?: string;
}

export interface TTSInput {
  text: string;
  provider: TTSProvider;
  voiceId: string;
  options?: {
    stability?: number;
    similarity?: number;
  };
}

export interface TTSOutput {
  audioBase64: string;
  alignment?: {
    words: Array<{ word: string; start: number; end: number }>;
  };
}
```

### 11.3 Text Generation

```typescript
// src/lib/ai/text-generation.ts
import { TextGenerationInput, TextGenerationOutput } from './types';
import { AI_CONFIG } from './config';
import { AppError } from '@/lib/errors/AppError';
import { ERROR_CODES } from '@/lib/errors/codes';

export async function generateText(
  input: TextGenerationInput
): Promise<TextGenerationOutput> {
  const { prompt, provider, options } = input;

  switch (provider) {
    case 'gemini':
      return generateWithGemini(prompt, options);
    case 'openai':
      return generateWithOpenAI(prompt, options);
    case 'huggingface':
      return generateWithHuggingFace(prompt, options);
    default:
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, { provider });
  }
}

async function generateWithGemini(
  prompt: string,
  options?: TextGenerationInput['options']
): Promise<TextGenerationOutput> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${AI_CONFIG.gemini.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 2048,
          responseMimeType: options?.responseFormat === 'json' 
            ? 'application/json' 
            : 'text/plain',
        },
      }),
    }
  );

  if (!response.ok) {
    throw new AppError(ERROR_CODES.EXTERNAL_GEMINI_ERROR);
  }

  const data = await response.json();
  return {
    text: data.candidates[0].content.parts[0].text,
    usage: {
      inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}

async function generateWithOpenAI(
  prompt: string,
  options?: TextGenerationInput['options']
): Promise<TextGenerationOutput> {
  // OpenAI implementation
  throw new AppError(ERROR_CODES.INTERNAL_ERROR, { message: 'OpenAI not implemented' });
}

async function generateWithHuggingFace(
  prompt: string,
  options?: TextGenerationInput['options']
): Promise<TextGenerationOutput> {
  // HuggingFace implementation
  throw new AppError(ERROR_CODES.INTERNAL_ERROR, { message: 'HuggingFace not implemented' });
}
```

### 11.4 Configuration

```typescript
// src/lib/ai/config.ts
export const AI_CONFIG = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY!,
    // Model names update frequently - verify at https://ai.google.dev/models
    textModel: 'gemini-2.0-flash', // or 'gemini-1.5-flash' for stable version
    imageModel: 'imagen-3.0-generate-002', // Imagen 3 for image generation
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    textModel: 'gpt-4o',
    imageModel: 'dall-e-3',
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY!,
    // Models: eleven_multilingual_v2 (quality), eleven_flash_v2_5 (speed), eleven_turbo_v2_5 (lowest latency)
    defaultModel: 'eleven_multilingual_v2',
  },
  // Add more providers as needed
} as const;
```

---

## 12. Prompt Management

### 12.1 Script Generation Prompt

```typescript
// src/lib/prompts/script-generation.ts
import { ScriptPromptInput } from './types';

export function buildScriptPrompt(input: ScriptPromptInput): string {
  const { topic, theme, sceneCount, targetDuration } = input;

  return `Generate a ${targetDuration}-second video script about: ${topic}

Requirements:
- Create exactly ${sceneCount} scenes
- Each scene should be ${Math.floor(targetDuration / sceneCount)} seconds
- Visual theme: ${theme}
- Total narration should fit in ${targetDuration} seconds (~${Math.floor(targetDuration * 2.5)} words)

For each scene provide:
1. scene_number (1-${sceneCount})
2. narration (2-3 sentences, engaging tone)
3. visual_description (detailed, specific, suitable for AI image generation)
4. duration_seconds
5. keywords (3-5 relevant keywords)

Respond ONLY with valid JSON in this exact format:
{
  "total_duration": ${targetDuration},
  "scenes": [
    {
      "scene_number": 1,
      "narration": "...",
      "visual_description": "...",
      "duration_seconds": 12,
      "keywords": ["...", "..."]
    }
  ]
}`;
}
```

### 12.2 Image Generation Prompt

```typescript
// src/lib/prompts/image-generation.ts
import { ImagePromptInput } from './types';

export function buildImagePrompt(input: ImagePromptInput): string {
  const { visualDescription, theme, style } = input;

  const styleGuide = {
    realistic: 'photorealistic, high detail, natural lighting',
    anime: 'anime style, vibrant colors, Studio Ghibli inspired',
    artistic: 'digital art, creative composition, artistic interpretation',
    cinematic: 'cinematic lighting, movie still, dramatic composition',
    minimalist: 'clean, simple, minimal elements, lots of white space',
  };

  return `${visualDescription}

Style: ${styleGuide[theme] || styleGuide.realistic}
Aspect: Vertical (9:16)
Quality: High resolution, sharp details, professional
${style ? `Additional style: ${style}` : ''}`;
}
```

### 12.3 Prompt Types

```typescript
// src/lib/prompts/types.ts

export interface ScriptPromptInput {
  topic: string;
  theme: 'realistic' | 'anime' | 'artistic' | 'cinematic' | 'minimalist';
  sceneCount: number;
  targetDuration: number;
}

export interface ImagePromptInput {
  visualDescription: string;
  theme: 'realistic' | 'anime' | 'artistic' | 'cinematic' | 'minimalist';
  style?: string;
}
```

---

## 13. Environment Variables

```bash
# .env.local

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Google Gemini
GEMINI_API_KEY=AIza...

# ElevenLabs
ELEVENLABS_API_KEY=...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# Renderer Microservice
RENDERER_SERVICE_URL=https://reelzero-renderer.onrender.com
RENDERER_API_SECRET=your-secure-secret-here

# Feature Flags
ENABLE_WATERMARK=true
MAX_FREE_VIDEOS=3
```

### 13.2 Renderer Service Environment Variables (.env)

```bash
# Renderer Microservice (Render.com)

# API Security
API_SECRET=your-secure-secret-here
PORT=3001

# Supabase (for uploading rendered videos)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# Remotion Config
REMOTION_CONCURRENCY=2
REMOTION_OUTPUT_DIR=/tmp/renders
```

---

## 14. Deployment Architecture

### 14.1 Multi-Service Deployment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT OVERVIEW (2 Services)                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│   SERVICE 1: MAIN APP           │     │   SERVICE 2: RENDERER           │
│   ─────────────────────         │     │   ───────────────────           │
│                                 │     │                                 │
│   Repo: ReelZero                │     │   Repo: ReelZero-Renderer       │
│   Host: Vercel (Free)           │     │   Host: Render.com (Free/$7)    │
│   URL: reelzero.vercel.app      │     │   URL: reelzero-renderer.       │
│                                 │     │        onrender.com             │
│   Contains:                     │     │                                 │
│   • Next.js App Router          │     │   Contains:                     │
│   • UI/Dashboard                │────►│   • Express/Fastify API         │
│   • Auth (Clerk)                │     │   • Remotion Renderer           │
│   • Payments (Stripe)           │     │   • FFmpeg                      │
│   • AI Services (Gemini, 11L)   │◄────│   • Single endpoint             │
│   • Database queries            │     │                                 │
│                                 │     │   Endpoints:                    │
│   Timeout: 10s (API routes)     │     │   • POST /render                │
│                                 │     │   • GET /health                 │
│                                 │     │   • GET /status/:id             │
│                                 │     │                                 │
│                                 │     │   Timeout: None (long-running)  │
└─────────────────────────────────┘     └─────────────────────────────────┘
              │                                       │
              │                                       │
              ▼                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SHARED SERVICES                                    │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐  │
│  │   Supabase    │  │    Clerk      │  │    Stripe     │  │   Gemini    │  │
│  │   Database    │  │    Auth       │  │   Payments    │  │   + 11Labs  │  │
│  │   + Storage   │  │               │  │               │  │             │  │
│  └───────────────┘  └───────────────┘  └───────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 14.2 Renderer Microservice Details (Render.com)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RENDERER SERVICE (Render.com)                             │
└─────────────────────────────────────────────────────────────────────────────┘

DIRECTORY STRUCTURE
───────────────────
reelzero-renderer/
├── src/
│   ├── index.ts              # Express app entry
│   ├── routes/
│   │   ├── render.ts         # POST /render endpoint
│   │   ├── health.ts         # GET /health
│   │   └── status.ts         # GET /status/:id
│   ├── services/
│   │   ├── remotion.ts       # Remotion rendering logic
│   │   ├── storage.ts        # Supabase upload
│   │   └── assets.ts         # Download images/audio
│   └── remotion/
│       ├── Root.tsx          # Remotion entry
│       ├── Video.tsx         # Main composition
│       ├── Scene.tsx         # Scene component
│       ├── captions/
│       │   ├── WordByWord.tsx
│       │   └── FullSentence.tsx
│       └── transitions/
│           ├── Fade.tsx
│           └── Crossfade.tsx
├── Dockerfile                # For Render deployment
├── package.json
├── tsconfig.json
└── render.yaml               # Render config

RENDER.YAML CONFIG
──────────────────
services:
  - type: web
    name: reelzero-renderer
    runtime: docker
    plan: free  # or starter ($7/month)
    healthCheckPath: /health
    envVars:
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_KEY
        sync: false
      - key: API_SECRET
        sync: false

DOCKERFILE
──────────
FROM node:20-slim

# Install FFmpeg and Chrome dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    chromium \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

EXPOSE 3001
CMD ["npm", "start"]


API ENDPOINTS
─────────────

POST /render
  Request:
    {
      "videoId": "uuid",
      "scenes": [...],
      "audioUrl": "https://...",
      "settings": {
        "captionStyle": "word_by_word",
        "transitionType": "fade",
        "watermark": false
      }
    }
  Response:
    {
      "success": true,
      "videoUrl": "https://supabase.../videos/xxx.mp4"
    }

GET /health
  Response: { "status": "ok", "timestamp": "..." }

GET /status/:videoId
  Response: { "status": "rendering", "progress": 45 }


SECURITY
────────
• API_SECRET header required for /render endpoint
• Rate limiting: 10 requests/minute
• Request validation with Zod
• No direct public access to rendering
```

### 14.3 Communication Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      VIDEO RENDERING FLOW                                 │
└──────────────────────────────────────────────────────────────────────────┘

1. USER TRIGGERS RENDER
   ┌─────────────┐
   │   Browser   │ Click "Generate Video"
   └──────┬──────┘
          │
          ▼
2. VERCEL PREPARES DATA
   ┌─────────────────────────────────────────────────────────────────────┐
   │   Vercel (Main App)                                                  │
   │   • Validates user has credits                                       │
   │   • Gathers: scenes, imageUrls, audioUrl, settings                  │
   │   • Calls renderer microservice                                      │
   └──────────────────────────────────┬──────────────────────────────────┘
                                      │
                                      │ POST /render
                                      │ Headers: { "x-api-secret": "..." }
                                      │ Body: { videoId, scenes, audioUrl, settings }
                                      ▼
3. RENDER.COM PROCESSES
   ┌─────────────────────────────────────────────────────────────────────┐
   │   Render.com (Renderer Service)                                      │
   │                                                                       │
   │   a) Download assets                                                  │
   │      └─ Fetch images and audio from Supabase                         │
   │                                                                       │
   │   b) Build Remotion composition                                       │
   │      └─ Create React component tree with timing                      │
   │                                                                       │
   │   c) Render video                                                     │
   │      └─ Headless Chrome → frames → FFmpeg → MP4                      │
   │                                                                       │
   │   d) Upload to Supabase Storage                                       │
   │      └─ /videos/{userId}/{videoId}.mp4                               │
   │                                                                       │
   │   e) Return video URL                                                 │
   └──────────────────────────────────┬──────────────────────────────────┘
                                      │
                                      │ Response: { videoUrl: "https://..." }
                                      ▼
4. VERCEL COMPLETES
   ┌─────────────────────────────────────────────────────────────────────┐
   │   Vercel (Main App)                                                  │
   │   • Updates database with videoUrl                                   │
   │   • Deducts user credit                                              │
   │   • Returns success to browser                                       │
   └─────────────────────────────────────────────────────────────────────┘
          │
          ▼
5. USER SEES VIDEO
   ┌─────────────┐
   │   Browser   │ Shows video player with download option
   └─────────────┘

TIMING BREAKDOWN
────────────────
• Vercel prep:        ~2s
• Asset download:     ~5s
• Remotion render:    ~60-90s
• Upload to storage:  ~5s
• Total:              ~70-100s
```

### 14.4 Render.com Tier Comparison

| Feature | Free Tier | Starter ($7/mo) |
|---------|-----------|-----------------|
| RAM | 512 MB | 512 MB |
| CPU | Shared | 0.5 vCPU |
| Sleep after inactivity | 15 min | Never |
| Cold start | ~30-50s | None |
| Bandwidth | 100 GB/mo | 100 GB/mo |
| **Recommended for** | MVP/Testing | Production |

### 14.5 CI/CD Pipeline (Both Services)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CI/CD PIPELINES                                      │
└─────────────────────────────────────────────────────────────────────────────┘

MAIN APP (ReelZero → Vercel)          RENDERER (ReelZero-Renderer → Render)
────────────────────────────          ─────────────────────────────────────

┌─────────────┐                       ┌─────────────┐
│  Push to    │                       │  Push to    │
│  main       │                       │  main       │
└──────┬──────┘                       └──────┬──────┘
       │                                     │
       ▼                                     ▼
┌─────────────────┐                   ┌─────────────────┐
│  GitHub Actions │                   │  GitHub Actions │
│  • Lint         │                   │  • Lint         │
│  • Type check   │                   │  • Type check   │
│  • Unit tests   │                   │  • Unit tests   │
└────────┬────────┘                   └────────┬────────┘
         │                                     │
         ▼                                     ▼
┌─────────────────┐                   ┌─────────────────┐
│  Vercel Auto    │                   │  Render Auto    │
│  Deploy         │                   │  Deploy         │
│  • Preview (PR) │                   │  • Docker build │
│  • Prod (main)  │                   │  • Deploy       │
└─────────────────┘                   └─────────────────┘
```

---

## 15. Monitoring & Observability

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MONITORING STACK                                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION                                          │
└─────────────────────────────────────────────────────────────────────────────┘
         │                    │                    │
         │ Errors             │ Analytics          │ Logs
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│     Sentry       │   │    Mixpanel     │   │ Vercel Logs     │
│                  │   │   or Amplitude  │   │                 │
│ • Error tracking │   │ • User events   │   │ • Function logs │
│ • Stack traces   │   │ • Funnels       │   │ • Request logs  │
│ • Breadcrumbs    │   │ • Retention     │   │ • Build logs    │
│ • Releases       │   │ • Cohorts       │   │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘


METRICS TO TRACK
────────────────
Performance:
  • Video generation time (p50, p95, p99)
  • API response times
  • Render queue length
  • Error rates by endpoint

Business:
  • Daily/weekly/monthly active users
  • Videos generated per user
  • Conversion rate (free → paid)
  • Churn rate
  • Revenue (MRR, ARPU)

Infrastructure:
  • Function execution duration
  • Storage usage
  • API costs (Gemini, ElevenLabs)
  • CDN bandwidth


ALERTING RULES
──────────────
Critical (PagerDuty/Slack):
  • Error rate > 5% (5 min window)
  • API response time > 10s
  • Render success rate < 90%
  • Payment webhook failures

Warning (Slack):
  • Error rate > 2%
  • API response time > 5s
  • Storage > 80% capacity
  • Credit usage anomalies
```

---

## 16. Security Considerations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SECURITY LAYERS                                        │
└─────────────────────────────────────────────────────────────────────────────┘

1. AUTHENTICATION
   • Clerk handles all auth (OAuth, session management)
   • JWT verification on every API route
   • Session expiry and refresh handling

2. AUTHORIZATION
   • Row-level security in Supabase (users see only their data)
   • API routes check user ownership before operations
   • Credit verification before generation

3. INPUT VALIDATION
   • Zod schemas for all API inputs
   • Prompt sanitization (prevent injection)
   • File type and size validation for uploads

4. API SECURITY
   • Rate limiting per user (prevent abuse)
   • CORS configuration (allow only app domain)
   • Webhook signature verification (Stripe, Clerk)

5. DATA PROTECTION
   • Environment variables in Vercel (encrypted)
   • Supabase RLS policies
   • No PII in logs
   • HTTPS everywhere

6. CONTENT SAFETY
   • Prompt moderation (basic keyword filtering)
   • Image upload scanning (Phase 2)
   • User reports mechanism


SECURITY CHECKLIST
──────────────────
[ ] Clerk webhook signature verification
[ ] Stripe webhook signature verification
[ ] Supabase RLS enabled on all tables
[ ] API rate limiting implemented
[ ] Input validation on all endpoints
[ ] No secrets in client-side code
[ ] HTTPS enforced
[ ] Security headers (CSP, HSTS, etc.)
[ ] Regular dependency updates
[ ] Access logging enabled
```

---

## 17. Performance Optimization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PERFORMANCE TARGETS                                       │
└─────────────────────────────────────────────────────────────────────────────┘

PAGE LOAD
─────────
• First Contentful Paint (FCP): < 1.5s
• Largest Contentful Paint (LCP): < 2.5s
• Time to Interactive (TTI): < 3.5s
• Cumulative Layout Shift (CLS): < 0.1

VIDEO GENERATION
────────────────
• Script generation: < 5s
• Image generation (per image): < 10s
• Audio generation: < 15s
• Video render: < 60s
• Total pipeline: < 90s


OPTIMIZATION STRATEGIES
───────────────────────

1. FRONTEND
   • Next.js App Router (server components)
   • Image optimization (next/image)
   • Code splitting (dynamic imports)
   • Prefetching (links, data)
   • Skeleton loaders

2. BACKEND
   • Parallel API calls where possible
     - Generate 5 images concurrently
   • Response streaming for progress
   • Efficient database queries (indexes)
   • Connection pooling (Supabase)

3. REMOTION
   • Optimized compositions (minimal re-renders)
   • Pre-compiled bundles
   • Efficient frame calculation
   • Memory management

4. CACHING
   • CDN for static assets
   • Supabase CDN for videos/images
   • Browser caching headers
   • React Query for API caching


BOTTLENECK ANALYSIS
───────────────────
┌─────────────────────────────────────────────────────────────┐
│ Component          │ Target Time │ Optimization            │
├──────────────────┼────────────┼───────────────────────┤
│ Script Generation  │ 3-5s        │ Streaming response      │
│ Image Generation   │ 8-10s ×5    │ Parallel requests       │
│ Audio Generation   │ 10-15s      │ None (ElevenLabs limit) │
│ Synchronization    │ 1-2s        │ Pre-computed timings    │
│ Remotion Render    │ 40-60s      │ Optimized composition   │
│ Upload to Storage  │ 5-10s       │ Direct upload to CDN    │
└─────────────────────────────────────────────────────────────┘
```

---

## 18. UI Components (shadcn/ui)

### 18.1 Setup

```bash
# Initialize shadcn/ui in your Next.js project
npx shadcn@latest init
```

### 18.2 Configuration (components.json)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

### 18.3 Installing Components

```bash
# Add individual components as needed
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add tabs
npx shadcn@latest add toast
npx shadcn@latest add progress
npx shadcn@latest add dropdown-menu
npx shadcn@latest add avatar
npx shadcn@latest add skeleton

# Or add multiple at once
npx shadcn@latest add button card dialog input label progress toast
```

### 18.4 Recommended Components for ReelZero

| Component | Usage |
|-----------|-------|
| `button` | All buttons, CTAs |
| `card` | Video cards, pricing cards, stats |
| `dialog` | Modals, confirmations |
| `input` | Form inputs, search |
| `label` | Form labels |
| `select` | Dropdowns (voice, theme selection) |
| `tabs` | Dashboard navigation, settings |
| `toast` | Notifications, success/error messages |
| `progress` | Video generation progress |
| `dropdown-menu` | User menu, actions menu |
| `avatar` | User profile |
| `skeleton` | Loading states |
| `slider` | Audio/video controls |
| `switch` | Toggle settings |
| `textarea` | Prompt input, script editing |
| `tooltip` | Help text, hints |

### 18.5 Component Usage Example

```tsx
// Example: Video Generation Progress Card
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"

export function GenerationProgress({ progress, stage }: Props) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Generating Video</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{stage}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
        <Button variant="outline" className="w-full">
          Cancel
        </Button>
      </CardContent>
    </Card>
  )
}
```

### 18.6 Import Pattern (No Barrel Files)

```typescript
// ✅ Correct - Import directly from component file
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

// ❌ Wrong - Never create index.ts barrel files
import { Button, Card, Input } from "@/components/ui"
```

---

## 19. Development Guidelines

### 19.1 Code Organization Principles

```
1. FEATURE-FIRST STRUCTURE
   Group by feature, not file type

   ✅ Good:
   /src/features/video-generation/
     components/
     hooks/
     services/
     types/

   ❌ Bad:
   /src/components/video/
   /src/hooks/useVideo.ts
   /src/services/videoService.ts

2. SEPARATION OF CONCERNS
   • Components: UI rendering only
   • Hooks: State and business logic
   • Services: API calls and data transformation
   • Types: TypeScript interfaces/types

3. DEPENDENCY DIRECTION
   Components → Hooks → Services → External APIs

   Components should never call services directly
   Services should never know about UI

4. ERROR BOUNDARIES
   Wrap major sections in error boundaries
   Provide fallback UI for failures
```
---

## Appendix A: Technology Versions

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x LTS | Runtime |
| Next.js | 14.x | Framework |
| React | 18.x | UI Library |
| TypeScript | 5.x | Type System |
| Tailwind CSS | 3.x | Styling |
| **shadcn/ui** | latest | UI Components |
| **Radix UI** | latest | Accessible Primitives |
| **Lucide React** | latest | Icons |
| Remotion | 4.x | Video Rendering |
| Zustand | 4.x | State Management |
| Zod | 3.x | Validation |
| React Query | 5.x | Data Fetching |

---

## Appendix B: External Service Limits

| Service | Free Tier | Paid Tier | Limit Type |
|---------|-----------|-----------|------------|
| Gemini Flash | 10 RPM, 250 RPD | Pay-per-use | Rate |
| Gemini Image | 2 IPM, 500-1000/day | Pay-per-use | Rate |
| ElevenLabs | 10K chars/month | 100K+ chars/month | Volume |
| Supabase | 1GB storage | 8GB+ storage | Storage |
| Vercel | 100GB bandwidth | Unlimited | Bandwidth |
| Clerk | 10K MAU | Unlimited | Users |

---

**Document End**
