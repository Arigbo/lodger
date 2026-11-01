import { NextResponse } from 'next/server';
import { requireProfile, requireUser, withApiHandler } from '@/lib/server/api';
import { getStripe } from '@/lib/server/stripe';

export const dynamic = 'force-dynamic';

type Status = 'incomplete' | 'pending' | 'active';

/** Reports the caller's Stripe onboarding state and keeps Firestore in sync. */
export const POST = withApiHandler(async (request: Request) => {
  const { uid } = await requireUser(request);
  const { ref, profile } = await requireProfile(uid, 'landlord');

  if (!profile.stripeAccountId) {
    return NextResponse.json({ status: 'incomplete', message: 'Connect a Stripe account to receive payments.' });
  }

  const account = await getStripe().accounts.retrieve(profile.stripeAccountId);
  const onboardingComplete = account.details_submitted;
  const chargesEnabled = account.charges_enabled;
  const transfersEnabled = account.capabilities?.transfers === 'active';

  let status: Status = 'pending';
  let message = 'Your account setup is in progress.';
  if (!onboardingComplete) {
    status = 'incomplete';
    message = 'Please complete your Stripe onboarding to receive payments.';
  } else if (!transfersEnabled) {
    message = 'Your account is being verified. Transfers will be enabled soon.';
  } else if (chargesEnabled) {
    status = 'active';
    message = 'Your account is fully set up and ready to receive payments.';
  }

  if (profile.stripeDetailsSubmitted !== onboardingComplete) {
    await ref.update({ stripeDetailsSubmitted: onboardingComplete });
  }

  return NextResponse.json({
    status,
    message,
    details: { onboardingComplete, chargesEnabled, transfersEnabled },
  });
});
