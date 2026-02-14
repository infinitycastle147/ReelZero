import Image from "next/image";

type HowItWorksStep = {
  stepNumber: number;
  imageSrc: string;
  imageAlt: string;
  title: string;
  description: string;
};

const STEPS: HowItWorksStep[] = [
  {
    stepNumber: 1,
    imageSrc: "/images/landing/step-1.png",
    imageAlt: "Step 1 — text prompt input field",
    title: "Enter a Prompt",
    description:
      "Describe your video topic in plain English. 50–500 characters is all you need.",
  },
  {
    stepNumber: 2,
    imageSrc: "/images/landing/step-2.png",
    imageAlt: "Step 2 — video customization wizard",
    title: "Customize Your Video",
    description:
      "Edit the AI-generated script, pick a voice, choose a visual theme and caption style.",
  },
  {
    stepNumber: 3,
    imageSrc: "/images/landing/step-3.png",
    imageAlt: "Step 3 — completed video ready to download",
    title: "Download & Share",
    description:
      "Your 60-second MP4 is ready in under 90 seconds. Post it anywhere — Reels, Shorts, TikTok.",
  },
];

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Three steps from idea to shareable video.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.stepNumber} className="flex flex-col gap-4">
              {/* Step number badge */}
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {step.stepNumber}
              </div>

              {/* Step image */}
              <div className="relative overflow-hidden rounded-xl border border-border/50">
                <Image
                  src={step.imageSrc}
                  alt={step.imageAlt}
                  width={480}
                  height={320}
                  className="w-full object-cover"
                />
              </div>

              {/* Step copy */}
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
