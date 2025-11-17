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
  };
  bedrooms: number;
  bathrooms: number;
  area: number; // in sqft
  amenities: string[];
  imageIds: string[];
  landlordId: string;
  status: 'available' | 'occupied';
  rules: string[];
  currentTenantId?: string;
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

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

    