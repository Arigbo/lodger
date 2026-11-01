import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getAdminDb } from '@/firebase/admin';
import { getStripe } from '@/lib/server/stripe';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  if (!secret || !signature) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', (error as Error).message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await recordPayment(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
        console.warn(`Payment ${intent.id} failed: ${intent.last_payment_error?.message}`);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    // Return 500 so Stripe retries the delivery.
    console.error(`Failed to process Stripe event ${event.id}:`, error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/** Records a transaction once per PaymentIntent (webhooks can be redelivered). */
async function recordPayment(intent: Stripe.PaymentIntent) {
  const { landlordId, tenantId, propertyId, type, months, currency } = intent.metadata;
  const ref = getAdminDb().collection('transactions').doc(`stripe_${intent.id}`);

  await getAdminDb().runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return;
    tx.set(ref, {
      landlordId: landlordId ?? null,
      tenantId: tenantId ?? null,
      propertyId: propertyId ?? null,
      amount: intent.amount / 100,
      currency: currency || intent.currency,
      months: parseInt(months ?? '1', 10) || 1,
      date: new Date().toISOString(),
      type: type || 'Rent',
      paymentMethod: 'Stripe',
      paymentIntentId: intent.id,
      status: 'Completed',
      webhookReceived: true,
    });
  });
}
