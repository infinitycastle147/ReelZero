"use client";

import { Check } from "lucide-react";

const STEPS = [
  { number: 1, label: "Input" },
  { number: 2, label: "Script" },
  { number: 3, label: "Images" },
  { number: 4, label: "Settings" },
] as const;

type WizardStepIndicatorProps = {
  currentStep: number;
};

export function WizardStepIndicator({ currentStep }: WizardStepIndicatorProps) {
  return (
    <nav aria-label="Wizard progress" className="w-full">
      <ol className="flex items-center justify-center gap-0">
        {STEPS.map((step, index) => {
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;

          return (
            <li key={step.number} className="flex items-center">
              {/* Step dot */}
              <div className="flex flex-col items-center">
                <div
                  aria-current={isCurrent ? "step" : undefined}
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-200",
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground",
                  ].join(" ")}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <span>{step.number}</span>
                  )}
                </div>
                <span
                  className={[
                    "mt-1 text-xs font-medium",
                    isCurrent ? "text-primary" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line between steps */}
              {index < STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  className={[
                    "mb-5 h-px w-12 sm:w-20 transition-colors duration-200",
                    isCompleted ? "bg-primary" : "bg-border",
                  ].join(" ")}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
