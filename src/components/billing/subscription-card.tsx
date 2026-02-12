"use client";

import { CreditCard } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type SubscriptionCardProps = {
  tier: "free" | "basic" | "pro" | "enterprise";
  status: "active" | "past_due" | "trialing" | "canceled";
  creditsRemaining: number;
  creditsTotal: number;
  billingCycleEnd: string | null;
  onManageSubscription: () => void;
};

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  basic: "Basic",
  pro: "Pro",
  enterprise: "Enterprise",
};

const STATUS_BADGES: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  active: { label: "Active", variant: "default" },
  trialing: { label: "Trial", variant: "secondary" },
  past_due: { label: "Payment Due", variant: "destructive" },
  canceled: { label: "Canceled", variant: "outline" },
};

export function SubscriptionCard({
  tier,
  status,
  creditsRemaining,
  creditsTotal,
  billingCycleEnd,
  onManageSubscription,
}: SubscriptionCardProps) {
  const usedPercentage =
    creditsTotal > 0 ? ((creditsTotal - creditsRemaining) / creditsTotal) * 100 : 0;

  const statusBadge = STATUS_BADGES[status] ?? STATUS_BADGES.active;
  const tierLabel = TIER_LABELS[tier] ?? tier;
  const isPaid = tier !== "free";

  const formattedCycleEnd = billingCycleEnd
    ? new Date(billingCycleEnd).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Current Plan</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{tierLabel}</Badge>
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Credit usage */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-muted-foreground">Credits this month</span>
            <span className="font-medium">
              {creditsRemaining} / {creditsTotal} remaining
            </span>
          </div>
          <Progress value={usedPercentage} className="h-2" />
        </div>

        {/* Billing cycle */}
        {formattedCycleEnd && (
          <p className="text-sm text-muted-foreground">
            Renews on{" "}
            <span className="text-foreground font-medium">{formattedCycleEnd}</span>
          </p>
        )}

        {/* Manage subscription (paid plans only) */}
        {isPaid && (
          <Button
            variant="outline"
            size="sm"
            onClick={onManageSubscription}
            className="flex items-center gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Manage Subscription
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
