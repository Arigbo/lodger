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
    | 'LEASE_EXPIRED';

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
    customMessage
}: NotificationPayload) => {
    let title = 'New Notification';
    let message = '';
    let uiType: 'info' | 'success' | 'warning' | 'error' = 'info';

    switch (type) {
        case 'WELCOME':
            title = 'Welcome to Urban Nest!';
            message = "We're excited to have you on board. Your account has been successfully created. Explore properties or list your own to get started.";
            uiType = 'success';
            break;

        case 'NEW_MESSAGE':
            title = `New Message from ${senderName || 'User'}`;
            message = customMessage || 'You have received a new message.';
            uiType = 'info';
            break;

        case 'NEW_REQUEST':
            title = 'New Property Request';
            message = `${senderName || 'A student'} has requested to view ${propertyName || 'your property'}.`;
            uiType = 'info';
            break;

        case 'REQUEST_ACCEPTED':
            title = 'Request Accepted!';
            message = `Good news! Your request for ${propertyName || 'the property'} has been accepted.`;
            uiType = 'success';
            break;

        case 'REQUEST_REJECTED':
            title = 'Request Update';
            message = `Your request for ${propertyName || 'the property'} was declined.`;
            uiType = 'error';
            break;

        case 'MAINTENANCE_REQUEST':
            title = 'New Maintenance Request';
            message = `${senderName || 'A tenant'} reported an issue at ${propertyName || 'your property'}.`;
            uiType = 'warning';
            break;

        case 'RENT_DUE':
            title = 'Rent Due Warning';
            message = `Reminder: Rent for ${propertyName} is due soon. Please ensure payment is made on time.`;
            uiType = 'warning';
            break;

        case 'LEASE_GENERATED':
            title = 'Lease Ready to Sign';
            message = `A lease has been generated for ${propertyName}. Please review and sign.`;
            uiType = 'info';
            break;

        case 'LEASE_SIGNED':
            title = 'Lease Signed';
            message = `${senderName || 'The tenant'} has signed the lease for ${propertyName}.`;
            uiType = 'success';
            break;

        case 'TENANCY_ENDED':
            title = 'Tenancy Ended';
            message = `The tenancy for ${propertyName} has explicitly ended.`;
            uiType = 'info';
            break;

        case 'REVIEW_SUBMITTED':
            title = 'New Review';
            message = `${senderName || 'A tenant'} left a review for ${propertyName}.`;
            uiType = 'info';
            break;

        case 'OFFLINE_PAYMENT_PENDING':
            title = 'Offline Payment Pending';
            message = `${tenantName || 'A tenant'} has selected offline payment for ${propertyTitle || 'a property'}. Please confirm receipt of payment.`;
            uiType = 'warning';
            break;

        case 'OFFLINE_PAYMENT_APPROVED':
            title = 'Payment Confirmed!';
            message = `Your offline payment for ${propertyTitle || 'the property'} has been confirmed by the landlord. Your lease is now active!`;
            uiType = 'success';
            break;

        case 'OFFLINE_PAYMENT_REJECTED':
            title = 'Payment Not Confirmed';
            message = `The landlord has not confirmed your offline payment for ${propertyTitle || 'the property'}. Please contact them directly.`;
            uiType = 'error';
            break;

        case 'LEASE_EXPIRED':
            title = 'Lease Expired';
            message = customMessage || 'Your lease has expired due to non-payment within the 3-day window.';
            uiType = 'warning';
            break;
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
            link: link || '#'
        });
    } catch (error) {
        console.error("Failed to send notification:", error);
    }
};
