import Image from "next/image";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

type LandingHeroProps = {
  isSignedIn: boolean;
};

export function LandingHero({ isSignedIn }: LandingHeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 sm:pb-24 sm:pt-36 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left — copy */}
          <div className="flex flex-col gap-6">
            {/* Badge */}
            <div className="flex">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" />
                AI-Powered · Free to start
              </span>
            </div>

            <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Turn Any Idea Into a{" "}
              <span
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, oklch(0.83 0.15 75), oklch(0.72 0.20 45))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                60-Second Video
              </span>
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              AI-powered short-form video creation. No editing skills needed.
              Just type a prompt and get a professional Reel, Short, or TikTok
              ready to post.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href={isSignedIn ? "/dashboard" : "/sign-up"}>
                  {isSignedIn ? "Go to Dashboard" : "Get Started Free"}
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#how-it-works">See How It Works</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Free tier includes 3 videos/month. No credit card required.
            </p>
          </div>

          {/* Right — hero image */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-primary/10 blur-3xl" />
            <Image
              src="/images/landing/hero.png"
              alt="ReelZero product — wizard UI and phone video preview"
              width={1200}
              height={800}
              priority
              className="relative w-full rounded-2xl object-cover shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
