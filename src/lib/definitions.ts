

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: 'landlord' | 'student';
};

export type Property = {
  id: string;
  title: string;
  description: string;
  price: number;
  type: 'Apartment' | 'House' | 'Studio' | 'Loft';
  location: {
    address: string;
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
  imageIds: string[];
  landlordId: string;
  status: 'available' | 'occupied';
  rules: string[];
  currentTenantId?: string | null;
  leaseStartDate?: string; // YYYY-MM-DD
};

export type Review = {
  id: string;
  propertyId: string;
  userId: string;
  rating: number; // 1-5
  comment: string;
  date: string; // ISO 8601 date string
};

export type RentalRequest = {
  id: string;
  propertyId: string;
  userId: string;
  status: 'pending' | 'accepted' | 'declined';
  message: string;
  requestDate: string; // ISO 8601 date string
};

export type Transaction = {
    id: string;
    landlordId: string;
    tenantId: string;
    propertyId: string;
    amount: number;
    date: string; // YYYY-MM-DD
    type: 'Rent' | 'Deposit' | 'Late Fee' | 'Other';
    status: 'Completed' | 'Pending' | 'Failed';
}

export type MaintenanceRequest = {
  id: string;
  propertyId: string;
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
};

export type Conversation = {
  id: string; // Corresponds to the participant's user ID
  participant: User;
  lastMessage: string;
  lastMessageTimestamp: string;
  unreadCount: number;
};

export type Message = {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
};


export const amenities = ["Furnished", "Wi-Fi", "In-unit Laundry", "Pet Friendly", "Parking Spot", "Gym Access", "Rooftop Access", "Dishwasher", "All Utilities Included", "Secure Entry", "Private Yard"];

