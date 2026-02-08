# Quickstart: Design System & Frontend Standards

**Feature**: 002-design-system
**Date**: 2026-02-08

## Prerequisites

- F001 (Foundation) completed — project scaffolding, Tailwind CSS v4, shadcn/ui, error system
- F001-clerk-auth (Auth) completed — dashboard layout, sidebar, header already in place
- Branch `002-design-system` checked out and rebased on `main`

## Implementation Steps

### Step 1: Update Color Tokens in globals.css

Update the `:root` and `.dark` blocks in `src/app/globals.css` to replace grayscale `--primary`, `--accent`, and `--ring` values with violet/purple oklch values. Add gradient custom properties and utility classes.

**Files**: `src/app/globals.css`

### Step 2: Create API Fetch Wrapper

Create `src/lib/api/client.ts` with typed generic functions (`get<T>`, `post<T>`, `put<T>`, `delete<T>`) that wrap native `fetch`. Include automatic auth credential forwarding, JSON parsing, error handling, and 401 redirect.

**Files**: `src/lib/api/client.ts`

### Step 3: Update Existing Components for New Tokens

Review and update `src/components/layout/sidebar-nav-item.tsx` to ensure active state uses the new violet-tinted `accent` tokens. The component already uses `bg-accent text-accent-foreground` — the token values update will apply automatically. Verify visually.

**Files**: `src/components/layout/sidebar-nav-item.tsx` (review, may not need code changes)

### Step 4: Create Design System Reference Document

Write `docs/DESIGN_SYSTEM.md` covering all five areas:
1. Color & Visual Tokens (palette, usage rules, gradient tokens)
2. Transitions & Motion (three tiers, easing, when NOT to animate)
3. Page Layout & Spacing (empty box approach, grid patterns, breakpoints)
4. API Call Patterns (wrapper usage, response shapes, error handling)
5. Navigation Patterns (active states, mobile behavior, tabs/pills)

**Files**: `docs/DESIGN_SYSTEM.md`

### Step 5: Build Verification

Run `tsc --noEmit` and `npm run lint` to verify no TypeScript or linting errors. The API wrapper must compile cleanly.

### Step 6: Visual Verification

Start dev server (`npm run dev`), navigate to dashboard pages, and verify:
- Primary buttons show violet color
- Sidebar active states use violet-tinted accent
- Focus rings are violet
- Hover transitions use consistent timing

## Verification Checklist

1. [ ] `globals.css` contains updated violet oklch values for `--primary`, `--accent`, `--ring`
2. [ ] `globals.css` contains `--gradient-cta` and `--gradient-hero` custom properties
3. [ ] `globals.css` contains `.bg-gradient-cta` and `.bg-gradient-hero` utility classes
4. [ ] `src/lib/api/client.ts` exists and exports `apiClient` with `get`, `post`, `put`, `delete` methods
5. [ ] API wrapper returns `{ data, error }` typed shape (verify via TypeScript compilation)
6. [ ] API wrapper handles 401 by redirecting to `/sign-in`
7. [ ] API wrapper handles network errors gracefully (returns error shape, doesn't throw)
8. [ ] `docs/DESIGN_SYSTEM.md` exists and covers all 5 areas
9. [ ] `tsc --noEmit` passes with zero errors
10. [ ] `npm run lint` passes with zero warnings
11. [ ] Dashboard pages show violet primary color when viewed in browser
12. [ ] No raw `fetch()` calls exist in any component or hook file (search verification)
