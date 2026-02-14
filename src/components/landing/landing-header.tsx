"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

type LandingHeaderProps = {
  isSignedIn: boolean;
};

export function LandingHeader({ isSignedIn }: LandingHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold tracking-tight text-foreground">
          ReelZero
        </Link>
        <Button asChild>
          <Link href={isSignedIn ? "/dashboard" : "/sign-up"}>
            {isSignedIn ? "Go to Dashboard" : "Get Started"}
          </Link>
        </Button>
      </div>
    </header>
  );
}
