import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type SectionCardProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: { href: string; label: string };
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

/** Titled panel used to group content on dashboard pages. */
export function SectionCard({ title, description, action, children, className, bodyClassName }: SectionCardProps) {
  return (
    <section className={cn("min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm", className)}>
      <header className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && (
          <Link
            href={action.href}
            className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {action.label}
            <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
