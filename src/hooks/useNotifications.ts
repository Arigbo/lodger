import { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    doc,
    updateDoc,
    writeBatch
} from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Notification } from '@/types/notification';

const NOTIFICATION_LIMIT = 50;
const EMPTY: Notification[] = [];

export function useNotifications(userId: string | null) {
    const firestore = useFirestore();
    // Results are keyed by the user they belong to so switching accounts
    // never shows stale notifications, and loading is derived.
    const [result, setResult] = useState<{ userId: string; items: Notification[] } | null>(null);

    useEffect(() => {
        if (!userId || !firestore) return;

        const q = query(
            collection(firestore, 'notifications'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            // Firestore rules require list queries on notifications to be bounded.
            limit(NOTIFICATION_LIMIT)
        );

        return onSnapshot(
            q,
            (snapshot) => {
                const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Notification[];
                setResult({ userId, items });
            },
            (error) => {
                console.error("[useNotifications] Error fetching notifications:", error);
                setResult({ userId, items: [] });
            },
        );
    }, [userId, firestore]);

    const notifications = userId && result?.userId === userId ? result.items : EMPTY;
    const loading = !!userId && result?.userId !== userId;

    const markAsRead = async (notificationId: string) => {
        if (!firestore) return;
        try {
            const notificationRef = doc(firestore, 'notifications', notificationId);
            await updateDoc(notificationRef, {
                read: true
            });
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const markAllAsRead = async () => {
        if (!firestore || !userId) return;
        try {
            const batch = writeBatch(firestore);
            const unreadNotifications = notifications.filter(n => !n.read);

            unreadNotifications.forEach(n => {
                const ref = doc(firestore, 'notifications', n.id);
                batch.update(ref, { read: true });
            });

            if (unreadNotifications.length > 0) {
                await batch.commit();
            }
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return { notifications, loading, markAsRead, markAllAsRead, unreadCount };
}
