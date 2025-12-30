'use client';

import { useUser } from "@/firebase/provider";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationItem } from "@/components/notification-item";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bell, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Loading from "@/app/loading";

export default function NotificationsPage() {
    const { user } = useUser();
    const router = useRouter();
    const { notifications, isLoading, markAsRead, markAllAsRead } = useNotifications(user?.uid || null);

    if (isLoading) return <Loading />;

    return (
        <div className="container mx-auto max-w-2xl py-8 px-4 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-muted" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight">Notifications</h1>
                    <p className="text-sm font-medium text-muted-foreground">Stay updated with your latest alerts</p>
                </div>
            </div>

            <div className="flex justify-end">
                <Button
                    variant="outline"
                    size="sm"
                    className="text-xs font-bold uppercase tracking-widest"
                    onClick={() => markAllAsRead()}
                >
                    Mark all read
                </Button>
            </div>

            <div className="space-y-2">
                {notifications.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                        <div className="h-20 w-20 rounded-3xl bg-muted/20 flex items-center justify-center mx-auto">
                            <CheckCircle2 className="h-10 w-10 text-muted-foreground/20" />
                        </div>
                        <p className="text-sm font-black text-muted-foreground uppercase tracking-widest leading-relaxed">System Quiet</p>
                    </div>
                ) : (
                    notifications.map((notif) => (
                        <NotificationItem
                            key={notif.id}
                            notification={notif}
                            onMarkAsRead={markAsRead}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
