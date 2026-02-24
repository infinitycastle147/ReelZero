"use client";

import { UserButton } from "@clerk/nextjs";
import { Menu, Zap } from "lucide-react";
import { useEffect } from "react";

import { CreditDisplay } from "@/components/billing/credit-display";
import { useCredits } from "@/hooks/useCredits";
import { useUIStore } from "@/store/ui-store";
import { useVideoStore } from "@/store/video-store";

export function DashboardHeader() {
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const credits = useCredits();
  const setOnGenerationComplete = useVideoStore((state) => state.setOnGenerationComplete);

  // Register credits refresh as the post-generation callback
  useEffect(() => {
    setOnGenerationComplete(credits.refresh);
    return () => setOnGenerationComplete(null);
  }, [credits.refresh, setOnGenerationComplete]);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="flex items-center gap-1.5 font-heading text-lg font-bold tracking-tight">
          <Zap className="h-4 w-4 text-primary" />
          ReelZero
        </span>
      </div>
      <div className="flex items-center gap-3">
        <CreditDisplay
          creditsRemaining={credits.creditsRemaining}
          creditsTotal={credits.creditsTotal}
          isLoading={credits.isLoading}
          status={credits.status}
        />
        <UserButton
          afterSignOutUrl="/sign-in"
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
            },
          }}
        />
      </div>
    </header>
  );
}
