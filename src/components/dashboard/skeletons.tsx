import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Accessible wrapper so screen readers announce loading once. */
function Loading({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

function HeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div className="space-y-2.5">
        <Skeleton className="h-7 w-56 rounded-lg" />
        <Skeleton className="h-4 w-80 max-w-[70vw]" />
      </div>
      {action && <Skeleton className="hidden h-10 w-36 rounded-xl sm:block" />}
    </div>
  );
}

function StatSkeletons({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl border bg-card p-5">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-6 w-14" />
          </div>
        </div>
      ))}
    </div>
  );
}

function RowSkeletons({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex gap-2 border-b p-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-lg" />
        ))}
      </div>
      <ul className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CardGridSkeletons({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border bg-card">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-2.5 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3.5 w-1/2" />
            <div className="flex gap-3 pt-2">
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3.5 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Skeleton className="aspect-[16/8] w-full rounded-2xl" />
        <div className="space-y-3 rounded-2xl border bg-card p-6">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="space-y-4 rounded-2xl border bg-card p-6">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}

export type PageSkeletonVariant = "overview" | "list" | "grid" | "detail" | "form";

/**
 * Content-shaped placeholder for dashboard pages. Pick the variant that
 * matches the page layout so content appears without a layout jump.
 */
export function PageSkeleton({ variant = "list", className }: { variant?: PageSkeletonVariant; className?: string }) {
  return (
    <Loading label="Loading page" className={cn("animate-in fade-in duration-300", className)}>
      <HeaderSkeleton action={variant !== "detail"} />
      {variant === "overview" && (
        <div className="space-y-8">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <StatSkeletons />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RowSkeletons rows={4} />
            </div>
            <RowSkeletons rows={3} />
          </div>
        </div>
      )}
      {variant === "list" && (
        <div className="space-y-6">
          <StatSkeletons count={3} />
          <RowSkeletons />
        </div>
      )}
      {variant === "grid" && <CardGridSkeletons />}
      {variant === "detail" && <DetailSkeleton />}
      {variant === "form" && (
        <div className="max-w-3xl space-y-5 rounded-2xl border bg-card p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      )}
    </Loading>
  );
}

/** Mirrors the app shell (sidebar + top bar) while the session is resolved. */
export function ShellSkeleton() {
  return (
    <Loading label="Loading your dashboard" className="min-h-screen bg-muted/40">
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-primary/10">
        <div className="h-full w-1/4 animate-progress-indeterminate bg-primary" />
      </div>
      <aside className="fixed inset-y-0 left-0 hidden w-[260px] flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="flex-1 space-y-6 px-4 py-5">
          {[1, 3, 3, 2].map((n, g) => (
            <div key={g} className="space-y-2">
              <Skeleton className="h-3 w-16" />
              {Array.from({ length: n }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 border-t p-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </aside>
      <div className="md:pl-[260px]">
        <div className="flex h-16 items-center justify-between border-b bg-background/80 px-4 lg:px-8">
          <Skeleton className="h-5 w-40" />
          <div className="flex gap-2">
            <Skeleton className="hidden h-9 w-56 rounded-xl sm:block" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <PageSkeleton variant="overview" />
        </div>
      </div>
    </Loading>
  );
}
