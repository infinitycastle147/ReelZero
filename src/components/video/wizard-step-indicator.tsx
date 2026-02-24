"use client";

import { Check, ImageIcon, Layers, Settings2, Wand2 } from "lucide-react";

const STEPS = [
  { number: 1, label: "Idea", icon: Wand2 },
  { number: 2, label: "Script", icon: Layers },
  { number: 3, label: "Images", icon: ImageIcon },
  { number: 4, label: "Settings", icon: Settings2 },
] as const;

type WizardStepIndicatorProps = {
  currentStep: number;
};

export function WizardStepIndicator({ currentStep }: WizardStepIndicatorProps) {
  // Clamp to the 4 visible planning steps (steps 5+6 are progress/player)
  const displayStep = Math.min(currentStep, 4);

  return (
    <nav aria-label="Wizard progress" className="w-full">
      <ol className="relative flex items-start justify-between">
        {/* Background connector track */}
        <div
          aria-hidden="true"
          className="absolute top-4 left-0 right-0 h-px bg-border mx-[2rem]"
          style={{ zIndex: 0 }}
        />
        {/* Filled progress track */}
        <div
          aria-hidden="true"
          className="absolute top-4 left-0 h-px bg-primary transition-all duration-500 ease-out mx-[2rem]"
          style={{
            zIndex: 0,
            width: `calc(${((Math.max(displayStep - 1, 0)) / (STEPS.length - 1)) * 100}% - 0rem)`,
            maxWidth: "calc(100% - 4rem)",
          }}
        />

        {STEPS.map((step) => {
          const isCompleted = displayStep > step.number;
          const isCurrent = displayStep === step.number;
          const Icon = step.icon;

          return (
            <li
              key={step.number}
              className="relative flex flex-1 flex-col items-center gap-2"
              style={{ zIndex: 1 }}
            >
              {/* Step circle */}
              <div
                aria-current={isCurrent ? "step" : undefined}
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px_oklch(0.546_0.245_262.881/0.15)]"
                    : isCurrent
                      ? "border-primary bg-background text-primary shadow-[0_0_0_4px_oklch(0.546_0.245_262.881/0.12)] ring-4 ring-primary/10"
                      : "border-border bg-background text-muted-foreground",
                ].join(" ")}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                ) : (
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </div>

              {/* Step label */}
              <span
                className={[
                  "text-[11px] font-semibold tracking-wide uppercase transition-colors duration-200",
                  isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground/60",
                ].join(" ")}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
