# Quickstart: Authentication (Clerk)

**Feature**: 001-clerk-auth
**Date**: 2026-02-07

## Prerequisites

1. **F001 Foundation complete**: Project runs via `npm run dev`, directory structure exists.
2. **Clerk account**: Create a project at [clerk.com](https://clerk.com).
3. **Google OAuth configured**: In the Clerk Dashboard, enable Google as a social connection under **User & Authentication > Social Connections**.

## Environment Setup

Copy the following values from your Clerk Dashboard into `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
CLERK_WEBHOOK_SECRET=whsec_...
```

To get the webhook secret:
1. Go to Clerk Dashboard > **Webhooks**
2. Click **Add Endpoint**
3. Set URL to `https://your-domain.com/api/auth/webhook` (use ngrok for local dev)
4. Select events: `user.created`, `user.updated`, `user.deleted`
5. Copy the **Signing Secret** into `CLERK_WEBHOOK_SECRET`

## Install Dependencies

```bash
npm install @clerk/nextjs svix
```

## Implementation Order

### Step 1: Root Layout — ClerkProvider

Modify `src/app/layout.tsx` to wrap the app with `ClerkProvider`:
- Import `ClerkProvider` from `@clerk/nextjs`
- Pass `appearance={{ cssLayerName: 'clerk' }}` for Tailwind v4 compatibility
- Add Clerk CSS layer import to `globals.css`

### Step 2: Middleware — Route Protection

Create `src/middleware.ts` at the project root:
- Import `clerkMiddleware` and `createRouteMatcher` from `@clerk/nextjs/server`
- Define public routes: `/`, `/sign-in(.*)`, `/sign-up(.*)`, `/api/auth/webhook`
- Call `auth.protect()` for all non-public routes
- Export the standard Next.js middleware `config.matcher`

### Step 3: Auth Pages — Sign In & Sign Up

Create pages under `src/app/(auth)/`:
- `layout.tsx`: Centered layout (flex, min-h-screen, items-center, justify-center)
- `sign-in/[[...sign-in]]/page.tsx`: Renders `<SignIn />` component
- `sign-up/[[...sign-up]]/page.tsx`: Renders `<SignUp />` component

Both components should set `redirectUrl="/dashboard"` and cross-link to each other.

### Step 4: Dashboard Layout — Header + Sidebar

Create `src/app/(dashboard)/layout.tsx`:
- Full-height grid layout: sidebar (fixed 256px on desktop, hidden on mobile) + main content (fluid)
- Header: fixed height, contains hamburger toggle (mobile), app logo/name, UserButton (right)
- Sidebar: navigation links using the NavigationItem config

Create components in `src/components/layout/`:
- `dashboard-header.tsx`: Header bar with profile and mobile toggle
- `dashboard-sidebar.tsx`: Navigation list with active state detection
- `sidebar-nav-item.tsx`: Individual nav link with icon, label, active styling

### Step 5: Placeholder Pages

Create minimal pages for each dashboard route:
- `(dashboard)/dashboard/page.tsx`: "Welcome to ReelZero" heading
- `(dashboard)/create/page.tsx`: "Create Video" heading (placeholder)
- `(dashboard)/billing/page.tsx`: "Billing" heading (placeholder)

### Step 6: Webhook Endpoint

Create `src/app/api/auth/webhook/route.ts`:
- Read raw request body
- Extract svix headers
- Verify signature using `svix` Webhook class
- Log event type and user ID
- Return `{ data: { success: true } }`
- Use `withErrorHandler` wrapper from error middleware

### Step 7: Auth Helpers

Create `src/lib/auth/middleware.ts`:
- Export `getAuthUser()` helper that wraps Clerk's `auth()` for use in API routes
- Throws `AppError(ERROR_CODES.AUTH_UNAUTHORIZED)` if no userId present

## Verification

After implementation, verify:

1. **Sign up**: Navigate to `/sign-up`, click Google, complete OAuth, land on `/dashboard`
2. **Sign in**: Navigate to `/sign-in`, authenticate, land on `/dashboard`
3. **Route protection**: Access `/dashboard` while logged out — should redirect to `/sign-in`
4. **Post-auth redirect**: Access `/billing` while logged out — after sign-in, should land on `/billing`
5. **Dashboard shell**: Header shows user avatar + name; sidebar has 4 nav links
6. **Mobile sidebar**: Resize to <1024px — sidebar hidden, hamburger visible, toggles sidebar
7. **Sign out**: Click UserButton > Sign Out — redirected to `/sign-in`
8. **Already authed redirect**: Visit `/sign-in` while logged in — redirected to `/dashboard`
9. **Webhook**: Send test event from Clerk Dashboard > Webhooks — check server logs for event
10. **Invalid webhook**: Send request without valid svix headers — should get 400 response
