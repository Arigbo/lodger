import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { firestore as adminFirestore } from '@/firebase/server';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover',
});

export async function POST(request: Request) {
    try {
        const { amount, currency, landlordId, metadata } = await request.json();

        if (!landlordId) {
            return NextResponse.json({ error: 'Landlord ID required' }, { status: 400 });
        }

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        console.log('Creating PaymentIntent for landlord:', landlordId, 'Amount:', amount);

        // 1. Fetch Landlord's Stripe Account ID from Firestore securely
        let destinationAccountId: string | undefined;

        if (adminFirestore) {
            const landlordDoc = await adminFirestore.collection('users').doc(landlordId).get();
            if (landlordDoc.exists) {
                destinationAccountId = landlordDoc.data()?.stripeAccountId;
            }
        }

        if (!destinationAccountId) {
            console.warn(`Landlord ${landlordId} has no Stripe Account ID connected.`);
            // Optionally: Fail if we require Stripe Connect, or proceed as platform payment
            // For now, let's proceed but log it.
        }

        const paymentIntentData: Stripe.PaymentIntentCreateParams = {
            amount: Math.round(amount * 100),
            currency: (currency || 'usd').toLowerCase(),
            automatic_payment_methods: { enabled: true },
            metadata: {
                ...metadata,
                landlordId,
            }
        };

        // Only add transfer_data if destinationAccountId is provided
        if (destinationAccountId) {
            paymentIntentData.transfer_data = {
                destination: destinationAccountId,
            };
            // Platform Fee Application (Optional: e.g., 5%)
            // paymentIntentData.application_fee_amount = Math.round(amount * 100 * 0.05);
        }

        try {
            const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
            return NextResponse.json({
                clientSecret: paymentIntent.client_secret,
                destinationAccountId: destinationAccountId
            });
        } catch (stripeError: any) {
            // Handle specific Stripe errors
            console.error('Stripe Error:', stripeError);

            if (stripeError.code === 'insufficient_capabilities_for_transfer' && destinationAccountId) {
                // Landlord hasn't completed onboarding or lacks transfer capability
                return NextResponse.json({
                    error: 'Landlord not ready for payments',
                    message: 'The property owner needs to complete their Stripe setup to receive payments.'
                }, { status: 400 });
            }

            throw stripeError;
        }
    } catch (error: any) {
        console.error('Create Payment Intent Internal Error:', error);
        return NextResponse.json(
            { error: `Internal Server Error: ${error.message}` },
            { status: 500 }
        );
    }
}
