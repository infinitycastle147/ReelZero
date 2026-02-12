"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

import { PricingTable } from "@/components/billing/pricing-table";
import { SubscriptionCard } from "@/components/billing/subscription-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type SubscriptionData = {
  id: string;
  tier: "free" | "basic" | "pro" | "enterprise";
  status: "active" | "past_due" | "trialing" | "canceled";
  creditsTotal: number;
  creditsUsed: number;
  creditsRemaining: number;
  billingCycleStart: string | null;
  billingCycleEnd: string | null;
  hasStripeSubscription: boolean;
};

type UsageData = {
  videosCreatedThisMonth: number;
  storageUsedBytes: number;
};

type BillingData = {
  subscription: SubscriptionData;
  usage: UsageData;
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function BillingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Show cancellation message if redirected from Stripe checkout cancel
  useEffect(() => {
    if (searchParams.get("canceled") === "true") {
      toast.info("Checkout was canceled — your plan was not changed.");
      const url = new URL(window.location.href);
      url.searchParams.delete("canceled");
      router.replace(url.pathname + (url.search ? url.search : ""), { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/subscription");
        if (!response.ok) throw new Error("Failed to load subscription data");
        const json = (await response.json()) as { data: BillingData };
        setData(json.data);
      } catch {
        toast.error("Failed to load billing information");
      } finally {
        setIsLoading(false);
      }
    }
    void fetchData();
  }, []);

  async function handleSelectTier(tier: "basic" | "pro") {
    setIsActionLoading(true);
    try {
      const response = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) {
        const json = (await response.json()) as { error: { message: string } };
        throw new Error(json.error?.message ?? "Failed to start checkout");
      }

      const json = (await response.json()) as { data: { checkoutUrl: string } };
      router.push(json.data.checkoutUrl);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to start checkout — please try again"
      );
      setIsActionLoading(false);
    }
  }

  async function handleManageSubscription() {
    setIsActionLoading(true);
    try {
      const response = await fetch("/api/subscription/portal", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to open billing portal");
      }

      const json = (await response.json()) as { data: { portalUrl: string } };
      router.push(json.data.portalUrl);
    } catch {
      toast.error("Failed to open billing portal");
      setIsActionLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="mt-2 text-muted-foreground">Manage your subscription and credits.</p>
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="mt-2 text-muted-foreground">Manage your subscription and credits.</p>
        </div>
        <p className="text-muted-foreground">Unable to load billing information.</p>
      </div>
    );
  }

  const { subscription, usage } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="mt-2 text-muted-foreground">Manage your subscription and credits.</p>
      </div>

      {/* Current subscription */}
      <SubscriptionCard
        tier={subscription.tier}
        status={subscription.status}
        creditsRemaining={subscription.creditsRemaining}
        creditsTotal={subscription.creditsTotal}
        billingCycleEnd={subscription.billingCycleEnd}
        onManageSubscription={handleManageSubscription}
      />

      {/* Usage statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Credits Used</p>
              <p className="text-2xl font-bold">
                {subscription.creditsUsed}
                <span className="text-base font-normal text-muted-foreground">
                  /{subscription.creditsTotal}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Videos Created</p>
              <p className="text-2xl font-bold">{usage.videosCreatedThisMonth}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Storage Used</p>
              <p className="text-2xl font-bold">{formatBytes(usage.storageUsedBytes)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing table */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Plans</h2>
        <PricingTable
          currentTier={subscription.tier}
          onSelectTier={handleSelectTier}
          isLoading={isActionLoading}
        />
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Billing</h1>
            <p className="mt-2 text-muted-foreground">Manage your subscription and credits.</p>
          </div>
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <BillingPageContent />
    </Suspense>
  );
}
