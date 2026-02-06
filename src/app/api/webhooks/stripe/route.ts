import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { firestore as adminFirestore } from '@/firebase/admin';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);

            // Update Firestore
            if (adminFirestore) {
                const { landlordId, tenantId, propertyId, type, months, currency } = paymentIntent.metadata;

                try {
                    // 1. Record Transaction
                    await adminFirestore.collection('transactions').add({
                        landlordId,
                        tenantId,
                        propertyId,
                        amount: paymentIntent.amount / 100,
                        currency: currency || paymentIntent.currency,
                        months: parseInt(months as string) || 1,
                        date: new Date().toISOString(),
                        type: type || 'Rent',
                        paymentMethod: 'Stripe',
                        paymentIntentId: paymentIntent.id,
                        status: 'Completed',
                        webhookReceived: true
                    });

                    // 2. Logic for updating Lease status if applicable
                    // This depends on how the lease is linked. 
                    // Usually you'd pass a leaseId in metadata.
                } catch (dbError) {
                    console.error('Error updating Firestore from Webhook:', dbError);
                }
            }
            break;

        case 'payment_intent.payment_failed':
            const failedIntent = event.data.object as Stripe.PaymentIntent;
            console.log(`Payment failed: ${failedIntent.last_payment_error?.message}`);
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
}
