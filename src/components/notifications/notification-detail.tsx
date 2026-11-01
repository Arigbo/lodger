"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { AlertTriangle, ArrowRight, BellOff, CheckCircle2, Info, XCircle } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/notification";

const TONES = {
  info: { icon: Info, className: "bg-sky-50 text-sky-700" },
  success: { icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700" },
  warning: { icon: AlertTriangle, className: "bg-amber-50 text-amber-700" },
  error: { icon: XCircle, className: "bg-red-50 text-red-700" },
} as const;

/** Full view of a single notification (shared by both dashboards). */
export function NotificationDetail() {
  const params = useParams<{ id: string }>();
  const firestore = useFirestore();
  const { role } = useUser();
  const listHref = `/${role ?? "student"}/notifications`;
  const ref = useMemoFirebase(() => (params.id ? doc(firestore, "notifications", params.id) : null), [firestore, params.id]);
  const { data: notification, isLoading } = useDoc<Notification>(ref);

  useEffect(() => {
    if (notification && !notification.read && ref) updateDoc(ref, { read: true }).catch(console.error);
  }, [notification, ref]);

  if (isLoading) return <PageSkeleton variant="detail" />;
  if (!notification) {
    return (
      <EmptyState
        icon={BellOff}
        title="Notification not found"
        description="It may have been deleted."
        action={
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={listHref}>All notifications</Link>
          </Button>
        }
      />
    );
  }

  const tone = TONES[notification.type] ?? TONES.info;
  const Icon = tone.icon;
  const hasLink = notification.link && notification.link !== "#";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader back={{ href: listHref, label: "Notifications" }} title="Notification" />
      <article className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <span className={cn("rounded-xl p-2.5", tone.className)}>
            <Icon aria-hidden className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">{notification.title}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {notification.createdAt ? format(new Date(notification.createdAt), "EEEE d MMMM yyyy, HH:mm") : ""}
            </p>
          </div>
        </div>
        <p className="mt-6 whitespace-pre-wrap break-words leading-relaxed text-foreground/90">{notification.message}</p>
        {hasLink && (
          <Button asChild className="mt-8 rounded-xl">
            <Link href={notification.link!}>
              Open <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        )}
      </article>
    </div>
  );
}
