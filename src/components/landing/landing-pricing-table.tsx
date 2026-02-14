import { Check } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PRICING_TIERS } from "@/lib/constants/pricing";

const LANDING_TIER_FEATURES: Record<string, string[]> = {
  free: [
    "3 videos/month",
    "720p resolution",
    "AI script + images + voice",
    "Watermarked",
    "Basic voices (5)",
  ],
  basic: [
    "30 videos/month",
    "Full HD 1080p",
    "No watermark",
    "Basic voices (5)",
    "Priority support",
  ],
  pro: [
    "100 videos/month",
    "Full HD 1080p",
    "No watermark",
    "All 50+ voices",
    "Priority processing",
    "Custom branding",
    "Priority support",
  ],
  enterprise: [
    "Unlimited videos",
    "Full HD 1080p",
    "Custom branding + white-label",
    "All voices + custom voices",
    "Dedicated account manager",
    "SLA guarantee (99.9% uptime)",
    "SSO (SAML)",
  ],
};

export function LandingPricingTable() {
  return (
    <section id="pricing" className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Start free. Upgrade when you need more.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {PRICING_TIERS.map((tier) => {
            const features = LANDING_TIER_FEATURES[tier.id] ?? [];
            const isPro = tier.id === "pro";
            const isEnterprise = tier.id === "enterprise";

            return (
              <Card
                key={tier.id}
                className={`relative flex flex-col border-border/50 bg-card/50 backdrop-blur-sm ${
                  isPro ? "ring-2 ring-primary" : ""
                }`}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-foreground">
                    {tier.name}
                  </CardTitle>
                  <div className="mt-2">
                    {tier.id === "free" && (
                      <span className="text-3xl font-extrabold text-foreground">Free</span>
                    )}
                    {isEnterprise && (
                      <span className="text-3xl font-extrabold text-foreground">Custom</span>
                    )}
                    {tier.id !== "free" && !isEnterprise && (
                      <span className="text-foreground">
                        <span className="text-3xl font-extrabold">
                          ${(tier.monthlyPrice / 100).toFixed(0)}
                        </span>
                        <span className="ml-1 text-sm text-muted-foreground">/month</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tier.id === "enterprise"
                      ? "Starting $299/month"
                      : `${tier.creditsPerMonth} videos/month`}
                  </p>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-2">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-4">
                  {isEnterprise ? (
                    <Button variant="outline" className="w-full" asChild>
                      <a href="mailto:sales@reelzero.ai">Contact Sales</a>
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${isPro ? "" : ""}`}
                      variant={isPro ? "default" : "outline"}
                      asChild
                    >
                      <Link href="/sign-up">Get Started</Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
