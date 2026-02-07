# Research: Authentication (Clerk)

**Feature**: 001-clerk-auth
**Date**: 2026-02-07

## R1: Clerk + Next.js App Router Integration Pattern

**Decision**: Use `@clerk/nextjs` with `clerkMiddleware()` and `createRouteMatcher()` for route protection at the edge middleware level.

**Rationale**: Clerk's official Next.js SDK provides:
- `ClerkProvider` wraps the root layout, providing auth context to all components
- `clerkMiddleware()` in `middleware.ts` intercepts requests before they reach route handlers
- `createRouteMatcher()` defines which routes are public vs. protected
- `SignIn` / `SignUp` components render full OAuth flows with zero custom logic
- `UserButton` component handles profile display + sign-out
- `auth()` server function provides the current user in Server Components and API routes

**Alternatives considered**:
- **NextAuth.js**: More flexible for multi-provider, but Clerk provides a hosted dashboard, user management UI, and webhook system out of the box. Clerk is specified in the PRD.
- **Custom OAuth implementation**: Excessive complexity for MVP. Clerk handles token rotation, session management, and CSRF automatically.

## R2: Clerk Middleware Route Protection Strategy

**Decision**: Use `createRouteMatcher` to define public routes explicitly. All other routes are protected by default via `auth.protect()`.

**Rationale**: Safer default — new routes are automatically protected unless explicitly made public. The public routes list is:
- `/` (landing page)
- `/sign-in(.*)` (Clerk sign-in flow)
- `/sign-up(.*)` (Clerk sign-up flow)
- `/api/auth/webhook` (Clerk webhook — must be publicly accessible for Clerk to call it)

**Pattern**:
```
const isPublicRoute = createRouteMatcher([...])
if (!isPublicRoute(request)) { await auth.protect() }
```

This redirects unauthenticated users to `/sign-in` automatically and preserves the original URL for post-auth redirect.

**Alternatives considered**:
- **`publicRoutes` option on `clerkMiddleware()`**: Simpler but less flexible. The callback form allows future role-based logic if needed.
- **Per-page `auth()` checks**: More granular but requires remembering to add checks to every page. Middleware is a single enforcement point.

## R3: Clerk Webhook Verification

**Decision**: Use the `svix` library (Clerk's webhook infrastructure provider) to verify webhook signatures in the API route handler.

**Rationale**: Clerk sends webhook events via Svix. Each request includes `svix-id`, `svix-timestamp`, and `svix-signature` headers. The `svix` package provides a `Webhook` class that verifies these against the `CLERK_WEBHOOK_SECRET`. This is Clerk's officially recommended verification method.

**Pattern**:
```
const wh = new Webhook(CLERK_WEBHOOK_SECRET)
const evt = wh.verify(body, headers) // throws on invalid signature
```

The webhook endpoint must:
1. Read the raw request body (not parsed JSON)
2. Extract svix headers
3. Verify signature before processing
4. Return 200 on success, 400 on invalid signature

**Alternatives considered**:
- **Skip verification in dev**: Risk of accepting forged events. Even in dev, Clerk provides a real webhook secret.
- **Clerk Backend SDK verification**: Clerk recommends svix directly for webhooks.

## R4: Tailwind CSS v4 + Clerk Appearance Compatibility

**Decision**: Pass `cssLayerName: 'clerk'` to the `ClerkProvider` `appearance` prop, and add `@layer clerk` import in `globals.css`.

**Rationale**: Tailwind CSS v4 uses CSS cascade layers. Without explicit layer configuration, Clerk's default styles can conflict with Tailwind's reset/base layers. The `cssLayerName` option tells Clerk to scope its styles within a named CSS layer, preventing specificity conflicts.

**Alternatives considered**:
- **Custom Clerk theme**: Possible but unnecessary for MVP. The default Clerk UI with layer compatibility is sufficient.
- **Override all Clerk styles**: Excessive effort. The `appearance.elements` prop allows targeted overrides if needed.

## R5: Dashboard Layout - Sidebar State Management

**Decision**: Use the existing `useUIStore` Zustand store (already has `isSidebarOpen` and `toggleSidebar()`) for sidebar toggle state.

**Rationale**: The F001 foundation already created a `ui-store.ts` with sidebar state management:
- `isSidebarOpen: boolean` (default: `true` on desktop, `false` on mobile)
- `toggleSidebar()` action
- Avoids creating a redundant hook or store

The sidebar will:
- Be visible by default on desktop (>=1024px)
- Be hidden by default on mobile (<1024px)
- Toggle via hamburger icon in the header
- Use CSS transitions for open/close animation

**Alternatives considered**:
- **New `use-sidebar` hook**: Redundant given the existing Zustand store.
- **CSS-only responsive sidebar**: Less controllable; can't programmatically close on navigation on mobile.
- **shadcn/ui Sidebar component**: Available but more complex than needed for a basic sidebar with 4 nav links.

## R6: Sign-In/Sign-Up Page Structure

**Decision**: Use Clerk's `<SignIn />` and `<SignUp />` components within the `(auth)/` route group, with a centered layout.

**Rationale**: Clerk components handle the full OAuth flow including:
- Google OAuth button rendering
- Error states (consent denied, network failure)
- Redirect to `redirectUrl` after success
- Automatic account deduplication (existing user with same email signs in instead of creating duplicate)

The `(auth)/layout.tsx` provides a centered, minimal layout distinct from the dashboard shell.

**Alternatives considered**:
- **Custom sign-in form with Clerk hooks**: More work with no UX benefit for Google-only OAuth. Custom forms are useful when adding email/password.

## R7: Webhook Endpoint — Placeholder vs. Full Implementation

**Decision**: Implement webhook with full signature verification but only log events. No database writes (deferred to F004).

**Rationale**: The spec defines this as a P3 placeholder. Full sync logic requires the database schema from F004. However, implementing signature verification now means:
- The endpoint is production-ready from a security perspective
- F004 only needs to add the database write logic inside the existing handler
- Webhook can be configured in Clerk dashboard immediately for testing

**Structure**:
```
POST /api/auth/webhook
├── Verify svix signature → 400 on failure
├── Parse event type (user.created, user.updated, user.deleted)
├── Log event (console.log for now)
└── Return 200 with { success: true }
```
