import { NextResponse } from 'next/server';
import { ApiError, readJson, requireUser, withApiHandler } from '@/lib/server/api';
import { notifyRejectedApplicants } from '@/lib/server/notifications';
import { getAdminDb } from '@/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * Tells other applicants that a property has been taken. Only the winning
 * tenant or the property's landlord may trigger it.
 */
export const POST = withApiHandler(async (request: Request) => {
  const { uid } = await requireUser(request);
  const { propertyId, winnerTenantId } = await readJson<{ propertyId?: string; winnerTenantId?: string }>(request);
  if (!propertyId || !winnerTenantId) throw new ApiError(400, 'propertyId and winnerTenantId are required.');

  const property = await getAdminDb().collection('properties').doc(propertyId).get();
  if (!property.exists) throw new ApiError(404, 'Property not found.');

  const data = property.data()!;
  if (uid !== winnerTenantId && uid !== data.landlordId) {
    throw new ApiError(403, 'You cannot notify applicants for this property.');
  }

  const count = await notifyRejectedApplicants(propertyId, winnerTenantId, data.title || 'Property');
  return NextResponse.json({ success: true, count });
});
