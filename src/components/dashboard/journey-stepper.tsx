import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type JourneyStepperProps = { steps: string[]; current: number; className?: string };

/** Evenly spaced progress tracker. `current` is the active step index (steps.length = all done). */
export function JourneyStepper({ steps, current, className }: JourneyStepperProps) {
  return (
    <ol aria-label="Progress" className={cn("grid", className)} style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step} className="relative flex flex-col items-center gap-2 text-center">
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn("absolute left-1/2 top-4 h-0.5 w-full", i < current ? "bg-primary" : "bg-border")}
              />
            )}
            <span
              aria-current={active ? "step" : undefined}
              className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ring-4 ring-card transition-colors",
                done && "bg-primary text-primary-foreground",
                active && "border-2 border-primary bg-card text-primary",
                !done && !active && "border bg-muted text-muted-foreground",
              )}
            >
              {done ? <Check aria-hidden className="h-4 w-4" /> : i + 1}
              <span className="sr-only">{done ? " (done)" : active ? " (current)" : ""}</span>
            </span>
            <span className={cn("hidden text-xs leading-tight sm:block", active ? "font-semibold text-foreground" : "text-muted-foreground")}>
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
