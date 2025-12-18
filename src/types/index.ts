
export type UserProfile = {
    id: string;
    name: string;
    email: string;
    profileImageUrl: string;
    role: 'landlord' | 'student';
    country?: string;
    state?: string;
    school?: string;
    city?: string;
    phone?: string;
    whatsappUrl?: string;
    twitterUrl?: string;
    bio?: string;
    legalName?: string;
    stripeAccountId?: string;
    currency?: string;
};

export type User = UserProfile;

export type Property = {
    id: string;
    title: string;
    description: string;
    price: number;
    currency: string;
    type: 'Apartment' | 'House' | 'Studio' | 'Loft';
    location: {
        address: string;
        country: string;
        city: string;
        state: string;
        zip: string;
        lat?: number;
        lng?: number;
        school?: string;
    };
    bedrooms: number;
    bathrooms: number;
    area: number; // in sqft
    amenities: string[];
    images: string[];
    landlordId: string;
    status: 'available' | 'occupied';
    rules: string[];
    currentTenantId?: string | null;
    leaseStartDate?: string | null; // YYYY-MM-DD
    leaseTemplate?: string;
};

export type PropertyReview = {
    id: string;
    propertyId: string;
    tenantId: string;
    tenantName?: string;
    rating: number; // 1-5
    comment: string;
    reviewDate: string; // ISO 8601 date string
    tenancyStartDate?: string;
    tenancyEndDate?: string;
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

export type Transaction = {
    id: string;
    landlordId: string;
    tenantId: string;
    propertyId: string;
    amount: number;
    currency: string;
    date: string; // YYYY-MM-DD
    type: 'Rent' | 'Deposit' | 'Late Fee' | 'Other';
    status: 'Completed' | 'Pending' | 'Failed';
}

export type MaintenanceRequest = {
    id: string;
    propertyId: string;
    landlordId: string;
    tenantId: string;
    title: string;
    description: string;
    category: 'Plumbing' | 'Electrical' | 'Appliance' | 'General' | 'Other';
    status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
    priority: 'Low' | 'Medium' | 'High';
    requestDate: string; // ISO 8601 date string
    completedDate?: string | null; // ISO 8601 date string
};

export type ImagePlaceholder = {
    id: string;
    description: string;
    imageUrl: string;
    imageHint: string;
};

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
    status: 'active' | 'expired' | 'pending';
    paymentMethod?: 'stripe' | 'offline' | null;
    paymentConfirmed?: boolean;
    landlordApprovedOfflinePayment?: boolean;
    createdAt?: any; // Firestore timestamp
    expiresAt?: any; // Firestore timestamp (3 days from creation)
};

export type Conversation = {
    id: string; // Corresponds to the participant's user ID
    participant: UserProfile;
    lastMessage: string;
    lastMessageTimestamp: string;
    unreadCount: number;
};

export type Message = {
    id: string;
    senderId: string;
    recipientId: string;
    text: string;
    timestamp: any;
    read: boolean;
    participantIds: string[];
};


export const amenities = ["Furnished", "Wi-Fi", "In-unit Laundry", "Pet Friendly", "Parking Spot", "Gym Access", "Rooftop Access", "Dishwasher", "All Utilities Included", "Secure Entry", "Private Yard"];


