import { Video, Wand2, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

type FeatureCard = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const FEATURES: FeatureCard[] = [
  {
    icon: Zap,
    title: "Under 90 Seconds",
    description:
      "From prompt to downloadable MP4 in under 90 seconds. No waiting, no queue, no setup required.",
  },
  {
    icon: Video,
    title: "Full HD 1080p",
    description:
      "Every video rendered at 1080×1920 — crisp, vertical, and ready for Reels, Shorts, and TikTok.",
  },
  {
    icon: Wand2,
    title: "Zero Skills Required",
    description:
      "Type what you want. Our AI writes the script, generates the visuals, and records the voiceover.",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Why ReelZero?
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Professional short-form video creation, without the complexity.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-colors hover:border-primary/30 hover:bg-card/80"
              >
                {/* Large background step number */}
                <div
                  className="pointer-events-none absolute right-3 top-1 select-none font-heading text-8xl font-extrabold leading-none text-foreground/[0.04]"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, "0")}
                </div>

                <CardHeader className="pb-3">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-foreground">
                    {feature.title}
                  </h3>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
