# Draft Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-07

## Active Technologies
- TypeScript 5+ (strict mode), Next.js 16+ (App Router) + Tailwind CSS v4, shadcn/ui (new-york style, neutral base), oklch color system (002-design-system)
- N/A (no database in this feature) (002-design-system)
- TypeScript 5+ (strict mode), Next.js 16+ (App Router) + `@supabase/supabase-js` (new), `svix` (existing, webhook verification), `@clerk/nextjs` (existing) (003-database-user-sync)
- Supabase PostgreSQL (database) + Supabase Storage (4 buckets: videos, images, audio, thumbnails) (003-database-user-sync)
- TypeScript 5+ (strict mode), Next.js 16+ (App Router) + `sharp` (v0.34.5, already installed), `@supabase/supabase-js` (existing), `@clerk/nextjs` (existing) (004-ai-services)
- Supabase Storage (`images` bucket for scene images, `audio` bucket for TTS MP3s) + Supabase PostgreSQL (`generation_logs`, `uploaded_images` tables) (004-ai-services)

- TypeScript 5+ (strict mode), Next.js 16+ (App Router) + `@clerk/nextjs` (auth SDK), `svix` (webhook verification), `lucide-react` (icons), `shadcn/ui` (UI components) (001-clerk-auth)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5+ (strict mode), Next.js 16+ (App Router): Follow standard conventions

## Recent Changes
- 004-ai-services: Added TypeScript 5+ (strict mode), Next.js 16+ (App Router) + `sharp` (v0.34.5, already installed), `@supabase/supabase-js` (existing), `@clerk/nextjs` (existing)
- 003-database-user-sync: Added TypeScript 5+ (strict mode), Next.js 16+ (App Router) + `@supabase/supabase-js` (new), `svix` (existing, webhook verification), `@clerk/nextjs` (existing)
- 002-design-system: Added TypeScript 5+ (strict mode), Next.js 16+ (App Router) + Tailwind CSS v4, shadcn/ui (new-york style, neutral base), oklch color system


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
