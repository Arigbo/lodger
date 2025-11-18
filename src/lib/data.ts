

import type { User, Property, Review, RentalRequest, Transaction, LeaseAgreement, Conversation, Message, MaintenanceRequest } from './definitions';
import placeholderImages from './placeholder-images.json';
import { add, format } from 'date-fns';

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
    location: { address: '123 University Ave', city: 'Urbanville', state: 'CA', zip: '90210', lat: 34.0736, lng: -118.4004 },
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
    location: { address: '456 College Rd', city: 'Urbanville', state: 'CA', zip: '90211', lat: 34.075, lng: -118.402 },
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
    location: { address: '789 Library Walk', city: 'Urbanville', state: 'CA', zip: '90212', lat: 34.070, lng: -118.390 },
    bedrooms: 2,
    bathrooms: 2,
    area: 1100,
    amenities: ['In-unit Laundry', 'Dishwasher', 'Gym Access', 'Parking Spot'],
    imageIds: ['apartment-3-a', 'apartment-5-a'],
    landlordId: 'user-1',
    status: 'occupied',
    rules: ['No smoking', 'Small pets considered with a fee'],
    currentTenantId: 'user-3',
    leaseStartDate: '2025-11-01',
  },
  {
    id: 'prop-4',
    title: 'Charming House with a Yard',
    description: 'A beautiful three-bedroom house with a private yard, great for students who want more space. The house has hardwood floors, a large kitchen, and a comfortable living room.',
    price: 2500,
    type: 'House',
    location: { address: '101 Faculty Dr', city: 'Urbanville', state: 'CA', zip: '90213', lat: 34.080, lng: -118.410 },
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

let rentalRequests: RentalRequest[] = [
    { id: 'req-1', propertyId: 'prop-2', userId: 'user-2', status: 'pending', message: 'I am very interested in this studio! I am a quiet and responsible graduate student.', requestDate: '2024-05-20T11:00:00Z'},
    { id: 'req-2', propertyId: 'prop-4', userId: 'user-3', status: 'pending', message: 'This house looks perfect for me and my two roommates.', requestDate: '2024-05-18T18:00:00Z'},
];

const transactions: Transaction[] = [
  { id: 'trans-1', landlordId: 'user-1', tenantId: 'user-3', propertyId: 'prop-3', amount: 1800, date: '2024-05-01', type: 'Rent', status: 'Completed' },
  { id: 'trans-2', landlordId: 'user-1', tenantId: 'user-5', propertyId: 'prop-1', amount: 1200, date: '2024-05-01', type: 'Rent', status: 'Completed' },
  { id: 'trans-3', landlordId: 'user-1', tenantId: 'user-3', propertyId: 'prop-3', amount: 1800, date: '2024-04-01', type: 'Rent', status: 'Completed' },
  { id: 'trans-4', landlordId: 'user-1', tenantId: 'user-5', propertyId: 'prop-1', amount: 1200, date: '2024-04-01', type: 'Rent', status: 'Completed' },
  { id: 'trans-5', landlordId: 'user-4', tenantId: 'user-2', propertyId: 'prop-2', amount: 850, date: '2024-05-05', type: 'Deposit', status: 'Pending' },
  { id: 'trans-6', landlordId: 'user-1', tenantId: 'user-3', propertyId: 'prop-3', amount: 75, date: '2024-03-15', type: 'Late Fee', status: 'Completed' },
];

const maintenanceRequests: MaintenanceRequest[] = [
  {
    id: 'maint-1',
    propertyId: 'prop-3',
    tenantId: 'user-3',
    title: 'Leaky Kitchen Faucet',
    description: 'The faucet in the kitchen sink has been dripping constantly for the past two days. It\'s a steady drip, and I\'m concerned about the water waste.',
    category: 'Plumbing',
    status: 'In Progress',
    priority: 'Medium',
    requestDate: '2024-05-28T10:30:00Z',
  },
  {
    id: 'maint-2',
    propertyId: 'prop-1',
    tenantId: 'user-5',
    title: 'Oven not heating',
    description: 'The oven is not heating up at all. The stovetop works fine, but the oven won\'t get warm. I tried preheating it to 350°F and it was still cold after 20 minutes.',
    category: 'Appliance',
    status: 'Pending',
    priority: 'High',
    requestDate: '2024-05-29T09:00:00Z',
  },
  {
    id: 'maint-3',
    propertyId: 'prop-3',
    tenantId: 'user-3',
    title: 'Front door lock is stiff',
    description: 'The lock on the front door has become very difficult to turn. It takes a lot of jiggling to get the key in and to lock/unlock it.',
    category: 'General',
    status: 'Completed',
    priority: 'Low',
    requestDate: '2024-05-15T14:00:00Z',
    completedDate: '2024-05-17T11:00:00Z',
  },
];


const messages: { [key: string]: Message[] } = {
    'user-3': [
        {id: 'msg1', senderId: 'user-3', text: "Hey! Just wanted to confirm if someone can take a look at the leaky faucet in the kitchen.", timestamp: "2024-05-28T10:30:00Z"},
        {id: 'msg2', senderId: 'user-1', text: "Hi Emily, of course. I've scheduled a plumber to come by tomorrow afternoon. Does that work for you?", timestamp: "2024-05-28T10:32:00Z"},
        {id: 'msg3', senderId: 'user-3', text: "Yes, that's perfect! Thank you so much for the quick response.", timestamp: "2024-05-28T10:33:00Z"},
    ],
    'user-5': [
        {id: 'msg4', senderId: 'user-5', text: "Good morning! I was wondering what the policy is for overnight guests.", timestamp: "2024-05-27T09:00:00Z"},
        {id: 'msg5', senderId: 'user-1', text: "Hi Jessica, occasional overnight guests are fine for a night or two. For anything longer, please just give me a heads up.", timestamp: "2024-05-27T09:05:00Z"},
    ]
};

export const generateLeaseText = (landlord: User, tenant: User, property: Property) => {
  const leaseStartDate = new Date(); // Start today for new leases
  const leaseEndDate = add(leaseStartDate, { years: 1 });

  return `1. PARTIES
This Residential Lease Agreement ("Agreement") is made between ${landlord.name} ("Landlord") and ${tenant.name} ("Tenant").

2. PROPERTY
Landlord agrees to lease to Tenant the property located at ${property.location.address}, ${property.location.city}, ${property.location.state} ${property.location.zip}.

3. TERM
The term of this lease is for one year, beginning on ${format(leaseStartDate, 'MMMM do, yyyy')} and ending on ${format(leaseEndDate, 'MMMM do, yyyy')}.
                                    
4. RENT
Tenant agrees to pay Landlord the sum of ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(property.price)} per month as rent, due on the 1st day of each month.

5. SECURITY DEPOSIT
Upon execution of this Agreement, Tenant shall deposit with Landlord the sum of ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(property.price)} as security for the faithful performance of the terms of this lease.

6. UTILITIES
Tenant is responsible for all utilities and services for the property, unless otherwise specified in the property amenities list.

7. USE OF PREMISES
The premises shall be used and occupied by Tenant and Tenant's immediate family, exclusively, as a private single-family dwelling, and no part of the premises shall be used at any time during the term of this Agreement for the purpose of carrying on any business, profession, or trade of any kind, or for any purpose other than as a private single-family dwelling.
                                    
8. HOUSE RULES
Tenant agrees to abide by the house rules, which are attached as an addendum to this lease. The current rules include: ${property.rules.join(', ')}.`;
}

const leaseAgreements: LeaseAgreement[] = [
    ...properties
    .filter(p => p.currentTenantId && p.landlordId)
    .map(p => {
        const landlord = getUserById(p.landlordId)!;
        const tenant = getUserById(p.currentTenantId!)!;
        const leaseStartDate = p.leaseStartDate ? new Date(p.leaseStartDate) : new Date();
        const leaseEndDate = add(leaseStartDate, { years: 1 });

        return {
            id: `lease-${p.id}`,
            propertyId: p.id,
            landlordId: p.landlordId,
            tenantId: p.currentTenantId!,
            leaseText: `1. PARTIES
This Residential Lease Agreement ("Agreement") is made between ${landlord.name} ("Landlord") and ${tenant.name} ("Tenant").

2. PROPERTY
Landlord agrees to lease to Tenant the property located at ${p.location.address}, ${p.location.city}, ${p.location.state} ${p.location.zip}.

3. TERM
The term of this lease is for one year, beginning on ${format(leaseStartDate, 'MMMM do, yyyy')} and ending on ${format(leaseEndDate, 'MMMM do, yyyy')}.
                                    
4. RENT
Tenant agrees to pay Landlord the sum of ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(p.price)} per month as rent, due on the 1st day of each month.

5. SECURITY DEPOSIT
Upon execution of this Agreement, Tenant shall deposit with Landlord the sum of ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(p.price)} as security for the faithful performance of the terms of this lease.

6. UTILITIES
Tenant is responsible for all utilities and services for the property, unless otherwise specified in the property amenities list.

7. USE OF PREMISES
The premises shall be used and occupied by Tenant and Tenant's immediate family, exclusively, as a private single-family dwelling, and no part of the premises shall be used at any time during the term of this Agreement for the purpose of carrying on any business, profession, or trade of any kind, or for any purpose other than as a private single-family dwelling.
                                    
8. HOUSE RULES
Tenant agrees to abide by the house rules, which are attached as an addendum to this lease. The current rules include: ${p.rules.join(', ')}.`,
            landlordSigned: false,
            tenantSigned: false,
        }
    })
];


// Data fetching functions
export function getProperties(includeOccupied = false) {
  if (includeOccupied) {
    return properties;
  }
  return properties.filter(p => p.status === 'available');
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

export function updateRentalRequest(requestId: string, status: 'accepted' | 'declined', tenantId?: string) {
  const requestIndex = rentalRequests.findIndex(r => r.id === requestId);
  if (requestIndex !== -1) {
    rentalRequests[requestIndex].status = status;
    
    if (status === 'accepted' && tenantId) {
        const propertyIndex = properties.findIndex(p => p.id === rentalRequests[requestIndex].propertyId);
        if (propertyIndex !== -1) {
            properties[propertyIndex].status = 'occupied';
            properties[propertyIndex].currentTenantId = tenantId;
            properties[propertyIndex].leaseStartDate = new Date().toISOString().split('T')[0];
        }
    }
  }
}

export function getTransactionsByLandlord(landlordId: string) {
  return transactions.filter(t => t.landlordId === landlordId);
}

export function getTransactionsByTenantId(tenantId: string) {
  return transactions.filter(t => t.tenantId === tenantId);
}

export function getMaintenanceRequestsByLandlord(landlordId: string) {
  const landlordProperties = getPropertiesByLandlord(landlordId);
  const propertyIds = landlordProperties.map(p => p.id);
  return maintenanceRequests.filter(req => propertyIds.includes(req.propertyId));
}

export function getLeaseAgreementByPropertyId(propertyId: string) {
    return leaseAgreements.find(l => l.propertyId === propertyId);
}

export function getImagesByIds(ids: string[]) {
    return placeholderImages.placeholderImages.filter(p => ids.includes(p.id));
}

export function getConversationsByLandlord(landlordId: string): Conversation[] {
    const landlordProperties = getPropertiesByLandlord(landlordId);
    const tenants = landlordProperties
        .filter(p => p.status === 'occupied' && p.currentTenantId)
        .map(p => getUserById(p.currentTenantId!))
        .filter((item): item is User => item !== undefined);
    
    // Create mock conversation data from tenants
    return tenants.map((tenant, index) => {
        const lastMessageList = messages[tenant.id] || [];
        const lastMessage = lastMessageList.length > 0 ? lastMessageList[lastMessageList.length - 1] : { text: 'No messages yet', timestamp: '' };

        return {
            id: tenant.id,
            participant: tenant,
            lastMessage: lastMessage.text,
            lastMessageTimestamp: lastMessage.timestamp,
            // Mock unread count
            unreadCount: tenant.id === 'user-5' ? 1 : 0,
        };
    });
}

export function getMessagesByConversationId(conversationId: string): Message[] {
    return messages[conversationId] || [];
}
