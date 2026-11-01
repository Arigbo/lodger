"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationItem } from "@/components/notifications/notification-item";
import { useNotifications } from "@/hooks/useNotifications";
import { useToast } from "@/hooks/use-toast";

const DROPDOWN_LIMIT = 8;

/** Bell button with an unread badge and a dropdown of recent notifications. */
export function NotificationsMenu({ userId, role }: { userId: string; role: "student" | "landlord" | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(userId);
  const lastSeenId = useRef<string | null>(null);
  const notificationsHref = role === "landlord" ? "/landlord/notifications" : "/student/notifications";

  // Toast newly-arrived notifications (skip the initial load).
  useEffect(() => {
    const latest = notifications[0];
    if (!latest) return;
    if (lastSeenId.current === null) {
      lastSeenId.current = latest.id;
      return;
    }
    if (latest.id !== lastSeenId.current && !latest.read) {
      const age = Date.now() - new Date(latest.createdAt).getTime();
      if (age < 15_000) toast({ title: latest.title, description: latest.message });
    }
    lastSeenId.current = latest.id;
  }, [notifications, toast]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-2xl p-2">
        <div className="flex items-center justify-between px-3 py-2">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-primary" onClick={() => markAllAsRead()}>
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[60vh] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <Bell className="h-6 w-6 opacity-40" />
              No notifications yet
            </div>
          ) : (
            notifications
              .slice(0, DROPDOWN_LIMIT)
              .map((n) => <NotificationItem key={n.id} notification={n} onMarkAsRead={markAsRead} isDropdown />)
          )}
        </div>
        <DropdownMenuSeparator />
        <Button variant="ghost" className="w-full text-xs font-semibold text-primary" onClick={() => router.push(notificationsHref)}>
          View all activity
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
