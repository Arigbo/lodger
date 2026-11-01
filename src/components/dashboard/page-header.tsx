import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Small label above the title, e.g. the section name. */
  eyebrow?: ReactNode;
  /** Buttons or other controls aligned to the right on desktop. */
  actions?: ReactNode;
  /** Renders a "back" link above the title. */
  back?: { href: string; label: string };
  className?: string;
};

/** Consistent heading block for every dashboard page. */
export function PageHeader({ title, description, eyebrow, actions, back, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-8 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-1.5">
        {back && (
          <Link
            href={back.href}
            className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft aria-hidden className="h-4 w-4" /> {back.label}
          </Link>
        )}
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>}
        <h1 className="font-headline text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
