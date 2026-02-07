# Feature Specification: Design System & Frontend Standards

**Feature Branch**: `002-design-system`
**Created**: 2026-02-07
**Status**: Draft
**Input**: User description: "F002 Design System & Frontend Standards from docs/features.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent Visual Identity Across All Pages (Priority: P1)

As a user navigating the ReelZero dashboard, I experience a visually cohesive application where colors, spacing, borders, and shadows feel intentional and consistent — buttons look the same across every page, cards have uniform elevation, and the interface feels polished rather than thrown together.

**Why this priority**: Visual consistency is the foundation that every subsequent UI feature (F003–F010) builds upon. Without established tokens and usage rules, each feature will make ad-hoc styling decisions resulting in an inconsistent product.

**Independent Test**: Open any two pages in the application side by side. Verify that primary action buttons use the same color, cards have the same border radius and shadow, headings use the same font weight, and interactive elements have identical hover/focus states.

**Acceptance Scenarios**:

1. **Given** the application has a defined color palette, **When** a developer builds a new page, **Then** they can use semantic color tokens (`primary`, `secondary`, `accent`, `muted`, `destructive`) without inventing new values.
2. **Given** the design system defines a border-radius scale, **When** any card, button, input, or modal is rendered, **Then** it uses the appropriate radius from the established scale.
3. **Given** the design system defines an elevation/shadow scale, **When** cards, modals, or dropdowns are displayed, **Then** each uses the shadow tier appropriate to its context (cards = subtle, modals = prominent, dropdowns = medium).

---

### User Story 2 - Predictable Page Layout and Spacing (Priority: P1)

As a developer building a new page, I follow the "empty box" approach — I start with a full-viewport container, divide it into grid regions (header, sidebar, main content), and then fill each region with components using gap-based spacing rather than arbitrary padding. Every page follows the same structural pattern, making layouts predictable and maintainable.

**Why this priority**: Layout consistency is tied with visual identity as the top priority because every page created in F003–F010 needs to follow a single layout approach. Establishing grid-first, gap-based spacing now prevents CSS fragmentation later.

**Independent Test**: Create a new page using only the documented layout patterns. Verify it aligns with existing pages without writing custom layout CSS. Resize the browser from mobile to desktop and confirm breakpoint behavior matches the documented responsive rules.

**Acceptance Scenarios**:

1. **Given** the design system defines a page-level grid structure, **When** a new dashboard page is created, **Then** the developer uses the established grid template (header row, sidebar + content columns) and gap-based spacing without custom padding for positioning.
2. **Given** responsive breakpoints are documented, **When** the viewport changes from mobile (<640px) through tablet (640–1023px) to desktop (≥1024px), **Then** the layout adjusts according to the documented breakpoint behavior (e.g., sidebar collapses on mobile, content reflows).
3. **Given** the design system defines max content widths, **When** a full-bleed dashboard page and a centered form page are rendered, **Then** each respects its documented max-width constraint.

---

### User Story 3 - Smooth and Consistent Interactions (Priority: P2)

As a user interacting with buttons, links, modals, and navigation items, I see smooth, consistent transitions — hover effects feel uniform, modals appear with an entrance animation, and sidebar toggles slide rather than jump. The application feels responsive and alive rather than static.

**Why this priority**: Transition and motion standards enhance perceived quality. While the app functions without them, inconsistent or missing animations make the product feel unfinished. This is secondary to layout and color because those are structurally blocking.

**Independent Test**: Hover over buttons, open a dropdown, toggle the sidebar, and click navigation links. Verify that all interactive elements use transitions with consistent duration and easing. Confirm that no element changes state without a visible transition (unless instantaneous change is the documented exception).

**Acceptance Scenarios**:

1. **Given** the design system defines three transition speed tiers (fast, normal, slow), **When** a hover effect, dropdown open, or sidebar toggle occurs, **Then** the transition uses the appropriate tier duration and the defined easing curve.
2. **Given** hover/focus interaction patterns are defined, **When** a user hovers over a button or focuses an input, **Then** the visual feedback uses the documented pattern (e.g., subtle background color shift for buttons, ring for inputs).
3. **Given** the design system documents when NOT to animate, **When** a state change is instantaneous (e.g., checkbox toggle, radio selection), **Then** no transition is applied.

---

### User Story 4 - Centralized API Communication (Priority: P2)

As a developer making API calls from the client, I use a single fetch wrapper that automatically handles base URL resolution, auth credential attachment, JSON parsing, and common HTTP error codes. I never write raw `fetch()` calls in components or hooks — all API communication flows through this centralized client, ensuring consistent error handling and credential management.

**Why this priority**: The API wrapper is needed before any feature that makes client-side API calls (F004 onward). It prevents scattered error handling, inconsistent auth token attachment, and duplicated fetch logic. However, it is secondary to visual/layout standards because F003 (Auth) is already implemented with server-side calls only.

**Independent Test**: Write a component that calls a protected API endpoint using the fetch wrapper. Verify that auth credentials are attached automatically, the response is parsed into a typed `{ data, error }` shape, and a 401 response triggers a redirect to sign-in — all without any manual header or error handling code in the component.

**Acceptance Scenarios**:

1. **Given** the API client is configured, **When** a component calls any API endpoint through the wrapper, **Then** the request includes the correct base URL, default headers (`Content-Type: application/json`, `Accept: application/json`), and auth credentials — without the calling code specifying any of these.
2. **Given** a protected API endpoint returns a 401 response, **When** the fetch wrapper receives this response, **Then** it automatically redirects the user to the sign-in page.
3. **Given** an API call succeeds, **When** the wrapper processes the response, **Then** it returns a typed object with shape `{ data: T, error: null }` where `T` matches the expected response type.
4. **Given** an API call fails with a non-401 error (403, 404, 500), **When** the wrapper processes the response, **Then** it returns a typed object with shape `{ data: null, error: { code, message } }` matching the standard error structure.

---

### User Story 5 - Clear Navigation Patterns (Priority: P3)

As a user moving between sections of the dashboard, I always know where I am. The active navigation item is clearly highlighted, mobile navigation follows a consistent slide-in pattern, and any in-page section switching (tabs, pills) uses a uniform styling pattern. Navigation feels predictable across every part of the application.

**Why this priority**: Navigation patterns are already partially implemented in F003 (sidebar with active states). This story formalizes and documents those patterns so future features maintain consistency. It is lowest priority because the core navigation already works.

**Independent Test**: Navigate to each dashboard section and verify the active sidebar item is visually distinct. On mobile, verify the sidebar slides in from the left with an overlay. If any page uses in-page tabs, verify they follow the documented tab/pill styling.

**Acceptance Scenarios**:

1. **Given** navigation active state rules are defined, **When** a user is on the `/dashboard` page, **Then** the "Dashboard" sidebar item is visually highlighted using the documented active state tokens, and all other items use the default/inactive styling.
2. **Given** mobile navigation behavior is documented, **When** a user on a mobile viewport taps the hamburger icon, **Then** the sidebar slides in from the left with a semi-transparent overlay backdrop, matching the documented behavior.
3. **Given** tab/pill navigation styling is defined, **When** a page uses in-page section switching, **Then** the tabs use the documented styling pattern with the active tab clearly distinguished.

---

### Edge Cases

- What happens when a developer uses a color value not in the defined palette? The system relies on semantic tokens; any custom color usage must be justified and documented.
- How does the spacing system handle content that overflows its grid cell? The main content area uses `overflow-y-auto` for vertical scrolling; horizontal overflow is prevented by responsive design.
- What happens when the API client receives a network error (no response from server)? The wrapper returns an error shape with a generic network error code and message rather than throwing an unhandled exception.
- How does the design system handle dark mode? The current token system already defines both light and dark mode variables. The design system documents usage rules but does not introduce a dark mode toggle — the app defaults to light mode for MVP.
- What happens when an API call needs to send form data (file upload) instead of JSON? The wrapper should support an option to override the default `Content-Type` header for multipart requests.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST define a brand color palette extending the existing neutral tokens with at least a primary accent hue that provides visual identity beyond grayscale.
- **FR-002**: The system MUST document color usage rules specifying when to use each semantic token: `primary` (CTAs, primary actions), `secondary` (secondary actions, less prominent UI), `accent` (highlights, active states), `muted` (disabled states, helper text), `destructive` (delete, error states).
- **FR-003**: The system MUST define whether gradients are used in the application, and if so, provide gradient tokens for specific use cases. If gradients are not used, this MUST be documented as a conscious design decision.
- **FR-004**: The system MUST define a shadow/elevation scale with at least three tiers (subtle, medium, prominent) and document which component types use each tier (cards = subtle, dropdowns = medium, modals = prominent).
- **FR-005**: The system MUST document border-radius usage rules specifying which radius value applies to which component type (buttons, cards, inputs, modals, badges).
- **FR-006**: The system MUST define three standard transition duration tiers: fast (~150ms), normal (~200ms), slow (~300ms).
- **FR-007**: The system MUST define standard easing curves for entrances (e.g., ease-out) and exits (e.g., ease-in), and document which easing applies to which type of animation.
- **FR-008**: The system MUST define hover and focus interaction patterns for all interactive elements — buttons (color shift), inputs (ring/border), links (underline or color), and navigation items (background highlight).
- **FR-009**: The system MUST document when transitions should NOT be applied (e.g., checkbox toggles, radio selections, instant data updates) to prevent over-animation.
- **FR-010**: The system MUST establish a page-level layout approach using CSS Grid for page structure (header, sidebar, content regions) and Flexbox for component-level alignment within those regions.
- **FR-011**: The system MUST define spacing rules that prioritize `gap` on grid/flex containers over `padding`/`margin` for positioning, reserving padding for internal component spacing only.
- **FR-012**: The system MUST document responsive breakpoint behavior for mobile (<640px), tablet (640–1023px), and desktop (≥1024px), including how the sidebar, content areas, and navigation adapt at each breakpoint.
- **FR-013**: The system MUST define max content widths for different page types: full-bleed pages (dashboard) and centered/constrained pages (forms, settings).
- **FR-014**: The system MUST provide a client-side API fetch wrapper that adds base URL, default headers, and auth credentials automatically on every request.
- **FR-015**: The API fetch wrapper MUST return responses in a consistent typed shape: `{ data: T, error: null }` for success and `{ data: null, error: { code, message } }` for failure.
- **FR-016**: The API fetch wrapper MUST handle common HTTP errors centrally: 401 responses trigger a redirect to the sign-in page, and other error codes (403, 404, 500) return structured error objects.
- **FR-017**: The API fetch wrapper MUST handle network failures (no response from server) gracefully, returning an error shape rather than throwing an unhandled exception.
- **FR-018**: All client-side API calls MUST go through the centralized fetch wrapper — no raw `fetch()` usage in components or hooks.
- **FR-019**: The system MUST define sidebar navigation active state styling using semantic tokens, specifying which tokens indicate the active item vs. inactive items.
- **FR-020**: The system MUST define mobile navigation behavior: hamburger toggle triggers a sidebar slide-in from the left with a semi-transparent overlay backdrop.
- **FR-021**: The system MUST define a tab/pill navigation pattern for in-page section switching, documenting active and inactive tab styling.
- **FR-022**: The system MUST produce a reference document consolidating all visual tokens, spacing rules, transition standards, layout patterns, API call patterns, and navigation guidelines.

### Key Entities

- **Design Token**: A named value (color, spacing, radius, shadow, duration) that can be referenced throughout the application. Tokens have a name, a value, and a usage context (e.g., `primary` = brand accent, used for CTA buttons).
- **Transition Preset**: A combination of duration + easing + property that defines how a specific type of state change is animated (e.g., "button hover" = 150ms ease-out color change).
- **Layout Template**: A page structure defining regions (header, sidebar, main) with responsive variations at each breakpoint.
- **API Client Configuration**: Settings for the centralized fetch wrapper including base URL, default headers, credential attachment strategy, and error handler mappings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can build a new dashboard page using only documented design tokens and layout patterns, without inventing any custom color values, spacing hacks, or layout workarounds — verified by building at least one new page that passes visual consistency review.
- **SC-002**: All interactive elements (buttons, links, inputs, navigation items) respond to user interaction (hover, focus, click) with visible transitions that complete in under 300ms.
- **SC-003**: The API fetch wrapper handles all standard HTTP responses (200, 400, 401, 403, 404, 500) and network failures, returning typed results — verified by calling endpoints that return each status code and confirming the wrapper returns the expected shape.
- **SC-004**: No raw `fetch()` calls exist in any component or hook file within the codebase — verified by a codebase search.
- **SC-005**: The reference document is complete, covering all five areas: color/visual tokens, transitions/motion, page layout/spacing, API patterns, and navigation patterns.
- **SC-006**: The application renders correctly across three viewport sizes (mobile 375px, tablet 768px, desktop 1440px) with layouts adapting according to the documented breakpoint rules.

## Assumptions

- The existing shadcn/ui neutral theme (oklch tokens) serves as the starting point; the design system extends it with a brand accent rather than replacing it.
- Dark mode is supported at the token level (light/dark variables already exist) but no dark mode toggle is built for MVP — the app defaults to light mode.
- The API fetch wrapper uses browser-native `fetch` — no external HTTP library is introduced.
- Credential attachment for the API wrapper leverages Clerk's session management (cookies/headers managed by the Clerk SDK) rather than manual token storage.
- The "empty box" layout approach is a developer guideline documented in the reference file, not enforced by tooling or linting.
- Breadcrumbs are not used for MVP — flat sidebar navigation is the standard, as the app has a shallow page hierarchy.
- The tab/pill navigation pattern is defined and documented but may not be implemented in a live page until a later feature (F007 or F009) needs it.

## Dependencies

- **F001 (Foundation)**: Provides the project scaffolding, Tailwind CSS v4 + shadcn/ui setup, globals.css with existing oklch tokens, Zustand stores, error handling system (`AppError`, `ERROR_CODES`).
- **Blocks F003 (Auth)**: Auth feature already implemented, but future API calls from dashboard pages will use the fetch wrapper defined here.
- **Blocks F007, F009, F010**: Every feature with UI components depends on these established visual standards and layout patterns.
