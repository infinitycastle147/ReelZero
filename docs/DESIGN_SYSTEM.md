# ReelZero Design System

**Version**: 1.0 | **Feature**: 002-design-system | **Last Updated**: 2026-02-08

This document is the single source of truth for ReelZero's visual identity, layout patterns, interaction standards, API call conventions, and navigation guidelines. Every new component, page, or feature MUST follow these standards.

---

## Table of Contents

- [Quick Reference](#quick-reference)
- [1. Color & Visual Tokens](#1-color--visual-tokens)
- [2. Transitions & Motion](#2-transitions--motion)
- [3. Page Layout & Spacing](#3-page-layout--spacing)
- [4. API Call Patterns](#4-api-call-patterns)
- [5. Navigation Patterns](#5-navigation-patterns)

---

## Quick Reference

A cheat sheet of the most commonly needed tokens, classes, and patterns.

### Colors (Tailwind utility classes)

| Purpose | Class (background) | Class (text) | When to Use |
|---------|--------------------|--------------|-------------|
| Primary action | `bg-primary` | `text-primary` | CTA buttons, primary links |
| Primary text on color | — | `text-primary-foreground` | Text on `bg-primary` |
| Accent / active state | `bg-accent` | `text-accent-foreground` | Active sidebar items, selected states |
| Muted / disabled | `bg-muted` | `text-muted-foreground` | Disabled elements, helper text |
| Destructive | `bg-destructive` | `text-destructive` | Delete buttons, error states |
| Secondary | `bg-secondary` | `text-secondary-foreground` | Secondary buttons, less prominent UI |

### Gradients

| Class | Use Case |
|-------|----------|
| `bg-gradient-cta` | CTA buttons only |
| `bg-gradient-hero` | Hero section backgrounds only |

### Shadows

| Class | Use Case |
|-------|----------|
| `shadow-sm` | Cards, input groups, badges |
| `shadow-md` | Dropdowns, popovers, tooltips |
| `shadow-lg` | Modals, dialogs, drawers |

### Transitions

| Preset | Classes | Use Case |
|--------|---------|----------|
| Fast | `transition-colors duration-150 ease-out` | Hover states, focus indicators |
| Normal | `transition-all duration-200 ease-out` | Dropdown open, accordion expand |
| Slow | `transition-transform duration-300 ease-in-out` | Sidebar slide, modal entrance |

### Border Radius

| Class | Use Case |
|-------|----------|
| `rounded-sm` | Badges, small tags |
| `rounded-md` | Buttons, inputs, dropdowns |
| `rounded-lg` | Cards, modals, popovers |
| `rounded-xl` | Large cards, hero sections |

---

## 1. Color & Visual Tokens

### 1.1 Brand Palette

ReelZero uses a **violet/purple** brand palette built with the oklch color space. All color values are defined as CSS custom properties in `src/app/globals.css` and mapped to Tailwind utility classes via the `@theme inline` block.

#### Light Mode

| Token | Value | Purpose |
|-------|-------|---------|
| `--primary` | `oklch(0.546 0.245 262.881)` | Vibrant violet — CTA buttons, primary actions |
| `--primary-foreground` | `oklch(0.985 0 0)` | White text on violet backgrounds |
| `--accent` | `oklch(0.946 0.033 264.052)` | Subtle violet tint — active states, highlights |
| `--accent-foreground` | `oklch(0.372 0.079 265.638)` | Dark violet text on accent backgrounds |
| `--ring` | `oklch(0.546 0.245 262.881)` | Focus ring color (matches primary) |
| `--secondary` | `oklch(0.97 0 0)` | Near-white — secondary buttons |
| `--secondary-foreground` | `oklch(0.205 0 0)` | Dark text on secondary backgrounds |
| `--muted` | `oklch(0.97 0 0)` | Muted backgrounds — disabled states |
| `--muted-foreground` | `oklch(0.556 0 0)` | Gray text — helper text, placeholders |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Red — delete, error states |

#### Dark Mode

| Token | Value | Purpose |
|-------|-------|---------|
| `--primary` | `oklch(0.707 0.165 254.624)` | Lighter violet for dark backgrounds |
| `--primary-foreground` | `oklch(0.145 0 0)` | Dark text on light violet |
| `--accent` | `oklch(0.269 0.033 264.052)` | Dark violet-tinted background |
| `--accent-foreground` | `oklch(0.946 0.033 264.052)` | Light violet text on dark accent |
| `--ring` | `oklch(0.707 0.165 254.624)` | Focus ring (matches dark primary) |

### 1.2 Semantic Token Usage Rules

Always use semantic tokens via Tailwind utility classes. **Never use raw color values** in components.

| Context | Correct | Incorrect |
|---------|---------|-----------|
| Primary button background | `bg-primary` | `bg-[oklch(0.546...)]` |
| Disabled text | `text-muted-foreground` | `text-gray-400` |
| Error message | `text-destructive` | `text-red-500` |
| Card background | `bg-card` | `bg-white` |

**Rules**:
- `primary` — CTA buttons, primary links, key interactive elements
- `secondary` — Secondary buttons, less prominent actions
- `accent` — Active/selected states, highlights, hover backgrounds
- `muted` — Disabled elements, helper text, subtle backgrounds
- `destructive` — Delete actions, error states, critical warnings
- Never introduce new color tokens without updating this document

### 1.3 Gradient Tokens

Gradients are restricted to **two use cases only**. All other UI elements must use flat/solid colors.

| Token | Value | Use Case |
|-------|-------|----------|
| `--gradient-cta` | `linear-gradient(135deg, oklch(0.546 0.245 262.881), oklch(0.496 0.265 293.541))` | CTA buttons (diagonal violet to purple-pink) |
| `--gradient-hero` | `linear-gradient(180deg, oklch(0.546 0.245 262.881) 0%, oklch(0.446 0.195 272.881) 100%)` | Hero backgrounds (top-to-bottom violet deepening) |

**Usage**:
```html
<button class="bg-gradient-cta text-primary-foreground">Get Started</button>
<section class="bg-gradient-hero">...</section>
```

**Rule**: If a design calls for a gradient anywhere other than CTA buttons or hero sections, use a flat `bg-primary` instead.

### 1.4 Shadow / Elevation Scale

Use Tailwind's built-in shadow utilities mapped to three semantic tiers:

| Tier | Class | Components |
|------|-------|------------|
| Subtle | `shadow-sm` | Cards, input groups, badges, static containers |
| Medium | `shadow-md` | Dropdowns, popovers, tooltips, floating elements |
| Prominent | `shadow-lg` | Modals, dialogs, drawers, full-screen overlays |

**Rules**:
- Every elevated element must use one of these three tiers
- Nested shadows are discouraged (a card inside a modal doesn't get `shadow-sm`)
- Shadows work identically in light and dark mode (Tailwind handles opacity)

### 1.5 Border Radius

The radius scale is defined via `--radius: 0.625rem` in `:root`. Tailwind maps this to a scale:

| Class | Computed Value | Use Case |
|-------|---------------|----------|
| `rounded-sm` | `calc(0.625rem - 4px)` = ~0.375rem | Badges, tags, small chips |
| `rounded-md` | `calc(0.625rem - 2px)` = ~0.5rem | Buttons, inputs, selects, dropdowns |
| `rounded-lg` | `0.625rem` | Cards, modals, popovers |
| `rounded-xl` | `calc(0.625rem + 4px)` = ~0.875rem | Large cards, hero sections |

**Rule**: Use the semantic class (`rounded-md`), not arbitrary values (`rounded-[8px]`).

---

## 2. Transitions & Motion

### 2.1 Three Transition Tiers

Every state change that involves visual movement or color change must use one of these three presets:

| Tier | Tailwind Classes | Duration | Easing | Use Cases |
|------|-----------------|----------|--------|-----------|
| **Fast** | `transition-colors duration-150 ease-out` | 150ms | ease-out | Hover color shifts, focus ring appearance, link underlines |
| **Normal** | `transition-all duration-200 ease-out` | 200ms | ease-out | Dropdown open/close, accordion expand, tooltip show |
| **Slow** | `transition-transform duration-300 ease-in-out` | 300ms | ease-in-out | Sidebar slide, modal entrance/exit, page transitions |

### 2.2 Easing Curves

| Easing | Tailwind Class | When to Use |
|--------|---------------|-------------|
| `ease-out` | `ease-out` | **Entrances** — elements appearing (decelerates into final position) |
| `ease-in` | `ease-in` | **Exits** — elements disappearing (accelerates out of view) |
| `ease-in-out` | `ease-in-out` | **Positional changes** — elements moving between states (sidebar, drawer) |

### 2.3 Hover & Focus Interaction Patterns

| Element | Hover Pattern | Focus Pattern |
|---------|--------------|---------------|
| **Buttons** | `hover:bg-primary/90` (subtle opacity shift) + fast transition | `focus-visible:ring-2 focus-visible:ring-ring` (violet ring) |
| **Inputs** | — | `focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring` |
| **Links** | `hover:text-primary` (color shift) + fast transition | `focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm` |
| **Nav items** | `hover:bg-accent/50 hover:text-accent-foreground` + fast transition | Same as buttons |
| **Cards** | `hover:shadow-md` (elevation shift) + normal transition | Focus ring on interactive cards only |

### 2.4 When NOT to Animate

These state changes must be **instantaneous** (no transition class):

- Checkbox toggle (checked/unchecked)
- Radio button selection
- Instant data updates (loading spinners appearing, real-time counters)
- Text content changes (e.g., button label switching from "Save" to "Saving...")
- Theme/mode changes (light/dark switch applies immediately)
- Form validation error text appearing

**Rule**: If a state change does not involve physical movement or visual prominence change, do not animate it.

---

## 3. Page Layout & Spacing

### 3.1 The "Empty Box" Approach

Every page starts as a full-viewport container divided into regions using CSS Grid:

```
+--------------------------------------------------+
| Header (auto height, h-16)                       |
+--------------------------------------------------+
| Sidebar (256px) | Main Content (1fr)              |
| (lg: visible)   | (overflow-y-auto, p-6)         |
+--------------------------------------------------+
```

**Steps to build a new page**:
1. Use the dashboard layout — it already provides the grid shell
2. Write content inside `<main>` (the `children` slot)
3. Use Flexbox or Grid for component-level layout within main
4. Use `gap` for spacing between sibling elements

### 3.2 Dashboard Grid (Reference Implementation)

The reference layout lives in `src/app/(dashboard)/layout.tsx`:

```html
<!-- Page grid: header row + body row -->
<div class="grid min-h-screen grid-rows-[auto_1fr]">
  <header class="h-16 ...">...</header>

  <!-- Body grid: sidebar column + content column -->
  <div class="relative grid lg:grid-cols-[256px_1fr]">
    <aside class="w-64 ...">...</aside>
    <main class="overflow-y-auto p-6">
      {children}
    </main>
  </div>
</div>
```

### 3.3 Spacing Rules

| Rule | Correct | Incorrect |
|------|---------|-----------|
| Space between siblings | `gap-4` on parent flex/grid | `mt-4` on each child |
| Section spacing | `gap-6` or `gap-8` on parent | `mb-8` on each section |
| Internal component padding | `p-4` or `p-6` on the component | `mx-4 my-4` on each child |
| Page content padding | `p-6` on `<main>` (already set) | Adding `px-*` to page wrapper |

**Golden Rule**: Use `gap` on grid/flex containers for positioning. Reserve `padding` for internal component spacing only. Avoid `margin` for layout.

### 3.4 Responsive Breakpoints

| Breakpoint | Width | Layout Behavior |
|------------|-------|-----------------|
| Mobile | `<640px` (default) | Single column. Sidebar hidden (off-screen left). Hamburger in header. Stacked content. |
| Tablet | `640px - 1023px` (`sm:` / `md:`) | Single column. Sidebar still hidden. Content area wider. |
| Desktop | `>=1024px` (`lg:`) | Two-column. Sidebar visible (static). Full dashboard layout. |

**Sidebar behavior**:
- **Mobile/Tablet**: Hidden by default. Toggled via hamburger menu. Slides in from left with `transition-transform duration-200`. Overlay backdrop: `fixed inset-0 z-30 bg-black/40 lg:hidden`.
- **Desktop**: Always visible, static position, `lg:translate-x-0`.

### 3.5 Max Content Widths

| Page Type | Max Width | Implementation |
|-----------|-----------|----------------|
| Full-bleed dashboard | None (fills `1fr` column) | Default — no `max-w-*` needed |
| Centered form/settings | `max-w-2xl` (672px) | `<div class="mx-auto max-w-2xl">` inside main |
| Narrow content (auth pages) | `max-w-md` (448px) | `<div class="mx-auto max-w-md">` |

---

## 4. API Call Patterns

### 4.1 The Fetch Wrapper

All client-side API calls must use the centralized wrapper at `src/lib/api/client.ts`. Raw `fetch()` in components or hooks is **prohibited**.

```typescript
import { apiClient } from "@/lib/api/client";
```

### 4.2 Method Signatures

```typescript
apiClient.get<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>>
apiClient.post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>
apiClient.put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>
apiClient.delete<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>>
```

**RequestOptions**:
```typescript
type RequestOptions = {
  headers?: Record<string, string>;  // Override default headers
  signal?: AbortSignal;               // For cancellation
};
```

### 4.3 Response Shapes

Every call returns `ApiResponse<T>` — a discriminated union:

```typescript
// Success
{ data: T; error: null }

// Error
{ data: null; error: { code: string; message: string } }
```

**Usage pattern**:
```typescript
const result = await apiClient.get<Video[]>("/api/videos");

if (result.error) {
  // Handle error — result.data is null
  console.error(result.error.code, result.error.message);
  return;
}

// Success — result.data is Video[]
const videos = result.data;
```

### 4.4 Automatic Behaviors

| Behavior | Detail |
|----------|--------|
| **Base URL** | Prepends `NEXT_PUBLIC_API_URL` env var (empty string = same origin) |
| **Headers** | `Content-Type: application/json` + `Accept: application/json` by default |
| **Credentials** | `credentials: "include"` — forwards Clerk session cookie automatically |
| **401 Handling** | Redirects to `/sign-in` automatically |
| **Network Errors** | Returns `{ data: null, error: { code: "NETWORK_ERROR", message: "Network request failed" } }` |
| **Abort** | Returns `{ data: null, error: { code: "REQUEST_ABORTED", message: "Request was aborted" } }` |

### 4.5 Error Handling Flow

```
API Call
  |
  +-- Network failure --> { code: "NETWORK_ERROR", ... }
  |
  +-- 401 Unauthorized --> Redirect to /sign-in
  |
  +-- 4xx/5xx Error --> Parse response body:
  |     +-- Has { error: { code, message } } --> Return parsed error
  |     +-- No parseable body --> { code: "HTTP_<status>", message: "Request failed..." }
  |
  +-- 2xx Success --> { data: <parsed JSON>, error: null }
```

### 4.6 HTTP Method Guidelines

| Method | When to Use | Body? |
|--------|-------------|-------|
| `GET` | Fetch data, list resources | No |
| `POST` | Create new resources, trigger actions | Yes |
| `PUT` | Update entire resources | Yes |
| `DELETE` | Remove resources | No |

### 4.7 File Uploads (Multipart)

For file uploads, override the `Content-Type` header to let the browser set the multipart boundary:

```typescript
const formData = new FormData();
formData.append("file", file);

const result = await apiClient.post<UploadResult>("/api/upload", formData, {
  headers: { "Content-Type": "" }, // Empty string removes default JSON content type
});
```

> Note: When the `Content-Type` header is set to an empty string, the browser's native FormData handling will set the correct `multipart/form-data` boundary.

### 4.8 Rule: No Raw fetch()

**SC-004**: No raw `fetch()` calls may exist in any file under `src/components/` or `src/hooks/`. The only `fetch()` call in the codebase lives inside `src/lib/api/client.ts`.

To verify: search for `fetch(` in `src/components/` and `src/hooks/` — expect zero results.

---

## 5. Navigation Patterns

### 5.1 Sidebar Active State

The sidebar uses `SidebarNavItem` component (`src/components/layout/sidebar-nav-item.tsx`) which detects the active route via `usePathname()`.

| State | Classes | Visual Result |
|-------|---------|---------------|
| **Active** | `bg-accent text-accent-foreground` | Subtle violet-tinted background, dark violet text |
| **Inactive** | `text-muted-foreground` | Gray text, no background |
| **Hover (inactive)** | `hover:bg-accent/50 hover:text-accent-foreground` | Light violet tint on hover |

**Implementation reference**:
```tsx
<Link
  href={href}
  className={cn(
    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-accent text-accent-foreground"
      : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
  )}
>
```

### 5.2 Mobile Navigation

Mobile navigation follows a slide-in drawer pattern:

1. **Trigger**: Hamburger icon in header (`<Menu />` from lucide-react), visible only on `lg:hidden`
2. **Overlay**: `fixed inset-0 z-30 bg-black/40 lg:hidden` — click to dismiss
3. **Sidebar**: `fixed inset-y-0 left-0 z-40 w-64` — slides in via `transition-transform duration-200`
   - Open: `translate-x-0`
   - Closed: `-translate-x-full`
4. **Desktop**: Sidebar is static (`lg:static lg:z-auto lg:translate-x-0`) — no hamburger needed

**State management**: Sidebar open/close state lives in Zustand (`useUIStore.isSidebarOpen`).

### 5.3 Tab / Pill Navigation (In-Page)

For pages requiring in-page section switching (e.g., video settings, billing tabs):

| State | Classes |
|-------|---------|
| **Active tab** | `bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium` |
| **Inactive tab** | `text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-sm font-medium transition-colors` |
| **Tab container** | `flex gap-1 rounded-lg bg-muted p-1` (pill-style container) |

**Example**:
```html
<div class="flex gap-1 rounded-lg bg-muted p-1">
  <button class="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium">
    General
  </button>
  <button class="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-sm font-medium transition-colors">
    Billing
  </button>
</div>
```

> **Note**: The tab/pill pattern is defined here for consistency. Actual implementation occurs when a feature (F007 or later) needs in-page section switching.

---

## Appendix: File Reference

| File | Purpose |
|------|---------|
| `src/app/globals.css` | All CSS custom properties (design tokens), gradient utilities |
| `src/lib/api/client.ts` | Centralized API fetch wrapper |
| `src/components/layout/sidebar-nav-item.tsx` | Sidebar nav item with active state |
| `src/components/layout/dashboard-sidebar.tsx` | Sidebar with navigation items |
| `src/components/layout/dashboard-header.tsx` | Header with hamburger toggle and user button |
| `src/app/(dashboard)/layout.tsx` | Dashboard grid layout (reference implementation) |
| `src/store/ui-store.ts` | Zustand store for sidebar state |
