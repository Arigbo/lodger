'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Bell, Clock, Info, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/utils";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface NotificationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    notifications: any[];
    onMarkAsRead: (id: string) => void;
}

export function NotificationModal({ open, onOpenChange, notifications, onMarkAsRead }: NotificationModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-3xl bg-white/95 backdrop-blur-xl rounded-[3rem]">
                <DialogHeader className="p-10 pb-6 bg-muted/30">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <DialogTitle className="text-3xl font-black uppercase tracking-tight">
                                Alerts Center<span className="text-primary">.</span>
                            </DialogTitle>
                            <DialogDescription className="text-sm font-medium text-muted-foreground/60">
                                System protocols and operational updates.
                            </DialogDescription>
                        </div>
                        <div className="h-14 w-14 rounded-2xl bg-white shadow-xl flex items-center justify-center">
                            <Bell className="h-7 w-7 text-primary animate-ring" />
                        </div>
                    </div>
                </DialogHeader>

                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-6 space-y-4">
                    {notifications.length === 0 ? (
                        <div className="py-20 text-center space-y-4">
                            <div className="h-20 w-20 rounded-3xl bg-muted/20 flex items-center justify-center mx-auto">
                                <CheckCircle2 className="h-10 w-10 text-muted-foreground/20" />
                            </div>
                            <p className="text-sm font-black text-muted-foreground uppercase tracking-widest leading-relaxed">System Quiet</p>
                        </div>
                    ) : (
                        notifications.map((notif) => (
                            <div
                                key={notif.id}
                                className={cn(
                                    "group relative p-6 rounded-[2.5rem] transition-all duration-300 border-2",
                                    notif.read
                                        ? "bg-muted/5 border-transparent grayscale-[0.8] hover:grayscale-0 hover:bg-white hover:border-muted/10"
                                        : "bg-white border-primary/10 shadow-xl shadow-primary/[0.02]"
                                )}
                            >
                                <div className="flex gap-6">
                                    <div className={cn(
                                        "h-14 w-14 rounded-2xl flex-shrink-0 flex items-center justify-center transition-transform duration-500 group-hover:rotate-12",
                                        notif.type === 'NEW_MESSAGE' ? "bg-blue-500/10 text-blue-600" :
                                            notif.type === 'PAYMENT_RECEIVED' ? "bg-green-500/10 text-green-600" :
                                                "bg-primary/10 text-primary"
                                    )}>
                                        {notif.type === 'NEW_MESSAGE' ? <Clock className="h-7 w-7" /> : <Info className="h-7 w-7" />}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-black text-xs uppercase tracking-tight truncate pr-4">{notif.title}</h4>
                                            <span className="text-[10px] font-bold text-muted-foreground/40 whitespace-nowrap bg-muted/30 px-3 py-1 rounded-full uppercase tracking-widest">
                                                {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-muted-foreground/80 leading-relaxed">
                                            {notif.message}
                                        </p>
                                        <div className="pt-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-10 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all group/btn"
                                                asChild
                                                onClick={() => onMarkAsRead(notif.id)}
                                            >
                                                <Link href={notif.link || '#'}>
                                                    Execute Protocol <ArrowRight className="ml-2 h-3 w-3 transition-transform group-hover/btn:translate-x-1" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                    {!notif.read && (
                                        <div className="absolute top-6 right-6 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary/10 animate-pulse" />
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-10 border-t border-muted/20 bg-muted/5">
                    <Button
                        variant="outline"
                        className="w-full h-16 rounded-2xl font-black uppercase text-xs tracking-widest border-2 hover:bg-white hover:border-primary/20 transition-all shadow-lg active:scale-95"
                        onClick={() => onOpenChange(false)}
                    >
                        Close Command Center
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
