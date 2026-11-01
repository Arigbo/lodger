/**
 * Seeds the local Firebase emulators with demo users and data.
 *
 *   npm run emulators        # terminal 1
 *   npm run seed             # terminal 2
 *   npm run dev:emulators    # terminal 3 → http://localhost:3000
 *
 * Demo logins (password: password123):
 *   student@demo.lodger   ·   landlord@demo.lodger
 *
 * Refuses to run unless FIRESTORE_EMULATOR_HOST is set, so it can never
 * touch a real project.
 */
import admin from 'firebase-admin';

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
if (!process.env.FIRESTORE_EMULATOR_HOST.startsWith('127.0.0.1') && !process.env.FIRESTORE_EMULATOR_HOST.startsWith('localhost')) {
  throw new Error('Refusing to seed: FIRESTORE_EMULATOR_HOST must point at a local emulator.');
}

admin.initializeApp({ projectId: 'demo-lodger' });
const db = admin.firestore();
const auth = admin.auth();

const now = new Date();
const daysAgo = (n) => new Date(now.getTime() - n * 86_400_000).toISOString();
const daysFromNow = (n) => new Date(now.getTime() + n * 86_400_000).toISOString();
const img = (id) => `https://images.unsplash.com/${id}?q=80&w=1600&auto=format&fit=crop`;

async function upsertUser({ uid, email, name, role, ...profile }) {
  try {
    await auth.createUser({ uid, email, password: 'password123', displayName: name, emailVerified: true });
  } catch (error) {
    if (error.code !== 'auth/uid-already-exists' && error.code !== 'auth/email-already-exists') throw error;
  }
  await db.doc(`users/${uid}`).set({
    id: uid, email, name, role, profileImageUrl: '', createdAt: daysAgo(90), country: 'Nigeria', currency: 'NGN', ...profile,
  });
}

const landlordId = 'demo-landlord';
const studentId = 'demo-student';
const student2Id = 'demo-student-2';

await upsertUser({ uid: landlordId, email: 'landlord@demo.lodger', name: 'Grace Okafor', role: 'landlord', legalName: 'Grace A. Okafor', phone: '+2348000000001', bio: 'I manage student homes around Akoka and Yaba.' });
await upsertUser({ uid: studentId, email: 'student@demo.lodger', name: 'Tunde Bello', role: 'student', phone: '+2348000000002', school: 'University of Lagos', state: 'Lagos', city: 'Lagos', bookmarkedPropertyIds: ['demo-prop-2', 'demo-prop-3'] });
await upsertUser({ uid: student2Id, email: 'amaka@demo.lodger', name: 'Amaka Eze', role: 'student', school: 'University of Lagos', state: 'Lagos' });

const base = {
  landlordId, currency: 'NGN', rules: ['No smoking indoors', 'Quiet hours 10pm – 7am', 'No pets'],
  location: { address: '', city: 'Lagos', state: 'Lagos', country: 'Nigeria', zip: '101245', school: 'University of Lagos', lat: 6.5158, lng: 3.3898 },
};
const properties = [
  { id: 'demo-prop-1', title: 'Sunny self-contain near UNILAG gate', type: 'Self Contain', price: 45000, bedrooms: 1, bathrooms: 1, area: 280, status: 'occupied', currentTenantId: studentId, leaseStartDate: daysAgo(60).slice(0, 10), images: [img('photo-1522708323590-d24dbb6b0267')], amenities: ['Furnished', 'Wi-Fi', 'Secure Entry'], address: '12 University Road, Akoka' },
  { id: 'demo-prop-2', title: 'Modern 2-bed flat in Yaba', type: 'Flat', price: 120000, bedrooms: 2, bathrooms: 2, area: 750, status: 'available', images: [img('photo-1502672260266-1c1ef2d93688')], amenities: ['Furnished', 'Wi-Fi', 'In-unit Laundry', 'Parking Spot'], address: '4 Herbert Macaulay Way, Yaba' },
  { id: 'demo-prop-3', title: 'Quiet studio for postgraduates', type: 'Studio', price: 60000, bedrooms: 1, bathrooms: 1, area: 350, status: 'available', images: [img('photo-1505691938895-1758d7feb511')], amenities: ['Wi-Fi', 'All Utilities Included'], address: '7 Akoka Close, Akoka' },
  { id: 'demo-prop-4', title: 'Shared duplex with study room', type: 'Duplex', price: 85000, bedrooms: 3, bathrooms: 2, area: 1200, status: 'available', images: [img('photo-1560448204-e02f11c3d0e2')], amenities: ['Furnished', 'Gym Access', 'Private Yard'], address: '21 Abule Oja Street, Yaba' },
  { id: 'demo-prop-5', title: 'Budget room close to campus shuttle', type: 'Self Contain', price: 30000, bedrooms: 1, bathrooms: 1, area: 220, status: 'available', images: [img('photo-1493809842364-78817add7ffb')], amenities: ['Secure Entry'], address: '3 St. Finbarr’s Road, Akoka' },
];
for (const { id, address, ...p } of properties) {
  await db.doc(`properties/${id}`).set({
    ...base, ...p, id, location: { ...base.location, address },
    description: `${p.title}. A clean, well-maintained ${p.type.toLowerCase()} within walking distance of the University of Lagos, with reliable power and water.`,
    createdAt: daysAgo(80), updatedAt: daysAgo(5),
  });
}

const leaseId = 'demo-lease-1';
await db.doc(`leaseAgreements/${leaseId}`).set({
  id: leaseId, propertyId: 'demo-prop-1', landlordId, tenantId: studentId, currency: 'NGN',
  leaseText: 'This lease agreement is made between Grace A. Okafor (Landlord) and Tunde Bello (Tenant) for the property at 12 University Road, Akoka…',
  landlordSigned: true, tenantSigned: true, startDate: daysAgo(60), endDate: daysFromNow(305), status: 'active',
  paymentMethod: 'stripe', paymentConfirmed: true, createdAt: daysAgo(62),
});

const applications = [
  { id: 'demo-app-1', propertyId: 'demo-prop-2', tenantId: student2Id, status: 'pending', messageToLandlord: 'Hi! I am a 300-level student looking to move in next month.', applicationDate: daysAgo(2) },
  { id: 'demo-app-2', propertyId: 'demo-prop-3', tenantId: studentId, status: 'pending', messageToLandlord: 'Is the studio still available for a postgraduate student?', applicationDate: daysAgo(1) },
];
for (const a of applications) await db.doc(`rentalApplications/${a.id}`).set({ ...a, landlordId });

const transactions = [
  { id: 'demo-tx-1', amount: 45000, date: daysAgo(60), type: 'Lease Activation', months: 1 },
  { id: 'demo-tx-2', amount: 45000, date: daysAgo(30), type: 'Rent', months: 1 },
  { id: 'demo-tx-3', amount: 45000, date: daysAgo(1), type: 'Rent', months: 1 },
];
for (const t of transactions) {
  await db.doc(`transactions/${t.id}`).set({ ...t, landlordId, tenantId: studentId, propertyId: 'demo-prop-1', currency: 'NGN', status: 'Completed', paymentMethod: 'Stripe' });
}

await db.doc('maintenanceRequests/demo-mr-1').set({
  id: 'demo-mr-1', propertyId: 'demo-prop-1', landlordId, tenantId: studentId, title: 'Leaking kitchen tap',
  description: 'The kitchen tap has been dripping constantly since Monday.', category: 'Plumbing', status: 'Pending', priority: 'Medium', requestDate: daysAgo(3),
});
await db.doc('maintenanceRequests/demo-mr-2').set({
  id: 'demo-mr-2', propertyId: 'demo-prop-1', landlordId, tenantId: studentId, title: 'Bedroom socket not working',
  description: 'The socket beside the desk stopped working.', category: 'Electrical', status: 'Completed', priority: 'High', requestDate: daysAgo(20), completedDate: daysAgo(18),
});

const convo = [
  [studentId, 'Good evening ma, the kitchen tap is leaking again.', 26],
  [landlordId, 'Thanks Tunde, I will send the plumber tomorrow morning.', 25],
  [studentId, 'Thank you!', 24],
];
for (const [i, [senderId, text, hoursAgo]] of convo.entries()) {
  await db.doc(`messages/demo-msg-${i}`).set({
    senderId, recipientId: senderId === studentId ? landlordId : studentId, text, read: i < 2,
    participantIds: [studentId, landlordId].sort(),
    timestamp: admin.firestore.Timestamp.fromDate(new Date(now.getTime() - hoursAgo * 3_600_000)),
  });
}

const notifications = [
  [landlordId, 'New rental request', 'Amaka Eze wants to rent Modern 2-bed flat in Yaba.', 'info', '/landlord/requests', 2],
  [landlordId, 'New maintenance request', 'Tunde Bello reported a leaking kitchen tap.', 'warning', '/landlord/maintenance', 72],
  [studentId, 'Payment confirmed', 'Your rent for Sunny self-contain near UNILAG gate was received.', 'success', '/student/tenancy', 24],
  [studentId, 'Welcome to Lodger', 'Your account is ready.', 'success', '/student/account', 2000],
];
for (const [i, [userId, title, message, type, link, hoursAgo]] of notifications.entries()) {
  await db.doc(`notifications/demo-notif-${i}`).set({
    userId, title, message, type, link, read: i === 3, createdAt: new Date(now.getTime() - hoursAgo * 3_600_000).toISOString(),
  });
}

await db.doc('propertyReviews/demo-review-1').set({
  propertyId: 'demo-prop-1', tenantId: studentId, tenantName: 'Tunde Bello', rating: 5,
  comment: 'Great landlord, quick to fix issues and the room is very close to campus.', reviewDate: daysAgo(10),
});

console.log('✔ Seeded demo data. Log in with student@demo.lodger or landlord@demo.lodger (password123).');
process.exit(0);
