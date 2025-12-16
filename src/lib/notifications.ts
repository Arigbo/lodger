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
    | 'TENANCY_ENDED';

interface NotificationPayload {
    toUserId: string;
    type: NotificationType;
    firestore: Firestore;
    // Dynamic data for messages
    senderName?: string;
    propertyName?: string;
    link?: string;
    customMessage?: string;
}

export const sendNotification = async ({
    toUserId,
    type,
    firestore,
    senderName,
    propertyName,
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
