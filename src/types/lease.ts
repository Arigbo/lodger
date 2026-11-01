import type { Timestamp } from "firebase/firestore";
export type LeaseAgreement = {
    id: string;
    propertyId: string;
    landlordId: string;
    tenantId: string;
    leaseText: string;
    landlordSigned: boolean;
    tenantSigned: boolean;
    startDate: string;
    endDate: string;
    currency: string;
    status: 'active' | 'expired' | 'pending' | 'terminating';
    paymentMethod?: 'stripe' | 'offline' | null;
    paymentConfirmed?: boolean;
    landlordApprovedOfflinePayment?: boolean;
    offlinePaymentAmount?: number;
    offlinePaymentMonths?: number;
    createdAt?: Timestamp | string;
    /** When an unsigned lease offer lapses (3 days after creation). */
    expiresAt?: Timestamp | string;
    terminationGracePeriodEnd?: string; // ISO string
    calculatedRefund?: number;
};

export type RentalApplication = {
    id: string;
    propertyId: string;
    tenantId: string;
    landlordId: string;
    status: 'pending' | 'approved' | 'declined';
    messageToLandlord: string;
    applicationDate: string; // ISO 8601 date string
};
