"use client";

import { Bell, CheckCheck } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/dashboard";
import { NotificationItem } from "@/components/notifications/notification-item";
import { Button } from "@/components/ui/button";
import { useUser } from "@/firebase/provider";
import { useNotifications } from "@/hooks/useNotifications";

/** Full notification history, shared by the student and landlord areas. */
export function NotificationsView() {
  const { user } = useUser();
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } = useNotifications(user?.uid || null);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.` : "You're all caught up."}
        actions={
          unreadCount > 0 && (
            <Button variant="outline" className="rounded-xl" onClick={() => markAllAsRead()}>
              <CheckCheck className="mr-2 h-4 w-4" /> Mark all as read
            </Button>
          )
        }
      />

      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Updates about requests, leases, payments and messages will show up here."
        />
      ) : (
        <div className="divide-y overflow-hidden rounded-2xl border bg-card">
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} onMarkAsRead={markAsRead} />
          ))}
        </div>
      )}
    </div>
  );
}
