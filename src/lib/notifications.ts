import { addDoc, collection, Firestore } from 'firebase/firestore';

export type NotificationType =
    | 'WELCOME'
    | 'NEW_MESSAGE'
    | 'NEW_REQUEST'
    | 'REQUEST_ACCEPTED'
    | 'REQUEST_REJECTED'
    | 'MAINTENANCE_REQUEST'
    | 'RENT_DUE'
    | 'LEASE_GENERATED'
    | 'LEASE_SIGNED'
    | 'TENANCY_ENDED'
    | 'REVIEW_SUBMITTED'
    | 'OFFLINE_PAYMENT_PENDING'
    | 'OFFLINE_PAYMENT_APPROVED'
    | 'OFFLINE_PAYMENT_REJECTED'
    | 'LEASE_EXPIRED'
    | 'LEASE_TERMS_CHANGED'
    | 'PROPERTY_OCCUPIED'
    | 'TENANCY_TERMINATING';

interface NotificationPayload {
    toUserId: string;
    type: NotificationType;
    firestore: Firestore;
    // Dynamic data for messages
    senderName?: string;
    propertyName?: string;
    propertyTitle?: string;
    tenantName?: string;
    link?: string;
    transactionId?: string;
    customMessage?: string;
}

export const sendNotification = async ({
    toUserId,
    type,
    firestore,
    senderName,
    propertyName,
    propertyTitle,
    tenantName,
    link,
    transactionId,
    customMessage
}: NotificationPayload) => {
    let title = 'New Notification';
    let message = '';
    let uiType: 'info' | 'success' | 'warning' | 'error' = 'info';
    let finalLink = link || '#';

    switch (type) {
        // ... (existing cases)

        case 'OFFLINE_PAYMENT_PENDING':
            title = 'Offline Payment Submitted';
            message = `${tenantName || 'A tenant'} has submitted an offline payment for ${propertyTitle || 'a property'}. Please verify and accept the transfer in Lease Requests.`;
            uiType = 'warning';
            finalLink = `/landlord/requests`;
            break;

        // ... (other cases)
    }

    try {
        const notificationsRef = collection(firestore, 'notifications');
        await addDoc(notificationsRef, {
            userId: toUserId,
            title,
            message,
            type: uiType,
            read: false,
            createdAt: new Date().toISOString(),
            link: finalLink
        });
    } catch (error) {
        console.error("Failed to send notification:", error);
    }
};
