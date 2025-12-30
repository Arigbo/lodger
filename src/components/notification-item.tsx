import Link from "next/link";
import { cn } from "@/utils";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface NotificationItemProps {
    notification: any;
    onMarkAsRead: (id: string) => void;
    isDropdown?: boolean;
}

export function NotificationItem({ notification, onMarkAsRead, isDropdown = false }: NotificationItemProps) {
    const content = (
        <div className="flex w-full justify-between gap-2 mb-1">
            <span className="font-bold text-xs text-primary/80 group-hover:text-primary transition-colors">{notification.title}</span>
            <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                {notification.createdAt ? new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
            </span>
        </div>
    );

    const message = (
        <p className="text-xs line-clamp-2 text-muted-foreground/90 font-medium leading-relaxed">
            {notification.message}
        </p>
    );

    const containerClasses = cn(
        "flex flex-col items-start p-3 m-1 rounded-2xl cursor-pointer transition-all hover:bg-primary/5 group border border-transparent",
        !notification.read && "bg-primary/[0.03] border-primary/10 shadow-sm"
    );

    if (isDropdown) {
        return (
            <DropdownMenuItem asChild>
                <Link
                    href={`/notifications/${notification.id}`}
                    className={containerClasses}
                    onClick={() => onMarkAsRead(notification.id)}
                >
                    {content}
                    {message}
                </Link>
            </DropdownMenuItem>
        );
    }

    return (
        <Link
            href={`/notifications/${notification.id}`}
            className={containerClasses}
            onClick={() => onMarkAsRead(notification.id)}
        >
            {content}
            {message}
        </Link>
    );
}
