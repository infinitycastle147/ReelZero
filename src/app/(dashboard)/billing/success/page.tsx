"use client";

import { CheckCircle, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type VerifyStatus = "pending" | "complete" | "failed" | "timeout";

type VerifyResult = {
  status: "complete" | "pending" | "failed";
  tier: "basic" | "pro" | null;
  subscription?: {
    creditsTotal: number;
    billingCycleEnd: string;
  };
};

const TIER_LABELS: Record<string, string> = {
  basic: "Basic",
  pro: "Pro",
};

const MAX_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 2000;

function BillingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState<VerifyStatus>("pending");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const attemptRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!sessionId) {
      router.replace("/billing");
      return;
    }

    async function poll() {
      attemptRef.current += 1;

      try {
        const response = await fetch(
          `/api/subscription/checkout/verify?session_id=${encodeURIComponent(sessionId!)}`
        );

        if (!response.ok) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setStatus("failed");
          return;
        }

        const json = (await response.json()) as { data: VerifyResult };
        const data = json.data;

        if (data.status === "complete") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setResult(data);
          setStatus("complete");
          return;
        }
      } catch {
        // Network error — keep polling
      }

      if (attemptRef.current >= MAX_ATTEMPTS) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setStatus("timeout");
        // Redirect to billing page to see current (possibly updated) state
        setTimeout(() => router.replace("/billing"), 2000);
      }
    }

    // Start polling immediately
    void poll();
    intervalRef.current = setInterval(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sessionId, router]);

  if (status === "pending") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
            <CardTitle>Upgrading your plan…</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground space-y-2">
            <p>Your payment was received. We&apos;re activating your new plan.</p>
            <p className="text-sm">This usually takes a few seconds.</p>
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "timeout") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Almost there…</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            <p>Your plan is being activated. Redirecting to billing…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Something went wrong</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              We couldn&apos;t verify your checkout session. Please check your billing page.
            </p>
            <Button onClick={() => router.push("/billing")}>Go to Billing</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // status === "complete"
  const tierLabel = result?.tier ? TIER_LABELS[result.tier] ?? result.tier : "paid";
  const creditsTotal = result?.subscription?.creditsTotal;
  const billingCycleEnd = result?.subscription?.billingCycleEnd
    ? new Date(result.subscription.billingCycleEnd).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle>You&apos;re on {tierLabel}!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {creditsTotal !== undefined && (
            <p className="text-muted-foreground">
              You now have{" "}
              <span className="font-semibold text-foreground">{creditsTotal} credits</span> to use
              this month.
            </p>
          )}
          {billingCycleEnd && (
            <p className="text-sm text-muted-foreground">Renews on {billingCycleEnd}</p>
          )}
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
            <Button variant="outline" onClick={() => router.push("/billing")}>
              View Billing
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Skeleton className="h-64 w-full max-w-md" />
        </div>
      }
    >
      <BillingSuccessContent />
    </Suspense>
  );
}
