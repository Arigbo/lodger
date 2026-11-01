import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useUser } from "@/firebase/provider";
import type { Notification } from "@/types/notification";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  isDropdown?: boolean;
}

const dotColor: Record<Notification["type"], string> = {
  info: "bg-sky-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
};

function timeAgo(iso?: string) {
  if (!iso) return "Just now";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : formatDistanceToNow(date, { addSuffix: true });
}

export function NotificationItem({ notification, onMarkAsRead, isDropdown = false }: NotificationItemProps) {
  const { role } = useUser();
  const base = role === "landlord" ? "/landlord/notifications" : "/student/notifications";
  // Go straight to what the notification is about; fall back to its detail view.
  const href = notification.link && notification.link !== "#" ? notification.link : `${base}/${notification.id}`;

  const link = (
    <Link
      href={href}
      onClick={() => !notification.read && onMarkAsRead(notification.id)}
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none",
        isDropdown && "rounded-xl",
        !notification.read && "bg-primary/[0.04]",
      )}
    >
      <span
        aria-hidden
        className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", notification.read ? "bg-muted-foreground/30" : dotColor[notification.type] ?? "bg-primary")}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn("truncate text-sm", notification.read ? "font-medium" : "font-semibold")}>{notification.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(notification.createdAt)}</span>
        </span>
        <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{notification.message}</span>
      </span>
      {!notification.read && <span className="sr-only">(unread)</span>}
    </Link>
  );

  return isDropdown ? <DropdownMenuItem asChild className="p-0">{link}</DropdownMenuItem> : link;
}
