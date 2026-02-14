import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { LandingFaqDynamic } from "@/components/landing/landing-faq-dynamic";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingPricingTable } from "@/components/landing/landing-pricing-table";

export const metadata: Metadata = {
  title: "ReelZero — AI Video Creator for Reels & Shorts",
  description:
    "Generate professional 60-second vertical videos from a text prompt in under 90 seconds. No editing skills required.",
  openGraph: {
    title: "ReelZero — AI Video Creator",
    description:
      "Turn any idea into a 60-second video. AI-powered, no editing skills needed.",
    images: ["/images/landing/og-image.png"],
    type: "website",
    url: "https://reelzero.ai",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReelZero — AI Video Creator",
    description: "Turn any idea into a 60-second video.",
    images: ["/images/landing/og-image.png"],
  },
  alternates: {
    canonical: "https://reelzero.ai",
  },
};

export default async function LandingPage() {
  const { userId } = await auth();
  const isSignedIn = !!userId;

  return (
    <div className="landing min-h-screen bg-background text-foreground">
      <LandingHeader isSignedIn={isSignedIn} />
      <main>
        <LandingHero isSignedIn={isSignedIn} />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingPricingTable />
        <LandingFaqDynamic />
      </main>
      <LandingFooter />
    </div>
  );
}
