# ReelZero - AI-Powered Reel/Shorts Creator

An AI-powered SaaS platform that generates 60-second vertical short-form video content (Reels/Shorts/TikTok) from text prompts.

## Documentation

All project documentation is located in the [`docs/`](docs/) folder:

- **[PRD.md](docs/PRD.md)** - Product Requirements Document (v2.0 FINAL)
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System Architecture Document (v1.1)
- **[FEATURES.md](docs/FEATURES.md)** - Feature Breakdown & Implementation Order
- **[CODE_CONSTITUTION.md](docs/CODE_CONSTITUTION.md)** - Code Standards & Conventions
- **[CLAUDE.md](docs/CLAUDE.md)** - AI Assistant Guidance

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run all checks (lint + type-check + build)
npm run pre-commit
```

## Technology Stack

- **Frontend:** Next.js 14+ (App Router), React 18+, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes, Node.js 20+
- **Video:** Remotion for composition and rendering
- **Database:** Supabase PostgreSQL
- **Auth:** Clerk
- **Payments:** Stripe
- **AI Services:** Google Gemini Flash, Imagen 3, ElevenLabs

## Project Status

**Status:** Pre-development (planning phase complete, spec-kit integrated, implementation pending)

See [docs/FEATURES.md](docs/FEATURES.md) for the complete feature breakdown and implementation roadmap.

## Development Workflow

This project uses [GitHub Spec-Kit](https://github.com/github/spec-kit) for specification-driven development.

### Workflow Commands

```bash
/speckit.constitution    # Define/update project governing principles
/speckit.specify         # Create feature specification from requirements
/speckit.plan            # Create technical implementation plan from spec
/speckit.tasks           # Generate actionable task breakdown from plan
/speckit.implement       # Execute implementation of tasks
```

See [docs/CLAUDE.md](docs/CLAUDE.md) for detailed workflow guidance.

## License

Proprietary - All rights reserved
