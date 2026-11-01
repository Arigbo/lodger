import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-muted text-muted-foreground ring-border",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  brand: "bg-primary/10 text-primary ring-primary/20",
} as const;

export type StatusTone = keyof typeof tones;

/** Maps the many status strings used across Firestore to a consistent look. */
const STATUS_TONES: Record<string, { tone: StatusTone; label?: string }> = {
  pending: { tone: "warning", label: "Pending" },
  approved: { tone: "success", label: "Approved" },
  accepted: { tone: "success", label: "Accepted" },
  declined: { tone: "danger", label: "Declined" },
  rejected: { tone: "danger", label: "Rejected" },
  active: { tone: "success", label: "Active" },
  expired: { tone: "neutral", label: "Expired" },
  terminating: { tone: "danger", label: "Ending" },
  available: { tone: "info", label: "Available" },
  occupied: { tone: "brand", label: "Occupied" },
  completed: { tone: "success", label: "Completed" },
  "in progress": { tone: "info", label: "In progress" },
  cancelled: { tone: "neutral", label: "Cancelled" },
  failed: { tone: "danger", label: "Failed" },
  "pending verification": { tone: "warning", label: "Awaiting confirmation" },
};

type StatusBadgeProps = { status?: string | null; tone?: StatusTone; children?: React.ReactNode; className?: string };

export function StatusBadge({ status, tone, children, className }: StatusBadgeProps) {
  const known = status ? STATUS_TONES[status.toLowerCase()] : undefined;
  const resolvedTone = tone ?? known?.tone ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[resolvedTone],
        className,
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {children ?? known?.label ?? status ?? "Unknown"}
    </span>
  );
}
