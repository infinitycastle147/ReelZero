# Quickstart: Project Foundation & Scaffolding

**Feature**: 001-foundation
**Date**: 2026-02-07

## Prerequisites

- Node.js 20+ installed
- npm 10+ installed
- Git configured

## Setup Steps

### 1. Initialize Next.js Project

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Key options:
- TypeScript: Yes
- Tailwind CSS: Yes
- ESLint: Yes
- App Router: Yes
- `src/` directory: Yes
- Import alias: `@/*`

### 2. Configure TypeScript Strict Mode

Verify `tsconfig.json` has `"strict": true` (create-next-app enables this by default).

### 3. Initialize shadcn/ui

```bash
npx shadcn@latest init
```

Then install base components:
```bash
npx shadcn@latest add button card input label toast select textarea
```

### 4. Install Additional Dependencies

```bash
npm install zustand
```

### 5. Set Node.js Engine Requirement

Add to `package.json`:
```json
{
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### 6. Add Package Scripts

Ensure `package.json` scripts include:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "pre-commit": "npm run lint && npm run type-check && npm run build"
  }
}
```

### 7. Create Directory Structure

Create all directories per the plan's Source Code structure. Stub directories get a `.gitkeep` file to ensure they are tracked in Git.

### 8. Create Foundation Files

In order:
1. `src/lib/errors/codes.ts` - ERROR_CODES constant
2. `src/lib/errors/messages.ts` - Error code to message mapping
3. `src/lib/errors/app-error.ts` - AppError class
4. `src/lib/errors/middleware.ts` - withErrorHandler wrapper
5. `src/lib/constants/video.ts` - Video spec constants
6. `src/lib/constants/pricing.ts` - Pricing tier constants
7. `src/lib/constants/voices.ts` - Voice option constants
8. `src/types/video.ts` - Video entity types
9. `src/types/scene.ts` - Scene structure types
10. `src/types/api.ts` - API response types
11. `src/types/database.ts` - Database record types
12. `src/store/video-store.ts` - Video creation store skeleton
13. `src/store/user-store.ts` - User/subscription store skeleton
14. `src/store/ui-store.ts` - UI state store skeleton
15. `.env.example` - Environment variable template

### 9. Create Placeholder Page

Update `src/app/page.tsx` to show "ReelZero" project name as a placeholder.

### 10. Configure ESLint

Update `.eslintrc.json` to:
- Extend `next/core-web-vitals` and `next/typescript`
- Set `@typescript-eslint/no-explicit-any` to `error`

### 11. Verify

```bash
npm run dev          # Should start at localhost:3000
npm run lint         # Zero errors, zero warnings
npm run type-check   # No TypeScript errors
npm run build        # Production build succeeds
npm run pre-commit   # All three checks pass
```

## Validation Checklist

- [ ] `npm run dev` starts without errors
- [ ] Browser shows "ReelZero" at localhost:3000
- [ ] `npm run pre-commit` passes all three checks
- [ ] All directory structure exists per ARCHITECTURE.md
- [ ] `AppError` can be instantiated and serialized
- [ ] ERROR_CODES are importable and typed
- [ ] Constants are importable with correct values
- [ ] Types compile in strict mode
- [ ] Zustand stores are importable and functional
- [ ] `.env.example` documents all required variables
