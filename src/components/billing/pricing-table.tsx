"use client";

import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PRICING_TIERS } from "@/lib/constants/pricing";

type PricingTableProps = {
  currentTier: "free" | "basic" | "pro" | "enterprise";
  onSelectTier: (tier: "basic" | "pro") => void;
  isLoading: boolean;
};

const TIER_FEATURES: Record<string, string[]> = {
  free: ["3 credits/month", "720p video", "Basic voices", "Watermark"],
  basic: ["30 credits/month", "1080p video", "Basic voices", "No watermark"],
  pro: ["100 credits/month", "1080p video", "All voices", "Priority support"],
  enterprise: ["999 credits/month", "1080p video", "All voices", "Dedicated support"],
};

const TIER_ORDER: Record<string, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  enterprise: 3,
};

export function PricingTable({ currentTier, onSelectTier, isLoading }: PricingTableProps) {
  const currentTierOrder = TIER_ORDER[currentTier] ?? 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {PRICING_TIERS.map((tier) => {
        const isCurrent = tier.id === currentTier;
        const tierOrder = TIER_ORDER[tier.id] ?? 0;
        const isUpgrade = tierOrder > currentTierOrder;
        const isPaid = tier.id === "basic" || tier.id === "pro";
        const features = TIER_FEATURES[tier.id] ?? [];

        return (
          <Card
            key={tier.id}
            className={isCurrent ? "ring-2 ring-primary" : undefined}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{tier.name}</CardTitle>
                {isCurrent && (
                  <Badge variant="secondary" className="text-xs">
                    Current Plan
                  </Badge>
                )}
              </div>
              <div className="mt-1">
                {tier.monthlyPrice === 0 && tier.id === "free" ? (
                  <span className="text-2xl font-bold">Free</span>
                ) : tier.monthlyPrice === 0 && tier.id === "enterprise" ? (
                  <span className="text-2xl font-bold">Custom</span>
                ) : (
                  <>
                    <span className="text-2xl font-bold">
                      ${(tier.monthlyPrice / 100).toFixed(0)}
                    </span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </>
                )}
              </div>
            </CardHeader>

            <CardContent>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              {tier.id === "enterprise" ? (
                <Button variant="outline" className="w-full" asChild>
                  <a href="mailto:sales@reelzero.ai">Contact Sales</a>
                </Button>
              ) : isCurrent ? (
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              ) : isPaid && isUpgrade ? (
                <Button
                  className="w-full"
                  onClick={() => onSelectTier(tier.id as "basic" | "pro")}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading…" : `Upgrade to ${tier.name}`}
                </Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  {tierOrder < currentTierOrder ? "Downgrade via Portal" : tier.name}
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
