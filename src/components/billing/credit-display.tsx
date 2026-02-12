"use client";

import { AlertTriangle, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type CreditDisplayProps = {
  creditsRemaining: number;
  creditsTotal: number;
  isLoading: boolean;
  status: "active" | "past_due" | "trialing" | "canceled";
};

export function CreditDisplay({
  creditsRemaining,
  creditsTotal,
  isLoading,
  status,
}: CreditDisplayProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 rounded-md border bg-muted px-2.5 py-1 text-sm animate-pulse">
        <Zap className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">--/--</span>
      </div>
    );
  }

  const isOutOfCredits = creditsRemaining === 0;
  const isPastDue = status === "past_due";

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm ${
          isOutOfCredits
            ? "border-destructive/50 bg-destructive/10 text-destructive"
            : "border-border bg-muted"
        }`}
      >
        <Zap
          className={`h-3.5 w-3.5 ${isOutOfCredits ? "text-destructive" : "text-amber-500"}`}
        />
        <span className={isOutOfCredits ? "text-destructive font-medium" : ""}>
          {creditsRemaining}/{creditsTotal}
        </span>
      </div>

      {isPastDue && (
        <Badge variant="destructive" className="flex items-center gap-1 text-xs">
          <AlertTriangle className="h-3 w-3" />
          Payment Due
        </Badge>
      )}
    </div>
  );
}
