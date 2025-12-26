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
    tenantImageUrl?: string;
    rating: number; // 1-5
    comment: string;
    reviewDate: string; // ISO 8601 date string
    tenancyStartDate?: string;
    tenancyEndDate?: string;
};

export const amenities = ["Furnished", "Wi-Fi", "In-unit Laundry", "Pet Friendly", "Parking Spot", "Gym Access", "Rooftop Access", "Dishwasher", "All Utilities Included", "Secure Entry", "Private Yard"];
