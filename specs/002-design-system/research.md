# Research: Design System & Frontend Standards

**Feature**: 002-design-system
**Date**: 2026-02-08

## R1: Violet/Purple oklch Token Values for Brand Palette

**Decision**: Use oklch hue ~270-280 (violet range) with varying lightness/chroma for semantic token roles.

**Rationale**: The existing globals.css uses oklch color space exclusively. All current `--primary` tokens are `oklch(L 0 0)` (zero chroma = grayscale). Introducing chroma on the ~270 hue axis creates a violet that works as both light and dark mode primary. oklch ensures perceptual uniformity — equal chroma steps produce visually equal saturation changes.

**Specific values chosen**:
- Light mode `--primary`: `oklch(0.546 0.245 262.881)` — a vibrant violet, high contrast against white
- Light mode `--primary-foreground`: `oklch(0.985 0 0)` — white text on violet
- Dark mode `--primary`: `oklch(0.707 0.165 254.624)` — lighter violet for dark backgrounds, sufficient contrast
- Dark mode `--primary-foreground`: `oklch(0.145 0 0)` — dark text on light violet
- `--accent` (light): `oklch(0.946 0.033 264.052)` — very subtle violet tint for active states
- `--accent-foreground` (light): `oklch(0.372 0.079 265.638)` — dark violet for text on accent backgrounds
- `--ring`: `oklch(0.546 0.245 262.881)` — matches primary for focus rings

**Alternatives considered**:
- Using HSL: Rejected — project already uses oklch throughout; mixing color spaces creates inconsistency
- Using CSS named colors: Rejected — not granular enough for design system needs
- shadcn/ui violet preset: Considered but manually tuning oklch values gives better control over chroma/lightness balance and matches existing token structure exactly

## R2: Gradient Token Strategy (Minimal Usage)

**Decision**: Define two CSS custom properties for gradients, used only on CTA buttons and hero backgrounds. No Tailwind utility classes for gradients — use inline styles or targeted CSS classes.

**Rationale**: Tailwind v4 supports `bg-gradient-to-*` but custom gradient tokens with specific brand colors are cleaner as CSS custom properties. Limiting to two use cases prevents gradient creep.

**Specific approach**:
- `--gradient-cta`: `linear-gradient(135deg, oklch(0.546 0.245 262.881), oklch(0.496 0.265 293.541))` — violet to purple-pink diagonal
- `--gradient-hero`: `linear-gradient(180deg, oklch(0.546 0.245 262.881) 0%, oklch(0.446 0.195 272.881) 100%)` — top-to-bottom violet deepening
- Applied via utility classes `.bg-gradient-cta` and `.bg-gradient-hero` defined in globals.css `@layer utilities`

**Alternatives considered**:
- Tailwind arbitrary values: Rejected — verbose and not reusable across components
- No gradients at all: User explicitly chose minimal gradients for visual polish

## R3: Shadow/Elevation Scale

**Decision**: Use Tailwind's built-in shadow utilities (`shadow-sm`, `shadow-md`, `shadow-lg`) mapped to three semantic tiers.

**Rationale**: Tailwind v4 provides well-calibrated shadow values out of the box. No need for custom shadow tokens — the documentation simply maps Tailwind classes to component contexts.

**Mapping**:
- Subtle (`shadow-sm`): Cards, input groups, badges
- Medium (`shadow-md`): Dropdowns, popovers, tooltips
- Prominent (`shadow-lg`): Modals, dialogs, drawers

**Alternatives considered**:
- Custom CSS `box-shadow` tokens: Rejected — Tailwind's built-ins are sufficient and already work with dark mode
- No shadows: Rejected — shadows provide critical depth cues for layered UI

## R4: Fetch Wrapper Architecture (Clerk Auth Integration)

**Decision**: Create `src/lib/api/client.ts` using browser-native `fetch` with `credentials: 'include'` to leverage Clerk's session cookie. Return typed `ApiResponse<T>` discriminated union.

**Rationale**: Clerk's `@clerk/nextjs` automatically manages session cookies on the same domain. Client-side API calls to Next.js API routes on the same origin can use `credentials: 'include'` to forward the Clerk session cookie — no manual token extraction needed. The server-side middleware (`src/middleware.ts`) already protects API routes via `clerkMiddleware`.

**API shape**:
```typescript
type ApiSuccessResponse<T> = { data: T; error: null };
type ApiErrorResponse = { data: null; error: { code: string; message: string } };
type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
```

**Key behaviors**:
- `apiClient.get<T>(path)`, `apiClient.post<T>(path, body)`, `apiClient.put<T>(path, body)`, `apiClient.delete<T>(path)`
- Auto-prepends base URL (empty string for same-origin, or `NEXT_PUBLIC_API_URL` env var if set)
- Sets `Content-Type: application/json` and `Accept: application/json` by default
- On 401: redirects to `/sign-in` via `window.location.href`
- On network error: returns `{ data: null, error: { code: 'NETWORK_ERROR', message: 'Network request failed' } }`
- Supports `options.headers` override for multipart requests (omit Content-Type to let browser set boundary)

**Alternatives considered**:
- Axios: Rejected — constitution says no external HTTP libraries; native fetch is sufficient
- ky: Rejected — same reason; adds bundle size for minimal benefit
- SWR/React Query integration: Deferred to feature-level hooks (F004+) — the wrapper is the transport layer; caching is a separate concern
- Manual Bearer token: Rejected — Clerk handles cookies automatically; manual token management adds complexity with no benefit

## R5: Tailwind v4 @theme Syntax for New Tokens

**Decision**: Add new color tokens within the existing `@theme inline { }` block and define CSS custom properties in `:root` / `.dark` blocks, matching the current pattern exactly.

**Rationale**: The existing `globals.css` uses Tailwind v4's `@theme inline` syntax to map CSS custom properties to Tailwind utilities. New violet tokens must follow this exact pattern to be available as `bg-primary`, `text-primary-foreground`, etc.

**Implementation**: Update only the `--primary`, `--primary-foreground`, `--accent`, `--accent-foreground`, `--ring`, and sidebar equivalent values in `:root` and `.dark`. The `@theme inline` block already maps these to Tailwind — no new `@theme` entries needed unless adding entirely new token names.

**New tokens added to `@theme inline`**:
- `--color-gradient-cta` and `--color-gradient-hero` are NOT needed in `@theme` — they're applied via custom utility classes, not Tailwind color utilities

## R6: Transition Presets with Tailwind Classes

**Decision**: Document transition presets as combinations of existing Tailwind utility classes rather than creating custom CSS.

**Rationale**: Tailwind v4 provides `transition-colors`, `transition-transform`, `transition-all`, `duration-150`, `duration-200`, `duration-300`, and `ease-in`, `ease-out`, `ease-in-out`. Combining these covers all spec requirements without custom CSS.

**Presets**:
- Fast (hover states): `transition-colors duration-150 ease-out`
- Normal (UI state changes): `transition-all duration-200 ease-out`
- Slow (layout shifts): `transition-transform duration-300 ease-in-out`

**Alternatives considered**:
- Custom CSS `@keyframes` animations: Deferred — not needed for MVP; simple transitions suffice
- Framer Motion: Rejected — too heavy for the simple transitions needed; adds bundle size

## R7: Existing Layout Patterns (Dashboard Shell)

**Decision**: Document the existing dashboard layout from `001-clerk-auth` as the reference implementation for the "empty box" grid approach. No modifications needed to the layout — only documentation.

**Rationale**: The `src/app/(dashboard)/layout.tsx` already implements CSS Grid (`grid-rows-[auto_1fr]` + `lg:grid-cols-[256px_1fr]`), responsive sidebar with `transition-transform duration-200`, and `overflow-y-auto` on main content. This IS the design system's layout pattern — we just need to document it.

**Key patterns already established**:
- Page grid: `grid min-h-screen grid-rows-[auto_1fr]` (header + body)
- Body grid: `grid lg:grid-cols-[256px_1fr]` (sidebar + content)
- Sidebar: fixed on mobile with transform transition, static on desktop
- Mobile overlay: `fixed inset-0 z-30 bg-black/40 lg:hidden`
- Main content: `overflow-y-auto p-6`
- Header: `h-16` fixed height
