# Feature Specification: Landing Page

**Feature Branch**: `010-landing-page`
**Created**: 2026-02-14
**Status**: Draft
**Input**: User description: "F010 from docs/FEATURES.md — Landing page: hero, features, pricing, FAQ, responsive design, SEO meta tags, sign-up CTA"

## Clarifications

### Session 2026-02-14

- Q: Does the landing page include a persistent navigation header, and what does it contain? → A: Minimal fixed header — logo and "Get Started" button only (no section anchor links).
- Q: Should the landing page emit analytics/conversion events for measuring marketing performance? → A: No analytics — out of scope for this feature.
- Q: Should the landing page conform to a specific accessibility standard? → A: Best-effort only — no formal compliance target required for this feature.
- Q: What type of visual appears in the hero section alongside the headline? → A: Split-composition hero visual — wizard UI left, phone mockup with AI video right, dark background with electric blue/violet accents. All page visuals are AI-generated (see Visual Assets section); placeholders used during development.
- Q: What should happen if the hero product visual asset isn't ready when the page is built? → A: Use placeholder images during development; swap for real AI-generated assets before launch.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitor Learns About the Product (Priority: P1)

A potential user lands on the homepage for the first time. They want to understand what ReelZero does and whether it's worth signing up for. They read the hero headline, scan the features section, and understand the core value proposition without having to click anywhere else.

**Why this priority**: This is the primary purpose of the landing page — converting awareness into sign-up intent. Without this story, the page has no reason to exist.

**Independent Test**: Can be fully tested by opening the landing page as an unauthenticated visitor and verifying all sections render correctly with meaningful content that explains the product.

**Acceptance Scenarios**:

1. **Given** a visitor arrives at the root URL while unauthenticated, **When** the page loads, **Then** a hero section is visible above the fold with a headline, sub-headline, and a prominent "Get Started" CTA button.
2. **Given** a visitor scrolls down, **When** they reach the features section, **Then** at least 3 key selling points are presented (speed, quality, ease of use) each with a short description.
3. **Given** a visitor scrolls further, **When** they reach the "How It Works" section, **Then** a 3-step visual process is shown explaining how videos are created.
4. **Given** a visitor is on a mobile device, **When** the page loads, **Then** all sections are fully readable and usable without horizontal scrolling.

---

### User Story 2 - Visitor Evaluates Pricing (Priority: P2)

A visitor who is interested in the product wants to understand the cost before signing up. They scroll to the pricing section to compare tiers, understand what each plan includes, and decide whether to proceed.

**Why this priority**: Pricing is the primary conversion decision point. Visitors who can't find clear pricing will leave. This story directly drives sign-up conversion.

**Independent Test**: Can be tested by navigating to the pricing section on the landing page and verifying all 4 tiers are displayed with accurate feature lists and CTAs.

**Acceptance Scenarios**:

1. **Given** a visitor scrolls to the pricing section, **When** they view it, **Then** all 4 tiers (Free, Basic, Pro, Enterprise) are shown with their monthly price, video credits, and key included features.
2. **Given** a visitor views the pricing section, **When** they look at each tier card, **Then** each card has a visible "Get Started" or "Contact Sales" CTA button.
3. **Given** a visitor on the Free tier card clicks "Get Started", **When** redirected, **Then** they are taken to the sign-up page.
4. **Given** a visitor views pricing, **When** they look at the Enterprise card, **Then** it shows "Custom pricing – Contact Sales" rather than a fixed price.

---

### User Story 3 - Visitor Reads FAQ and Converts (Priority: P3)

A visitor who has questions or hesitations about the product finds answers in the FAQ section, which resolves their concerns and nudges them toward signing up.

**Why this priority**: FAQ removes the final objections for borderline visitors. Important for conversion rate but not the primary driver.

**Independent Test**: Can be tested by verifying the FAQ section exists with at least 4 questions and answers, all statically readable without interaction required.

**Acceptance Scenarios**:

1. **Given** a visitor scrolls to the FAQ section, **When** they view it, **Then** at least 4 questions and answers are present covering: what ReelZero is, how credits work, video quality/format, and what happens after the free tier runs out.
2. **Given** a visitor reads the FAQ, **When** they reach the bottom of the page, **Then** a footer is visible with links to relevant pages (sign-in, pricing, terms, privacy).
3. **Given** an authenticated user visits the landing page, **When** the page loads, **Then** the primary CTA changes to "Go to Dashboard" and links to the dashboard rather than the sign-up page.

---

### Edge Cases

- What happens when a visitor arrives via a direct link to an anchor section (e.g., `/?#pricing`)? The page should scroll to the correct section.
- How does the page render with JavaScript disabled? Core content (hero, pricing tiers, FAQ text) must be readable as it is server-rendered.
- What if an authenticated user accidentally navigates to the landing page? They should see a dashboard CTA, not be force-redirected away.
- What if the pricing component from F006 is unavailable or not yet built? The landing page should render with its own standalone pricing content.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The page MUST render fully for unauthenticated visitors at the root URL (`/`).
- **FR-013**: The page MUST include a minimal fixed header containing the brand logo and a single "Get Started" CTA button — no section navigation links in the header. When an authenticated user is detected, the header CTA MUST display "Go to Dashboard" instead.
- **FR-002**: The hero section MUST display a product headline, sub-headline, a primary CTA button that links to the sign-up page, and a split-composition visual: the wizard UI on the left and a phone mockup with an AI-generated video playing on the right (see Visual Assets section for asset specifications).
- **FR-003**: The features section MUST display at least 3 key value propositions: generation speed (under 90 seconds), full HD video quality, and no editing skills required. Each card uses an icon from the installed icon library (no custom image assets needed).
- **FR-004**: The "How It Works" section MUST present a 3-step process: (1) Enter a prompt, (2) Customize your video, (3) Download and share.
- **FR-005**: The pricing section MUST display all 4 subscription tiers — Free, Basic ($29/month), Pro ($79/month), Enterprise (custom) — each with credits-per-month, key feature differences, and a CTA button.
- **FR-006**: The FAQ section MUST include at least 4 questions and answers addressing: what the product does, how credits work, what video format is produced, and what happens when free credits run out.
- **FR-007**: The footer MUST contain links to: Sign In, Pricing (anchor), Privacy Policy, Terms of Service, and a copyright/brand notice.
- **FR-008**: Every "Get Started" CTA button MUST navigate to the sign-up page.
- **FR-009**: The page MUST include SEO meta tags: `<title>`, `<meta name="description">`, Open Graph tags (`og:title`, `og:description`, `og:image`), and a canonical URL tag.
- **FR-010**: The page MUST be fully responsive at mobile (≥320px), tablet (≥768px), and desktop (≥1024px) widths — no horizontal scrolling at any breakpoint.
- **FR-011**: When an authenticated user visits the landing page, the primary CTA MUST display "Go to Dashboard" and link to the dashboard.
- **FR-012**: Each major section MUST be reachable via anchor link: `#features`, `#how-it-works`, `#pricing`, `#faq`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can identify what ReelZero does within 5 seconds of the page loading — verified by user testing where >80% correctly describe the product after 5 seconds.
- **SC-002**: All 4 pricing tiers are visible with their credit allowances and prices accurately matching the PRD (0 discrepancies).
- **SC-003**: All above-fold content is visible and readable to the visitor within 2 seconds on a standard broadband connection.
- **SC-004**: The page renders correctly at all tested breakpoints (320px, 768px, 1024px, 1440px) — 0 horizontal overflow or layout-breaking issues.
- **SC-005**: All CTA buttons navigate to the correct destination — 0 broken links across all sections.
- **SC-006**: All required SEO meta tags are present and non-empty — passes an automated SEO audit with 0 missing mandatory fields.
- **SC-007**: Core page content (hero, features, pricing, FAQ) is readable without JavaScript — verified by disabling JS in the browser.

---

## Assumptions

- Pricing data (tier names, prices, credit amounts, feature lists) is taken from PRD Section 6.1 and treated as fixed for this feature.
- The `pricing-table.tsx` component from F006 may be reused if available; if not, an equivalent standalone component is built for the landing page.
- The landing page is fully public — no authentication is required to view it.
- Anchor deep-linking uses native browser scroll-to-anchor behaviour with no custom scroll library.
- "Terms of Service" and "Privacy Policy" footer links can point to placeholder pages — their content is out of scope for this feature.
- The Open Graph image (`og:image`) is a static branded asset, not dynamically generated.
- The Enterprise tier CTA links to a mailto address or placeholder contact page — the exact sales flow is out of scope for this feature.
- Analytics and conversion tracking are out of scope for this feature; no third-party analytics scripts or event instrumentation are required.
- No formal accessibility compliance target (e.g., WCAG) is required; best-effort readability and usability is sufficient for this feature.
- All visual assets (hero composition, feature icons, how-it-works step illustrations) are AI-generated and provided as static files before implementation. Placeholder images unblock development; real assets are swapped in before launch.
- The page uses a dark-mode aesthetic with a near-black background (#0a0a0f) and electric blue/violet accent palette to match the AI/tech brand identity.

---

## Visual Assets

> All assets below are AI-generated. Use the prompts below to generate each image and send back for integration. Recommended tool: Midjourney, DALL·E 3, or Stable Diffusion XL. Generate at 2x the displayed size for retina quality.
>
> **Where to place generated files**: `public/images/landing/` — filenames listed per asset below. Convert to WebP before placing if possible; PNG/JPG also accepted.

---

### ASSET-001 — Hero Split Composition (Hero Section)

**File**: `public/images/landing/hero.png`
**Dimensions**: 1200 × 800px (displayed at 600 × 400px on desktop, full-width stacked on mobile)

**AI Generation Prompt**:

> A modern SaaS web application UI split-screen hero image on a deep dark background (#0a0a0f). Left half: a clean dark-themed web app interface showing a text prompt input field with glowing blue border, below it three stacked scene cards with AI-generated thumbnails and script text, subtle glassmorphism card styling with soft purple/blue inner glow. Right half: a sleek iPhone 15 Pro mockup in space black, held at a slight angle, screen showing a vertical 9:16 short-form video playing — vivid AI-generated landscape scene with animated caption text overlaid at the bottom in bold white rounded font. The phone has a soft electric blue halo/glow around it radiating outward. Background is near-black with subtle deep violet gradient radials in the corners. Overall mood: premium, futuristic, cutting-edge AI tech. Ultra-detailed, 8K, photorealistic UI elements.

---

### ASSET-002 — How It Works: Step 1 — Enter a Prompt (How It Works Section)

**File**: `public/images/landing/step-1.png`
**Dimensions**: 480 × 320px

**AI Generation Prompt**:

> A dark-themed web UI closeup illustration showing a single text input field with a blinking cursor, glowing soft blue border, placeholder text "Describe your video topic...", and a gradient "Generate" button below it (blue to violet). Glassmorphism card background, floating subtle grid/dot pattern background in deep dark purple. Ultra-clean, modern, SaaS product screenshot style. No chrome or browser chrome visible.

---

### ASSET-003 — How It Works: Step 2 — Customize Your Video (How It Works Section)

**File**: `public/images/landing/step-2.png`
**Dimensions**: 480 × 320px

**AI Generation Prompt**:

> A dark-themed web UI illustration showing a multi-step wizard interface. Three scene editor cards stacked vertically, each with a small AI-generated image thumbnail on the left, editable narration text field on the right, and an image swap icon. Above the cards, small pill selectors for "Voice", "Theme", and "Captions" with blue accent highlight on the selected pill. Glassmorphism styling, deep dark background, soft blue inner glows on active elements. Clean SaaS product UI style.

---

### ASSET-004 — How It Works: Step 3 — Download & Share (How It Works Section)

**File**: `public/images/landing/step-3.png`
**Dimensions**: 480 × 320px

**AI Generation Prompt**:

> A dark-themed web UI illustration showing a completed video in a vertical 9:16 phone mockup (iPhone-style, space black) with a bold AI-generated video frame visible on screen. Below the phone, two prominent buttons: a white "Download MP4" button and a gradient blue-to-violet "Share" button. A subtle green "Ready!" badge in the top corner. Background is deep dark with a soft radial glow behind the phone. Premium, modern SaaS style.

---

### ASSET-005 — OG/Social Share Image (SEO meta `og:image`)

**File**: `public/images/landing/og-image.png`
**Dimensions**: 1200 × 630px (standard Open Graph size)

**AI Generation Prompt**:

> A bold marketing banner image for a SaaS AI video creation tool called "ReelZero". Dark background (#0a0a0f) with a large bold headline "Turn Any Idea Into a 60-Second Video" in white, subtitle "AI-powered. No editing skills needed." in light grey below. On the right side, a vertical phone mockup showing a vivid AI video frame. Electric blue and violet gradient accent behind the phone as a glow. Bottom left: "ReelZero" brand wordmark in clean bold white sans-serif. Professional product marketing style, high contrast, suitable for social media link preview cards.

---

> **Note for implementation**: Use placeholder grey boxes (`bg-muted` in the design system) at the correct aspect ratios during development. Replace with the generated assets above before final review. All assets should be served as optimized WebP files.
