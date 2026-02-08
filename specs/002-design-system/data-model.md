# Data Model: Design System & Frontend Standards

**Feature**: 002-design-system
**Date**: 2026-02-08

## Overview

This feature does not introduce any persistent data models or database entities. All artifacts are either CSS custom properties (design tokens), a TypeScript module (API client), or documentation.

This document describes the **data shapes** that flow through the API client at runtime and the **static configuration** structures used by the design system.

## Entities

### ApiResponse<T> (runtime, client-side)

The typed response shape returned by the centralized API fetch wrapper. Uses a discriminated union for type-safe error handling.

| Field | Type | Condition | Notes |
|-------|------|-----------|-------|
| data | T | Success | The parsed response body |
| error | null | Success | Always null on success |
| data | null | Error | Always null on error |
| error.code | string | Error | Machine-readable error code (e.g., `AUTH_UNAUTHORIZED`) |
| error.message | string | Error | Human-readable error description |

### ApiClientConfig (static, compile-time)

Configuration for the fetch wrapper, resolved at module initialization.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| baseUrl | string | `""` (same origin) | Overridable via `NEXT_PUBLIC_API_URL` env var |
| defaultHeaders | Record<string, string> | `{ "Content-Type": "application/json", "Accept": "application/json" }` | Applied to all requests unless overridden |
| credentials | RequestCredentials | `"include"` | Forwards Clerk session cookie |

### DesignToken (conceptual, CSS custom property)

Not a runtime TypeScript type — exists as CSS custom properties in `globals.css`. Documented for reference.

| Token Category | CSS Variable Pattern | Example | Defined In |
|---------------|---------------------|---------|------------|
| Color - Primary | `--primary`, `--primary-foreground` | `oklch(0.546 0.245 262.881)` | `:root` / `.dark` |
| Color - Accent | `--accent`, `--accent-foreground` | `oklch(0.946 0.033 264.052)` | `:root` / `.dark` |
| Color - Muted | `--muted`, `--muted-foreground` | (unchanged from F001) | `:root` / `.dark` |
| Color - Destructive | `--destructive` | (unchanged from F001) | `:root` / `.dark` |
| Gradient - CTA | `--gradient-cta` | `linear-gradient(135deg, ...)` | `:root` |
| Gradient - Hero | `--gradient-hero` | `linear-gradient(180deg, ...)` | `:root` |
| Radius | `--radius` | `0.625rem` (unchanged) | `:root` |
| Ring | `--ring` | Updated to match primary violet | `:root` / `.dark` |

### TransitionPreset (conceptual, Tailwind class combination)

Not a runtime type — documented as standard class combinations for developer reference.

| Preset Name | Tailwind Classes | Use Case |
|-------------|-----------------|----------|
| Fast | `transition-colors duration-150 ease-out` | Hover states, focus indicators |
| Normal | `transition-all duration-200 ease-out` | Dropdown open, accordion expand |
| Slow | `transition-transform duration-300 ease-in-out` | Sidebar slide, modal entrance |

## Relationships

```
globals.css (design tokens)
  └── provides CSS custom properties consumed by:
       ├── Tailwind utility classes (bg-primary, text-accent-foreground, etc.)
       ├── shadcn/ui components (Button, Card, Input — via token references)
       └── Custom components (sidebar-nav-item, dashboard-header — via cn() utility)

src/lib/api/client.ts (API wrapper)
  └── consumed by:
       ├── React hooks in src/hooks/ (future: useVideoGeneration, etc.)
       └── Components making client-side API calls (future features F004+)

docs/DESIGN_SYSTEM.md (reference document)
  └── consumed by:
       └── Developers building new features (read-only documentation)
```

## Validation Rules

| Rule | Applies To | Constraint |
|------|-----------|------------|
| No raw fetch() | Client components/hooks | All API calls must go through `src/lib/api/client.ts` |
| No custom colors | CSS/Tailwind classes | Only use semantic token classes (`bg-primary`, `text-muted-foreground`, etc.) |
| No padding for layout | Page structures | Use `gap` on grid/flex containers; padding only for internal component spacing |
| Gradient restriction | UI elements | Only `bg-gradient-cta` and `bg-gradient-hero` allowed; all else must be flat/solid |

## Notes

- No database tables are created or modified in this feature.
- The ApiResponse type aligns with the server-side error pattern from `src/lib/errors/app-error.ts` (`toJSON()` returns `{ error: { code, message } }`).
- Design tokens are not TypeScript types — they exist purely in CSS. The `@theme inline` block in globals.css maps them to Tailwind utility classes.
