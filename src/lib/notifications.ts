import { addDoc, collection, type Firestore } from 'firebase/firestore';
import type { Notification } from '@/types/notification';

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

export interface NotificationPayload {
    toUserId: string;
    type: NotificationType;
    firestore: Firestore;
    senderName?: string;
    propertyName?: string;
    propertyTitle?: string;
    tenantName?: string;
    link?: string;
    transactionId?: string;
    /** Overrides the template message when provided. */
    customMessage?: string;
}

type TemplateContext = {
    sender: string;
    property: string;
    tenant: string;
};

type Template = {
    title: string;
    message: (ctx: TemplateContext) => string;
    level: Notification['type'];
    defaultLink?: string;
};

/**
 * Single source of truth for notification copy. Each type has a title, a
 * message builder and a severity level used for styling in the UI.
 */
const TEMPLATES: Record<NotificationType, Template> = {
    WELCOME: {
        title: 'Welcome to Lodger',
        message: () => 'Your account is ready. Complete your profile so landlords and tenants can trust who they are talking to.',
        level: 'success',
    },
    NEW_MESSAGE: {
        title: 'New message',
        message: ({ sender }) => `${sender} sent you a message.`,
        level: 'info',
    },
    NEW_REQUEST: {
        title: 'New rental request',
        message: ({ sender, property }) => `${sender} wants to rent ${property}. Review the request to accept or decline.`,
        level: 'info',
        defaultLink: '/landlord/requests',
    },
    REQUEST_ACCEPTED: {
        title: 'Request accepted',
        message: ({ property }) => `Good news! Your request for ${property} was accepted. Review and sign your lease to continue.`,
        level: 'success',
    },
    REQUEST_REJECTED: {
        title: 'Request declined',
        message: ({ property }) => `Your request for ${property} was declined. Keep browsing — there are plenty of other homes available.`,
        level: 'warning',
        defaultLink: '/properties',
    },
    MAINTENANCE_REQUEST: {
        title: 'New maintenance request',
        message: ({ tenant, property }) => `${tenant} reported a maintenance issue at ${property}.`,
        level: 'warning',
        defaultLink: '/landlord/maintenance',
    },
    RENT_DUE: {
        title: 'Rent due soon',
        message: ({ property }) => `Your rent for ${property} is due soon. Pay on time to keep your tenancy in good standing.`,
        level: 'warning',
        defaultLink: '/student/tenancy',
    },
    LEASE_GENERATED: {
        title: 'Lease ready to sign',
        message: ({ property }) => `A lease agreement for ${property} has been generated. Review and sign it to secure your home.`,
        level: 'info',
        defaultLink: '/student/leases',
    },
    LEASE_SIGNED: {
        title: 'Lease signed',
        message: ({ tenant, property }) => `${tenant} signed the lease for ${property}.`,
        level: 'success',
        defaultLink: '/landlord/leases',
    },
    TENANCY_ENDED: {
        title: 'Tenancy ended',
        message: ({ property }) => `The tenancy for ${property} has ended.`,
        level: 'info',
    },
    REVIEW_SUBMITTED: {
        title: 'New review',
        message: ({ tenant, property }) => `${tenant} left a review for ${property}.`,
        level: 'info',
        defaultLink: '/landlord/properties',
    },
    OFFLINE_PAYMENT_PENDING: {
        title: 'Offline payment submitted',
        message: ({ tenant, property }) => `${tenant} submitted an offline payment for ${property}. Please verify the transfer in Rental Requests.`,
        level: 'warning',
        defaultLink: '/landlord/requests',
    },
    OFFLINE_PAYMENT_APPROVED: {
        title: 'Payment confirmed',
        message: ({ property }) => `Your landlord confirmed your payment for ${property}.`,
        level: 'success',
        defaultLink: '/student/tenancy',
    },
    OFFLINE_PAYMENT_REJECTED: {
        title: 'Payment not confirmed',
        message: ({ property }) => `Your landlord could not confirm your payment for ${property}. Please check the details and try again.`,
        level: 'error',
        defaultLink: '/student/leases',
    },
    LEASE_EXPIRED: {
        title: 'Lease expired',
        message: ({ property }) => `Your lease for ${property} has expired.`,
        level: 'warning',
    },
    LEASE_TERMS_CHANGED: {
        title: 'Lease terms updated',
        message: ({ property }) => `The landlord updated the listing details for ${property}. Review your lease for any changes.`,
        level: 'info',
        defaultLink: '/student/leases',
    },
    PROPERTY_OCCUPIED: {
        title: 'Property no longer available',
        message: ({ property }) => `${property} has been rented by another student. Explore similar listings.`,
        level: 'info',
        defaultLink: '/properties',
    },
    TENANCY_TERMINATING: {
        title: 'Tenancy ending',
        message: ({ property }) => `Your landlord has started ending your tenancy at ${property}.`,
        level: 'warning',
        defaultLink: '/student/tenancy',
    },
};

/** Builds the notification document without writing it (useful for tests). */
export function buildNotification({
    toUserId,
    type,
    senderName,
    propertyName,
    propertyTitle,
    tenantName,
    link,
    customMessage,
}: Omit<NotificationPayload, 'firestore'>): Omit<Notification, 'id'> {
    const template = TEMPLATES[type];
    const ctx: TemplateContext = {
        sender: senderName || 'Someone',
        property: propertyTitle || propertyName || 'your property',
        tenant: tenantName || senderName || 'A tenant',
    };

    return {
        userId: toUserId,
        title: template.title,
        message: customMessage?.trim() || template.message(ctx),
        type: template.level,
        read: false,
        createdAt: new Date().toISOString(),
        link: link || template.defaultLink || '',
    };
}

/** Writes an in-app notification. Failures are logged and never thrown. */
export async function sendNotification({ firestore, ...payload }: NotificationPayload): Promise<void> {
    try {
        await addDoc(collection(firestore, 'notifications'), buildNotification(payload));
    } catch (error) {
        console.error('Failed to send notification:', error);
    }
}
