"use client";

import dynamic from "next/dynamic";

// LandingFaq uses Radix Accordion which generates internal IDs via React.useId().
// This client-wrapper uses ssr:false to prevent server/client ID mismatch (hydration error).
// ssr:false is only permitted inside a "use client" module.
export const LandingFaqDynamic = dynamic(
  () =>
    import("@/components/landing/landing-faq").then((m) => ({
      default: m.LandingFaq,
    })),
  { ssr: false },
);
