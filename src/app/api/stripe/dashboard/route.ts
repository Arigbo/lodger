import { NextResponse } from 'next/server';
import { ApiError, requireProfile, requireUser, withApiHandler } from '@/lib/server/api';
import { getStripe } from '@/lib/server/stripe';

export const dynamic = 'force-dynamic';

/** Returns a one-time login link to the caller's own Stripe Express dashboard. */
export const POST = withApiHandler(async (request: Request) => {
  const { uid } = await requireUser(request);
  const { profile } = await requireProfile(uid, 'landlord');
  if (!profile.stripeAccountId) throw new ApiError(400, 'No Stripe account is connected yet.');

  const loginLink = await getStripe().accounts.createLoginLink(profile.stripeAccountId);
  return NextResponse.json({ url: loginLink.url });
});
