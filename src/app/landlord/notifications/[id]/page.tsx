'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, ExternalLink, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { PageSkeleton } from "@/components/dashboard/skeletons";
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { Notification } from "@/types/notification";

export default function NotificationDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const firestore = useFirestore();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;

    const notifRef = useMemoFirebase(() => id ? doc(firestore, 'notifications', id) : null, [firestore, id]);
    const { data: notification, isLoading } = useDoc<Notification>(notifRef);

    useEffect(() => {
        if (notification && !notification.read && notifRef) {
            updateDoc(notifRef, { read: true }).catch(console.error);
        }
    }, [notification, notifRef]);

    if (isLoading) return <PageSkeleton variant="detail" />;

    if (!notification) {
        return (
            <div className="container mx-auto max-w-2xl py-20 px-4 text-center">
                <h1 className="text-xl font-bold mb-4">Notification Not Found</h1>
                <Button onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-2xl py-8 px-4 animate-in fade-in duration-500">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-6 hover:bg-muted text-muted-foreground">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>

            <div className="bg-card border border-foreground/5 rounded-3xl shadow-sm overflow-hidden">
                <div className={cn(
                    "h-32 flex items-center justify-center",
                    notification.type === 'warning' || notification.type === 'error' ? "bg-amber-500/10" : "bg-primary/5"
                )}>
                    <Bell className={cn(
                        "h-12 w-12",
                        notification.type === 'warning' || notification.type === 'error' ? "text-amber-600" : "text-primary"
                    )} />
                </div>

                <div className="p-8 md:p-8 space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-muted-foreground text-sm font-medium">
                            <Clock className="h-4 w-4" />
                            {notification.createdAt ? format(new Date(notification.createdAt), 'PPP p') : 'Unknown Date'}
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight leading-tight">
                            {notification.title}
                        </h1>
                    </div>

                    <div className="prose prose-sm md:prose-lg text-muted-foreground leading-relaxed break-words">
                        <p>{notification.message}</p>
                    </div>

                    {notification.link && notification.link !== '#' && (
                        <div className="pt-8 border-t border-muted/20">
                            <Button size="lg" className="w-full h-14 rounded-2xl font-bold uppercase tracking-wider gap-2 shadow-lg hover:translate-y-[-2px] transition-all" asChild>
                                <Link href={notification.link}>
                                    Take Action <ExternalLink className="h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
