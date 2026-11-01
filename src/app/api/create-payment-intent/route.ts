import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { ApiError, readJson, requireUser, withApiHandler } from '@/lib/server/api';
import { getStripe } from '@/lib/server/stripe';
import { getAdminDb } from '@/firebase/admin';

export const dynamic = 'force-dynamic';

const MAX_AMOUNT = 1_000_000; // sanity cap in major currency units

type Body = {
  amount?: number;
  currency?: string;
  landlordId?: string;
  metadata?: Record<string, string | number | undefined>;
};

/**
 * Creates a PaymentIntent for rent. The tenant is always the signed-in user,
 * and funds are routed to the landlord's connected account when available.
 */
export const POST = withApiHandler(async (request: Request) => {
  const { uid } = await requireUser(request);
  const { amount, currency = 'usd', landlordId, metadata = {} } = await readJson<Body>(request);

  if (!landlordId) throw new ApiError(400, 'Landlord ID is required.');
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
    throw new ApiError(400, 'Invalid payment amount.');
  }
  if (!/^[a-z]{3}$/i.test(currency)) throw new ApiError(400, 'Invalid currency.');

  const db = getAdminDb();
  const propertyId = typeof metadata.propertyId === 'string' ? metadata.propertyId : undefined;
  if (propertyId) {
    const property = await db.collection('properties').doc(propertyId).get();
    if (!property.exists || property.data()?.landlordId !== landlordId) {
      throw new ApiError(400, 'Property and landlord do not match.');
    }
  }

  const landlord = await db.collection('users').doc(landlordId).get();
  const destination: string | undefined = landlord.data()?.stripeAccountId;

  // Stripe metadata values must be strings.
  const cleanMetadata = Object.fromEntries(
    Object.entries({ ...metadata, landlordId, tenantId: uid })
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v).slice(0, 500)]),
  );

  const params: Stripe.PaymentIntentCreateParams = {
    amount: Math.round(amount * 100),
    currency: currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    metadata: cleanMetadata,
    ...(destination ? { transfer_data: { destination } } : {}),
  };

  try {
    const intent = await getStripe().paymentIntents.create(params);
    return NextResponse.json({ clientSecret: intent.client_secret });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'insufficient_capabilities_for_transfer') {
      throw new ApiError(400, 'The property owner needs to finish their Stripe setup before accepting card payments.');
    }
    throw error;
  }
});
