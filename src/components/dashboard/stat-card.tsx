import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const tones = {
  default: "bg-primary/10 text-primary",
  info: "bg-sky-500/10 text-sky-600",
  success: "bg-emerald-500/10 text-emerald-600",
  warning: "bg-amber-500/10 text-amber-600",
  danger: "bg-red-500/10 text-red-600",
} as const;

type StatCardProps = {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
  tone?: keyof typeof tones;
  href?: string;
  className?: string;
};

/** Compact metric tile used on dashboard overviews. */
export function StatCard({ label, value, icon: Icon, hint, tone = "default", href, className }: StatCardProps) {
  const body = (
    <div
      className={cn(
        "flex h-full items-start gap-4 rounded-2xl border bg-card p-5 transition-colors",
        href && "hover:border-primary/40 hover:bg-accent/40",
        className,
      )}
    >
      {Icon && (
        <div className={cn("rounded-xl p-2.5", tones[tone])}>
          <Icon aria-hidden className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-2xl font-bold tracking-tight text-foreground">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {body}
    </Link>
  ) : (
    body
  );
}

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-4 lg:grid-cols-4", className)}>{children}</div>;
}
