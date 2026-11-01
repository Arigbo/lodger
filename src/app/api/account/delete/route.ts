import { NextResponse } from 'next/server';
import type { Query } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/firebase/admin';
import { ApiError, requireUser, withApiHandler } from '@/lib/server/api';

export const dynamic = 'force-dynamic';

const OPEN_LEASE_STATUSES = ['pending', 'active', 'terminating'];

async function deleteMatching(query: Query) {
  const snap = await query.get();
  // Batches are capped at 500 writes.
  for (let i = 0; i < snap.docs.length; i += 450) {
    const batch = getAdminDb().batch();
    snap.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return snap.size;
}

/**
 * Permanently deletes the caller's account: their profile, listings, drafts,
 * rental requests and sign-in. Refused while a lease is still open, so no
 * tenant or landlord is left with a half-finished tenancy. Payment records
 * and closed leases are kept for the other party's history.
 */
export const POST = withApiHandler(async (request: Request) => {
  const { uid } = await requireUser(request);
  const db = getAdminDb();

  const [asTenant, asLandlord] = await Promise.all([
    db.collection('leaseAgreements').where('tenantId', '==', uid).where('status', 'in', OPEN_LEASE_STATUSES).limit(1).get(),
    db.collection('leaseAgreements').where('landlordId', '==', uid).where('status', 'in', OPEN_LEASE_STATUSES).limit(1).get(),
  ]);
  if (!asTenant.empty || !asLandlord.empty) {
    throw new ApiError(
      409,
      'You still have an open lease. End or finish your tenancies before deleting your account.',
      'account/open-lease',
    );
  }

  await Promise.all([
    deleteMatching(db.collection('properties').where('landlordId', '==', uid)),
    deleteMatching(db.collection('propertyDrafts').where('landlordId', '==', uid)),
    deleteMatching(db.collection('rentalApplications').where('tenantId', '==', uid)),
    deleteMatching(db.collection('rentalApplications').where('landlordId', '==', uid)),
    deleteMatching(db.collection('notifications').where('userId', '==', uid)),
  ]);
  await db.collection('users').doc(uid).delete();
  await getAdminAuth().deleteUser(uid);

  return NextResponse.json({ deleted: true });
});
