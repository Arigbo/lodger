import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SettingsSectionProps = {
  id: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  tone?: "default" | "danger";
};

/** Two-column settings block: explanation on the left, controls on the right. */
export function SettingsSection({ id, title, description, children, tone = "default" }: SettingsSectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="grid scroll-mt-24 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 id={`${id}-title`} className={cn("font-semibold", tone === "danger" && "text-destructive")}>
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div
        className={cn(
          "min-w-0 rounded-2xl border bg-card p-5 shadow-sm sm:p-6",
          tone === "danger" && "border-destructive/30",
        )}
      >
        {children}
      </div>
    </section>
  );
}
