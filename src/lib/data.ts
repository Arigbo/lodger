import type { User, Property, Review, RentalRequest, Transaction } from './definitions';
import placeholderImages from './placeholder-images.json';

const users: User[] = [
  { id: 'user-1', name: 'Sarah Johnson', email: 'sarah@university.edu', avatarUrl: placeholderImages.placeholderImages.find(p => p.id === 'avatar-1')?.imageUrl || '', role: 'landlord' },
  { id: 'user-2', name: 'Michael Chen', email: 'michael@university.edu', avatarUrl: placeholderImages.placeholderImages.find(p => p.id === 'avatar-2')?.imageUrl || '', role: 'student' },
  { id: 'user-3', name: 'Emily Rodriguez', email: 'emily@university.edu', avatarUrl: placeholderImages.placeholderImages.find(p => p.id === 'avatar-3')?.imageUrl || '', role: 'student' },
  { id: 'user-4', name: 'David Smith', email: 'david@university.edu', avatarUrl: placeholderImages.placeholderImages.find(p => p.id === 'avatar-4')?.imageUrl || '', role: 'landlord' },
  { id: 'user-5', name: 'Jessica Williams', email: 'jessica@university.edu', avatarUrl: 'https://picsum.photos/seed/avatar5/200/200', role: 'student' },

];

const properties: Property[] = [
  {
    id: 'prop-1',
    title: 'Modern Downtown Loft near Campus',
    description: 'A spacious and sunny loft apartment perfect for students. Comes fully furnished with high-speed internet. Just a 10-minute walk from the main university campus. Features a rooftop terrace with city views.',
    price: 1200,
    type: 'Loft',
    location: { address: '123 University Ave', city: 'Urbanville', state: 'CA', zip: '90210' },
    bedrooms: 1,
    bathrooms: 1,
    area: 800,
    amenities: ['Furnished', 'Wi-Fi', 'Rooftop Access', 'In-unit Laundry', 'Dishwasher'],
    imageIds: ['apartment-1-a', 'apartment-1-b', 'apartment-1-c'],
    landlordId: 'user-1',
    status: 'occupied',
    rules: ['No smoking', 'No pets', 'Quiet hours after 10 PM'],
    currentTenantId: 'user-5',
    leaseStartDate: '2023-09-01',
  },
  {
    id: 'prop-2',
    title: 'Cozy Studio for a Solo Student',
    description: 'This cozy studio is ideal for a student looking for a quiet place to study and relax. It is located in a safe neighborhood with plenty of cafes and shops nearby. All utilities are included in the rent.',
    price: 850,
    type: 'Studio',
    location: { address: '456 College Rd', city: 'Urbanville', state: 'CA', zip: '90211' },
    bedrooms: 1,
    bathrooms: 1,
    area: 450,
    amenities: ['All Utilities Included', 'Wi-Fi', 'Kitchenette', 'Secure Entry'],
    imageIds: ['apartment-2-a', 'apartment-2-b'],
    landlordId: 'user-4',
    status: 'available',
    rules: ['Single occupant only', 'No loud parties'],
  },
  {
    id: 'prop-3',
    title: 'Spacious 2-Bedroom Apartment',
    description: 'Perfect for sharing with a roommate! This two-bedroom apartment has a large living area, a modern kitchen, and two equal-sized bedrooms. Located on the university shuttle route.',
    price: 1800,
    type: 'Apartment',
    location: { address: '789 Library Walk', city: 'Urbanville', state: 'CA', zip: '90212' },
    bedrooms: 2,
    bathrooms: 2,
    area: 1100,
    amenities: ['In-unit Laundry', 'Dishwasher', 'Gym Access', 'Parking Spot'],
    imageIds: ['apartment-3-a', 'apartment-5-a'],
    landlordId: 'user-1',
    status: 'occupied',
    rules: ['No smoking', 'Small pets considered with a fee'],
    currentTenantId: 'user-3',
    leaseStartDate: '2024-01-15',
  },
  {
    id: 'prop-4',
    title: 'Charming House with a Yard',
    description: 'A beautiful three-bedroom house with a private yard, great for students who want more space. The house has hardwood floors, a large kitchen, and a comfortable living room.',
    price: 2500,
    type: 'House',
    location: { address: '101 Faculty Dr', city: 'Urbanville', state: 'CA', zip: '90213' },
    bedrooms: 3,
    bathrooms: 2,
    area: 1500,
    amenities: ['Private Yard', 'Pet Friendly', 'Washer & Dryer', 'Driveway Parking'],
    imageIds: ['apartment-4-a', 'apartment-6-a'],
    landlordId: 'user-4',
    status: 'available',
    rules: ['Tenants responsible for yard maintenance', 'Maximum 4 occupants'],
  },
];

const reviews: Review[] = [
  { id: 'rev-1', propertyId: 'prop-1', userId: 'user-3', rating: 5, comment: 'Amazing place! The landlord, Sarah, is very responsive and helpful. The location is unbeatable.', date: '2023-08-15T10:00:00Z' },
  { id: 'rev-2', propertyId: 'prop-3', userId: 'user-2', rating: 4, comment: 'Great apartment for roommates. The walls are a bit thin, but the amenities are great. The gym is a nice bonus.', date: '2023-09-01T14:30:00Z' },
];

const rentalRequests: RentalRequest[] = [
    { id: 'req-1', propertyId: 'prop-1', userId: 'user-2', status: 'pending', message: 'I am very interested in this loft! I am a quiet and responsible graduate student.', requestDate: '2024-05-20T11:00:00Z'},
    { id: 'req-2', propertyId: 'prop-2', userId: 'user-3', status: 'accepted', message: 'This studio looks perfect for my needs.', requestDate: '2024-05-18T18:00:00Z'},
];

const transactions: Transaction[] = [
  { id: 'trans-1', landlordId: 'user-1', tenantId: 'user-3', propertyId: 'prop-3', amount: 1800, date: '2024-05-01', type: 'Rent', status: 'Completed' },
  { id: 'trans-2', landlordId: 'user-1', tenantId: 'user-5', propertyId: 'prop-1', amount: 1200, date: '2024-05-01', type: 'Rent', status: 'Completed' },
  { id: 'trans-3', landlordId: 'user-1', tenantId: 'user-3', propertyId: 'prop-3', amount: 1800, date: '2024-04-01', type: 'Rent', status: 'Completed' },
  { id: 'trans-4', landlordId: 'user-1', tenantId: 'user-5', propertyId: 'prop-1', amount: 1200, date: '2024-04-01', type: 'Rent', status: 'Completed' },
  { id: 'trans-5', landlordId: 'user-4', tenantId: 'user-2', propertyId: 'prop-2', amount: 850, date: '2024-05-05', type: 'Deposit', status: 'Pending' },
  { id: 'trans-6', landlordId: 'user-1', tenantId: 'user-3', propertyId: 'prop-3', amount: 75, date: '2024-03-15', type: 'Late Fee', status: 'Completed' },
];


// Data fetching functions
export function getProperties() {
  return properties;
}

export function getPropertyById(id: string) {
  return properties.find(p => p.id === id);
}

export function getPropertiesByLandlord(landlordId: string) {
  return properties.filter(p => p.landlordId === landlordId);
}

export function getPropertiesByTenant(tenantId: string) {
    return properties.filter(p => p.currentTenantId === tenantId);
}

export function getUserById(id: string): User | undefined {
  return users.find(u => u.id === id);
}

export function getReviewsByPropertyId(propertyId: string) {
  return reviews.filter(r => r.propertyId === propertyId);
}

export function getRentalRequestsByPropertyId(propertyId: string) {
    return rentalRequests.filter(r => r.propertyId === propertyId);
}

export function getTransactionsByLandlord(landlordId: string) {
  return transactions.filter(t => t.landlordId === landlordId);
}

export function getImagesByIds(ids: string[]) {
    return placeholderImages.placeholderImages.filter(p => ids.includes(p.id));
}