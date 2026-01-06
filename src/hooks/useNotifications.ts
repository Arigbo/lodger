import { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    writeBatch
} from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Notification } from '@/types/notification';

export function useNotifications(userId: string | null) {
    const firestore = useFirestore();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId || !firestore) {
            setNotifications([]);
            setLoading(false);
            return;
        }

        const notificationsRef = collection(firestore, 'notifications');
        const q = query(
            notificationsRef,
            where('recipientId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newNotifications = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Notification[];

            setNotifications(newNotifications);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching notifications:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId, firestore]);

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
