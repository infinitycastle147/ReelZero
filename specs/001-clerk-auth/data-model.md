# Data Model: Authentication (Clerk)

**Feature**: 001-clerk-auth
**Date**: 2026-02-07

## Overview

This feature does not introduce any persistent data models. Clerk manages all user identity and session data externally. The webhook endpoint receives event payloads but does not persist them (deferred to F004).

This document describes the **data shapes** that flow through the system at runtime.

## Entities

### ClerkUser (external, read-only)

Provided by Clerk's `auth()` and `currentUser()` server functions. Not stored in our database in this feature.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| userId | string | `auth().userId` | Clerk's unique user ID (e.g., `user_2abc...`) |
| firstName | string | null | `currentUser().firstName` | From Google profile |
| lastName | string | null | `currentUser().lastName` | From Google profile |
| emailAddress | string | `currentUser().emailAddresses[0].emailAddress` | Primary email |
| imageUrl | string | `currentUser().imageUrl` | Google profile picture URL |

### WebhookEvent (transient)

Received at `POST /api/auth/webhook`. Verified via svix signature, then logged (not persisted in this feature).

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| id | string | Svix header `svix-id` | Unique event identifier |
| type | string | Event payload `type` | One of: `user.created`, `user.updated`, `user.deleted` |
| data | object | Event payload `data` | Contains Clerk user object |
| timestamp | string | Svix header `svix-timestamp` | Event timestamp for replay protection |

### SidebarState (client-side, Zustand)

Managed by the existing `useUIStore` from F001.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| isSidebarOpen | boolean | `true` (desktop), `false` (mobile) | Toggled via hamburger icon |

### NavigationItem (static config)

Configuration object for sidebar navigation links. Defined as a constant array, not stored in a database.

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| label | string | `"Dashboard"` | Display text |
| href | string | `"/dashboard"` | Route path |
| icon | LucideIcon | `LayoutDashboard` | Icon component from lucide-react |

**Navigation items** (in order):
1. Dashboard → `/dashboard` → `LayoutDashboard` icon
2. Create Video → `/create` → `PlusCircle` icon
3. My Videos → `/videos` → `Video` icon (placeholder, no `[id]` route)
4. Billing → `/billing` → `CreditCard` icon

## State Transitions

### Authentication State

```
Unauthenticated ──[sign-in/sign-up]──> Authenticated
Authenticated ──[sign-out]──> Unauthenticated
Authenticated ──[session-expired]──> Unauthenticated
```

### Sidebar State

```
Open ──[toggleSidebar]──> Closed
Closed ──[toggleSidebar]──> Open
Open ──[resize below 1024px]──> Closed (auto)
Closed ──[resize above 1024px]──> Open (auto)
```

## Relationships

```
ClerkProvider (root layout)
  └── provides auth context to all descendants
       ├── middleware.ts reads auth state for route protection
       ├── (auth)/ pages use SignIn/SignUp components
       └── (dashboard)/ layout reads user identity for header display
```

## Validation Rules

| Rule | Applies To | Constraint |
|------|-----------|------------|
| Webhook signature | WebhookEvent | svix signature must match `CLERK_WEBHOOK_SECRET`; reject with 400 if invalid |
| Auth required | Dashboard routes | `auth.protect()` in middleware; redirect to `/sign-in` if no session |
| Already authenticated | Auth pages | Redirect to `/dashboard` if user has active session |

## Notes

- No database tables are created or modified in this feature.
- The `DbUser` type from `src/types/database.ts` exists but is not populated until F004.
- The `useUserStore` Zustand store exists but is not populated until F004 syncs Clerk user data with the database.
