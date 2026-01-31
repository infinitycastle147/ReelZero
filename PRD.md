# Product Requirements Document (PRD)
## ReelZero - AI-Powered Reel/Shorts Creator

**Version:** 2.0 FINAL  
**Date:** January 30, 2026  
**Status:** Ready for Development  
**All Design Decisions Finalized**

---

## 1. Executive Summary

### 1.1 Product Overview
An AI-powered SaaS platform that generates 60-second vertical short-form video content (Reels/Shorts/TikTok) from text prompts. The system creates slideshow-style videos using AI-generated images (with user upload option) synchronized with AI-generated voiceovers and customizable captions. Videos are composed programmatically using React and Remotion.

### 1.2 Value Proposition
- **Speed**: Generate professional 60s shorts in <90 seconds
- **Cost-Effective**: Leverages Gemini free tier + optimized costs for production
- **Accessibility**: No video editing skills required
- **Control**: Users can edit scripts, upload images, customize captions
- **Quality**: Professional content with AI visuals, natural voice, and smooth transitions

### 1.3 Target Market
- Content creators (YouTube Shorts, Instagram Reels, TikTok)
- Marketing agencies creating social media content
- Small businesses for product promotions
- Educators creating educational content
- Social media managers

---

## 2. Product Specifications

### 2.1 Video Specifications (Fixed)
- **Duration**: 60 seconds (acceptable range: 50-60s)
- **Aspect Ratio**: 9:16 (vertical/portrait only)
- **Resolution**: 1080x1920 pixels
- **Format**: MP4 (H.264 codec)
- **Frame Rate**: 30 fps
- **Scenes**: Maximum 5 scenes per video
- **Scene Duration**: ~10-12 seconds per scene

### 2.2 Feature Specifications

#### Caption Styles (3 Options)
1. **Word-by-word animated** - Pop-in effect, popular for viral shorts
2. **Full sentence static** - Traditional subtitle style
3. **No captions** - Voice only

#### Transition Effects (2 Options)
1. **Fade** - Scene fades to black, next fades in
2. **Crossfade** - Scenes blend smoothly into each other

#### Image Sources (2 Options per Scene)
1. **AI-generated** - Gemini Flash Image (1024x1024 → resized to 1080x1920)
2. **User-uploaded** - PNG/JPG/WEBP, max 5MB, auto-resized to 1080x1920

---

## 3. Core Features & Requirements

### 3.1 MVP Feature Set

#### 3.1.1 User Authentication & Management
- **Technology**: Clerk (free tier)
- **Features**:
  - OAuth (Google)
  - User profile management
  - Credit/usage tracking
  - Session management

#### 3.1.2 Video Generation Workflow

**Step 1: Input Form**
- Text prompt (50-500 characters)
- Voice selection (male/female, multiple accent options)
- Visual theme selection (realistic, anime, artistic, etc.)
- Caption style selection (3 options)

**Step 2: Script Generation & Editing**
- Gemini Flash generates:
  - Narration script (~60s worth, ~1500 characters)
  - 5 scene descriptions with visual details
  - Scene timing breakdown
- User can:
  - ✅ Edit narration text for any scene
  - ✅ Edit scene visual descriptions
  - ✅ Delete scenes (minimum 3 scenes required)
  - ✅ Add new scenes (maximum 5 total)
  - ❌ Reorder scenes (Phase 2 feature)

**Step 3: Image Selection**
- For each scene, user chooses:
  - **Option A**: Generate AI image from scene description
  - **Option B**: Upload custom image (PNG/JPG/WEBP, 5MB max)
- "Generate All Images" button for bulk generation
- Individual generate buttons for scene-by-scene control
- Image preview with replace option

**Step 4: Transition & Caption Selection**
- Select transition effect (Fade or Crossfade)
- Confirm caption style
- Preview settings

**Step 5: Video Generation (Immediate Processing)**
- User clicks "Generate Video"
- Progress indicator shows:
  - Generating audio... (15s)
  - Synchronizing timing... (5s)
  - Rendering video... (40s)
  - Finalizing... (10s)
- Total: ~70-90 seconds
- User must stay on page (synchronous processing)

**Step 6: Preview & Download**
- Remotion Player embedded in dashboard
- Play/pause, seek, volume controls
- Download MP4 button
- Regenerate option (uses additional credit)
- Share to social media (Phase 2)

#### 3.1.3 Video Management Dashboard
- **Video Library View**:
  - Grid/list view toggle
  - Video thumbnail (first frame)
  - Video title (auto-generated from prompt)
  - Duration display (50-60s)
  - Creation date
  - Actions: Preview, Download, Delete
- **Filtering & Search**:
  - Search by title/prompt
  - Filter by date
  - Sort by newest/oldest
- **Usage Statistics**:
  - Credits used this month
  - Videos created this month
  - Storage used
  - Credits remaining

#### 3.1.4 Credit & Billing System
- **Credit Model**: 1 Credit = 1 video generation (up to 60s)
- **Subscription Tiers**: Free, Basic, Pro, Enterprise
- **Credit Tracking**: Real-time credit deduction
- **Overage Handling**: Block generation when credits exhausted, prompt to upgrade
- **Payment Processing**: Stripe integration
- **Billing Cycle**: Monthly, resets on subscription date

#### 3.1.5 File Upload System
- **Supported Formats**: PNG, JPG, JPEG, WEBP
- **Size Limit**: 5MB per image
- **Validation**:
  - Check file type
  - Check file size
  - Validate image can be read
- **Processing**:
  - Auto-resize to 1080x1920 (maintain aspect ratio, add letterbox if needed)
  - Optimize for web delivery
  - Store in Supabase Storage
- **Storage**: User uploads stored separately from AI-generated images

---

## 4. Technical Architecture

### 4.1 Technology Stack

#### Frontend
- **Framework**: Next.js 14+ (App Router)
- **UI Library**: React 18+
- **Styling**: Tailwind CSS
- **Video Player**: Remotion Player
- **State Management**: React Context / Zustand
- **File Upload**: React Dropzone
- **HTTP Client**: Fetch API / Axios

#### Backend
- **Runtime**: Node.js 20+
- **Framework**: Next.js API Routes / Express
- **Authentication**: Clerk SDK
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage (1GB free tier)
- **Video Rendering**: Remotion (@remotion/renderer)
- **Job Processing**: In-memory queue (MVP), Redis later

#### AI Services
- **LLM**: Google Gemini Flash API
- **Image Generation**: Google Gemini Flash Image API
- **Text-to-Speech**: ElevenLabs API
- **Voice Options**: ElevenLabs voice library

#### Infrastructure
- **Hosting**: Vercel (frontend + API routes)
- **Video Rendering**: Server-side on Vercel/dedicated instance
- **CDN**: Supabase CDN for video delivery
- **Monitoring**: Vercel Analytics + Sentry

### 4.2 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │   Next.js UI   │  │ Remotion     │  │  File Upload    │ │
│  │   (React)      │  │ Player       │  │  Component      │ │
│  └────────┬───────┘  └──────────────┘  └────────┬────────┘ │
└───────────┼──────────────────────────────────────┼──────────┘
            │                                       │
            │ HTTPS                                 │ HTTPS
            ▼                                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS API ROUTES                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   /api/     │  │   /api/     │  │    /api/render      │ │
│  │  generate   │  │  upload     │  │                     │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────────────┘ │
└─────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │
          │                 │                 │
    ┌─────▼─────┐     ┌────▼─────┐    ┌─────▼──────────┐
    │  Gemini   │     │ Supabase │    │    Remotion    │
    │   API     │     │ Storage  │    │   Renderer     │
    │           │     │          │    │                │
    │ • Flash   │     │ • Images │    │ • Composition  │
    │ • Image   │     │ • Videos │    │ • FFmpeg       │
    └─────┬─────┘     └──────────┘    └────────────────┘
          │
    ┌─────▼─────────┐
    │  ElevenLabs   │
    │     TTS       │
    │               │
    │ • Audio Gen   │
    │ • Alignment   │
    └───────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    SUPPORTING SERVICES                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Clerk     │  │  Supabase   │  │      Stripe         │ │
│  │   Auth      │  │  Database   │  │    Payments         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Video Generation Pipeline

```
1. USER INPUT
   └─> Text prompt + preferences
   
2. SCRIPT GENERATION (Gemini Flash)
   └─> Structured JSON: narration + 5 scene descriptions
   
3. USER EDITING (Optional)
   └─> Edit text, add/delete scenes, modify descriptions
   
4. IMAGE GENERATION (Parallel)
   ├─> AI: Gemini Flash Image (1024x1024)
   └─> User uploads: Validate + resize to 1080x1920
   
5. VOICE SYNTHESIS (ElevenLabs)
   └─> Audio file + word-level alignment metadata
   
6. SYNCHRONIZATION ENGINE
   └─> Calculate scene timings from audio metadata
   
7. REMOTION COMPOSITION
   ├─> Create React components
   ├─> Define sequences with precise timing
   ├─> Apply transitions (fade/crossfade)
   ├─> Overlay captions with animations
   └─> Configure audio track
   
8. REMOTION RENDERING
   ├─> Frame-by-frame rendering (headless Chrome)
   ├─> FFmpeg encoding (H.264)
   └─> Generate final MP4
   
9. STORAGE & DELIVERY
   ├─> Upload to Supabase Storage
   ├─> Generate CDN URL
   └─> Return to user

Total Time: 70-90 seconds
```

### 4.4 Database Schema (Supabase PostgreSQL)

```sql
-- Users table (managed by Clerk, mirrored here)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL, -- 'free', 'basic', 'pro', 'enterprise'
  status TEXT NOT NULL, -- 'active', 'cancelled', 'expired'
  credits_total INTEGER NOT NULL,
  credits_used INTEGER DEFAULT 0,
  credits_remaining INTEGER GENERATED ALWAYS AS (credits_total - credits_used) STORED,
  billing_cycle_start DATE NOT NULL,
  billing_cycle_end DATE NOT NULL,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Videos table
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL, -- 50-60
  status TEXT NOT NULL, -- 'processing', 'completed', 'failed'
  video_url TEXT, -- Supabase CDN URL
  thumbnail_url TEXT,
  storage_path TEXT,
  file_size_bytes BIGINT,
  metadata JSONB, -- scene info, settings, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Video generation logs
CREATE TABLE generation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  stage TEXT NOT NULL, -- 'script', 'images', 'audio', 'render'
  status TEXT NOT NULL, -- 'pending', 'success', 'error'
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Uploaded images
CREATE TABLE uploaded_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'video_generated', 'image_uploaded', etc.
  credits_used INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX idx_usage_tracking_created_at ON usage_tracking(created_at DESC);
```

---

## 5. AI Service Integration Details

### 5.1 Google Gemini Integration

#### Script Generation (Gemini Flash)

**API Endpoint**: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
> Note: Model names update frequently. Verify at https://ai.google.dev/models

**Request Format**:
```json
{
  "contents": [{
    "parts": [{
      "text": "Generate a 60-second video script about [USER_PROMPT]. Create exactly 5 scenes. For each scene provide: scene_number, narration (2-3 sentences), visual_description (detailed), duration_seconds (10-12s). Return as JSON."
    }]
  }],
  "generationConfig": {
    "temperature": 0.7,
    "topP": 0.95,
    "maxOutputTokens": 2048,
    "responseMimeType": "application/json"
  }
}
```

**Expected Response Structure**:
```json
{
  "total_duration": 60,
  "scenes": [
    {
      "scene_number": 1,
      "narration": "Welcome to our exploration of...",
      "visual_description": "Wide shot of a lush green forest...",
      "duration_seconds": 12,
      "keywords": ["forest", "nature", "green"]
    },
    // ... 4 more scenes
  ]
}
```

**Rate Limits (Free Tier)**:
- 10 RPM (requests per minute)
- 250 RPD (requests per day)
- 250,000 TPM (tokens per minute)

**Cost (Paid Tier)**:
- Input: $0.10 per 1M tokens
- Output: $0.40 per 1M tokens
- Estimated: $0.001-0.003 per video

#### Image Generation (Imagen 3)

**API Endpoint**: `POST https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict`
> Note: Uses Imagen 3 for high-quality image generation. Verify model availability at https://ai.google.dev/models

**Request Format**:
```json
{
  "contents": [{
    "parts": [{
      "text": "[VISUAL_DESCRIPTION from scene]. Style: [USER_THEME]. High quality, 1024x1024, sharp details."
    }]
  }],
  "generationConfig": {
    "temperature": 0.8,
    "responseMimeType": "image/png"
  }
}
```

**Response**: Base64-encoded PNG image (1024x1024)

**Rate Limits (Free Tier)**:
- 500-1000 images per day
- 15 RPM
- 2 IPM (images per minute)

**Cost (Paid Tier)**:
- $0.039 per image (1024x1024)
- $0.195 per video (5 images)

### 5.2 ElevenLabs Integration

#### Text-to-Speech with Alignment

**API Endpoint**: `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps`

**Request Format**:
```json
{
  "text": "[COMPLETE NARRATION SCRIPT]",
  "model_id": "eleven_multilingual_v2", // Also available: "eleven_flash_v2_5" (faster), "eleven_turbo_v2_5" (lowest latency)
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.75,
    "style": 0.0,
    "use_speaker_boost": true
  }
}
```

**Response**:
```json
{
  "audio_base64": "[BASE64_ENCODED_MP3]",
  "alignment": {
    "characters": ["W", "e", "l", ...],
    "character_start_times_seconds": [0.0, 0.02, 0.04, ...],
    "character_end_times_seconds": [0.02, 0.04, 0.06, ...]
  }
}
```

**Usage for Synchronization**:
- Parse alignment data to get word boundaries
- Map words to scenes from script
- Calculate exact scene start/end times
- Generate caption timing for word-by-word animations

**Rate Limits**:
- Free: 10,000 characters/month (~6-7 videos)
- Starter ($5): 30,000 characters/month (~20 videos)
- Creator ($11): 100,000 characters/month (~65 videos)
- Pro ($99): 500,000 characters/month (~330 videos)

**Cost**: ~$0.15-0.30 per video (varies by plan)

---

## 6. Pricing & Business Model

### 6.1 Subscription Tiers

#### Free Tier
- **Price**: $0/month
- **Videos**: 3 videos/month
- **Features**:
  - ✅ All AI models (Gemini + ElevenLabs)
  - ✅ All caption styles
  - ✅ User image uploads
  - ✅ Both transitions
  - ❌ Watermarked videos (small logo in corner)
  - ✅ 720p resolution (1280x720, resized from 1080x1920)
  - ✅ Basic voice options (5 voices)
  - ✅ Standard queue
- **Storage**: 100MB (enough for ~50 videos with cleanup)
- **Purpose**: User acquisition, product validation

#### Basic Tier ✅
- **Price**: $29/month ($24/month annually - 17% off)
- **Videos**: 30 videos/month
- **Features**:
  - ✅ All Free tier features
  - ✅ No watermark
  - ✅ Full HD 1080p (1080x1920)
  - ✅ All voice options (50+ voices)
  - ✅ Priority support (24-48hr response)
- **Storage**: 5GB (enough for ~2,500 videos)
- **Overage**: $1.50 per additional video
- **Cost to us**: $12.60 (30 × $0.42)
- **Profit**: $16.40/month (56% margin)
- **Best for**: Solo creators, small businesses

#### Pro Tier ✅
- **Price**: $79/month ($66/month annually - 17% off)
- **Videos**: 100 videos/month
- **Features**:
  - ✅ All Basic tier features
  - ✅ Priority processing (faster queue)
  - ✅ Custom branding (upload logo for watermark)
  - ✅ API access (coming Q2 2026)
  - ✅ Batch generation (queue multiple videos)
  - ✅ Advanced analytics
  - ✅ Priority support (12-24hr response)
- **Storage**: 20GB (enough for ~10,000 videos)
- **Overage**: $1.00 per additional video
- **Cost to us**: $42.00 (100 × $0.42)
- **Profit**: $37.00/month (47% margin)
- **Best for**: Agencies, power users, content teams

#### Enterprise Tier
- **Price**: Custom (starting $299/month)
- **Videos**: Unlimited (fair use policy)
- **Features**:
  - ✅ All Pro tier features
  - ✅ Dedicated account manager
  - ✅ Custom integrations (Zapier, webhooks)
  - ✅ White-label option (custom branding throughout)
  - ✅ SLA guarantee (99.9% uptime)
  - ✅ Custom API rate limits
  - ✅ SSO (SAML)
  - ✅ Team collaboration features
  - ✅ Priority support (4hr response, phone support)
- **Storage**: Custom
- **Contract**: Annual commitment
- **Profit**: 60%+ margin with volume discounts
- **Best for**: Large agencies, enterprises, platforms

### 6.2 Cost Structure (Per Video)

#### Component Breakdown

| Component | Free Tier | Production (Paid) | Notes |
|-----------|-----------|-------------------|-------|
| **Gemini Script** | $0 | $0.002 | Negligible cost |
| **Gemini Images (5)** | $0 | $0.195 | $0.039 × 5 |
| **ElevenLabs TTS** | $0* | $0.15-0.30 | *After 7 videos/month |
| **Remotion Render** | $0.06 | $0.06 | Server compute |
| **Supabase Storage** | $0.01 | $0.01 | Storage + CDN |
| **Total** | **$0.07** | **$0.417-0.467** | |

**Production Average**: ~$0.42 per video (using Creator plan for ElevenLabs)

#### Monthly Cost by Tier

| Tier | Videos | Total Cost | Revenue | Profit | Margin |
|------|--------|------------|---------|--------|--------|
| Free | 3 | $1.26 | $0 | -$1.26 | Loss leader |
| Basic | 30 | $12.60 | $29 | $16.40 | 56% |
| Pro | 100 | $42.00 | $79 | $37.00 | 47% |
| Enterprise | 200+ | Custom | $299+ | $150+ | 50%+ |

### 6.3 Revenue Projections

#### Conservative (6 Months)
- 5,000 registered users
- 500 paying users (10% conversion)
  - 300 Basic ($29) = $8,700
  - 180 Pro ($79) = $14,220
  - 20 Enterprise ($299 avg) = $5,980
- **MRR**: $28,900
- **Costs**: ~$9,000 (infrastructure + AI)
- **Gross Profit**: $19,900/month
- **Margin**: 69%

#### Target (12 Months)
- 25,000 registered users
- 2,500 paying users (10% conversion)
  - 1,500 Basic = $43,500
  - 900 Pro = $71,100
  - 100 Enterprise ($400 avg) = $40,000
- **MRR**: $154,600
- **Costs**: ~$50,000 (infrastructure + AI + team)
- **Gross Profit**: $104,600/month
- **Margin**: 68%

---

## 7. Development Roadmap

### 7.1 MVP Development (Months 1-3)

#### Week 1-2: Foundation & Setup
- [ ] Project scaffolding (Next.js 14, TypeScript, Tailwind)
- [ ] Clerk authentication integration
- [ ] Supabase project setup (database + storage)
- [ ] Database schema implementation
- [ ] Basic UI components (buttons, forms, layout)
- [ ] Environment variables and configuration

#### Week 3-4: AI Integrations
- [ ] Gemini API integration (script generation)
- [ ] Gemini Image API integration
- [ ] ElevenLabs TTS integration
- [ ] Test with 6-7 videos using free tiers
- [ ] Error handling for API failures

#### Week 5-6: Core Video Generation
- [ ] Script generation endpoint
- [ ] Script editing interface (add/edit/delete scenes)
- [ ] Image generation endpoint (AI + upload handling)
- [ ] Image upload component (drag-drop, validation)
- [ ] Image resize/optimization logic
- [ ] Voice synthesis endpoint

#### Week 7-8: Remotion Integration
- [ ] Remotion composition templates
- [ ] Caption component (3 styles)
- [ ] Transition effects (fade, crossfade)
- [ ] Synchronization engine (audio → scene timing)
- [ ] Rendering pipeline setup
- [ ] Progress tracking for rendering

#### Week 9-10: User Interface
- [ ] Video generation form (multi-step)
- [ ] Script editing UI
- [ ] Image selection/upload UI
- [ ] Progress indicator during generation
- [ ] Video preview (Remotion Player)
- [ ] Video management dashboard
- [ ] Video library (grid/list view)

#### Week 11-12: Billing & Testing
- [ ] Stripe integration
- [ ] Credit system implementation
- [ ] Subscription management UI
- [ ] Usage tracking and limits
- [ ] End-to-end testing (20+ videos)
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] Documentation

**Deliverable**: Functional MVP with all core features

---

## 8. Appendices

### A. Competitive Analysis

| Feature | Our Product | Pictory.ai | Synthesia | Lumen5 |
|---------|-------------|------------|-----------|--------|
| **Price (Basic)** | $29/month | $39/month | $29/month | $49/month |
| **Videos/Month** | 30 | 30 | 10 | 20 |
| **Video Length** | 60s | Unlimited | Unlimited | Unlimited |
| **AI Avatars** | ❌ | ❌ | ✅ | ❌ |
| **User Images** | ✅ | ✅ | ✅ | ✅ |
| **Script Editing** | ✅ | ✅ | ✅ | ✅ |
| **Generation Time** | <90s | 5-10min | 3-5min | 5-10min |
| **Caption Styles** | 3 | Multiple | None | Multiple |
| **API Access** | Pro tier | Enterprise | Enterprise | No |
| **Aspect Ratios** | 9:16 only (MVP) | Multiple | Multiple | Multiple |

**Key Differentiators**:
1. **Speed**: <90s vs 5-10min (our biggest advantage)
2. **Simplicity**: Purpose-built for 60s shorts (vs general video tools)
3. **Value**: More videos per dollar ($0.97/video vs $1.30-2.90)

### B. Technical Specifications Summary

| Specification | Value |
|---------------|-------|
| **Video Duration** | 50-60 seconds |
| **Resolution** | 1080x1920 (1080p vertical) |
| **Frame Rate** | 30 fps |
| **Codec** | H.264 (MP4 container) |
| **Bitrate** | ~2.5 Mbps (variable) |
| **File Size** | ~1.5-2.5 MB per video |
| **Aspect Ratio** | 9:16 (portrait) |
| **Scenes** | 5 scenes maximum |
| **Images** | 1024x1024 (resized to 1080x1920) |
| **Audio** | 128 kbps MP3/AAC |
| **Captions** | Embedded via Remotion (not burned-in) |

### C. Glossary

- **9:16**: Vertical aspect ratio (portrait orientation) used by Instagram Reels, YouTube Shorts, TikTok
- **Alignment Metadata**: Word-level timestamp data from ElevenLabs TTS indicating when each word is spoken
- **Caption Styles**: Different visual presentations of text overlays (word-by-word pop, full sentence, etc.)
- **Clerk**: Authentication service providing OAuth and user management
- **Credit**: Unit of currency in our platform (1 credit = 1 video generation)
- **Crossfade**: Transition where one scene fades out while next fades in simultaneously
- **Fade**: Transition where scene fades to black, then next scene fades in from black
- **Gemini**: Google's AI models (Flash for text, Flash Image for image generation)
- **MRR**: Monthly Recurring Revenue
- **NPS**: Net Promoter Score (customer satisfaction metric)
- **Remotion**: React framework for creating videos programmatically
- **Scene**: Individual segment of video with one image/visual and corresponding narration
- **Shorts**: YouTube's short-form video format
- **Supabase**: Backend-as-a-Service providing database and storage
- **TTS**: Text-to-Speech (converting text to audio)

### D. FAQ for Development Team

**Q: Can users pause/resume video generation?**
A: No. MVP is synchronous (user waits ~90s). Queue system in Phase 2 will allow this.

**Q: What happens if generation fails mid-process?**
A: User sees error message, credit is refunded, they can retry. Log error in database for debugging.

**Q: How do we handle inappropriate content?**
A: Manual review for flagged content. Automated filtering in Phase 2. Clear ToS that user is responsible.

**Q: Can users download videos multiple times?**
A: Yes. Videos stored in Supabase for 90 days. No additional credit charge for re-downloads.

**Q: What if user runs out of credits mid-month?**
A: Generation blocked. Prompt to upgrade plan or purchase additional credits ($1.50 per video for Basic, $1 for Pro).

**Q: How do we handle refunds?**
A: Pro-rated refunds within 7 days of purchase if <5 videos generated. After that, no refunds (in ToS).

**Q: Can users share videos before downloading?**
A: Phase 2 feature. MVP only allows download, then user uploads manually to platforms.

**Q: What if ElevenLabs API is down?**
A: Show error to user, queue job for retry. If down >1 hour, send notification and apologize. Extend credits as compensation if extended outage.

**Q: How do we test video quality?**
A: Automated tests for: file size, resolution, duration, playback. Manual QA: visual quality, audio sync, caption accuracy.

**Q: Can enterprise users white-label?**
A: Yes, but only in Enterprise tier. They can upload logo to replace watermark, but "Powered by [Our Brand]" in footer remains unless negotiated separately.

