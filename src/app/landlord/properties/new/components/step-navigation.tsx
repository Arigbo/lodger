"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  name: string;
}

interface StepNavigationProps {
  steps: Step[];
  currentStep: number;
}

/** Vertical checklist of wizard steps (desktop) and a compact progress line (mobile). */
export const StepNavigation = ({ steps, currentStep }: StepNavigationProps) => {
  const current = steps[currentStep - 1];
  return (
    <>
      <ol className="hidden lg:block" aria-label="Listing steps">
        {steps.map((step, i) => {
          const active = currentStep === step.id;
          const done = currentStep > step.id;
          return (
            <li key={step.id} className="relative flex gap-3 pb-6 last:pb-0" aria-current={active ? "step" : undefined}>
              {i < steps.length - 1 && (
                <span aria-hidden className={cn("absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-px", done ? "bg-primary" : "bg-border")} />
              )}
              <span
                className={cn(
                  "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary bg-background text-primary ring-4 ring-primary/15",
                  !done && !active && "bg-background text-muted-foreground",
                )}
              >
                {done ? <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} /> : step.id}
              </span>
              <span className={cn("pt-1 text-sm", active ? "font-semibold text-foreground" : done ? "text-foreground" : "text-muted-foreground")}>
                {step.name}
                {done && <span className="sr-only"> (done)</span>}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="text-sm lg:hidden">
        <span className="text-muted-foreground">
          Step {currentStep} of {steps.length}
        </span>{" "}
        · <span className="font-medium">{current?.name}</span>
      </p>
    </>
  );
};
