"use client";

import { Zap } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type LandingHeaderProps = {
  isSignedIn: boolean;
};

export function LandingHeader({ isSignedIn }: LandingHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xl font-bold tracking-tight text-foreground"
        >
          <Zap className="h-5 w-5 text-primary" />
          ReelZero
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <a
            href="#features"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#pricing"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            FAQ
          </a>
        </nav>

        <Button asChild>
          <Link href={isSignedIn ? "/dashboard" : "/sign-up"}>
            {isSignedIn ? "Go to Dashboard" : "Get Started"}
          </Link>
        </Button>
      </div>
    </header>
  );
}
