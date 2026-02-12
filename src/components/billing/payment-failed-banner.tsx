"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type PaymentFailedBannerProps = {
  onUpdatePayment: () => void;
};

const SESSION_STORAGE_KEY = "payment_failed_banner_dismissed";

export function PaymentFailedBanner({ onUpdatePayment }: PaymentFailedBannerProps) {
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(SESSION_STORAGE_KEY) === "true";
  });

  if (isDismissed) return null;

  function handleDismiss() {
    sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
    setIsDismissed(true);
  }

  return (
    <div className="flex items-center justify-between gap-4 bg-amber-50 border-b border-amber-200 px-4 py-3 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-200">
      <div className="flex items-center gap-2 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          Payment failed — update your payment method to avoid service interruption.
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="border-amber-400 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
          onClick={onUpdatePayment}
        >
          Update Payment
        </Button>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={handleDismiss}
          className="rounded p-1 hover:bg-amber-100 dark:hover:bg-amber-900/40"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
