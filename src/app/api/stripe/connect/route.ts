import { NextResponse } from 'next/server';
import { requireProfile, requireUser, withApiHandler } from '@/lib/server/api';
import { getStripe } from '@/lib/server/stripe';
import { siteConfig } from '@/config/site';

export const dynamic = 'force-dynamic';

/** Creates (or reuses) the landlord's Stripe Express account and returns an onboarding link. */
export const POST = withApiHandler(async (request: Request) => {
  const { uid, email } = await requireUser(request);
  const { ref, profile } = await requireProfile(uid, 'landlord');
  const stripe = getStripe();

  let accountId = profile.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: process.env.STRIPE_CONNECT_COUNTRY || 'US',
      email: email || profile.email,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { userId: uid },
    });
    accountId = account.id;
    await ref.update({ stripeAccountId: accountId });
  }

  const origin = request.headers.get('origin') || siteConfig.url;
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/landlord/account`,
    return_url: `${origin}/landlord/account?stripe_connect_success=true`,
    type: 'account_onboarding',
  });

  return NextResponse.json({ url: accountLink.url, accountId });
});
