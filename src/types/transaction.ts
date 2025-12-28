export type Transaction = {
    id: string;
    landlordId: string;
    tenantId: string;
    propertyId: string;
    amount: number;
    currency: string;
    date: string; // YYYY-MM-DD
    type: 'Rent' | 'Deposit' | 'Late Fee' | 'Other' | 'Lease Activation';
    status: 'Completed' | 'Pending' | 'Failed' | 'Pending Verification';
    paymentMethod?: string;
    paymentIntentId?: string;
    months?: number;
    // Backward compatibility
    method?: string;
    monthsPaid?: number;
};
