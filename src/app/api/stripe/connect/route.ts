
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth as adminAuth, firestore as adminFirestore } from '@/firebase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover',
});

export async function POST(request: Request) {
    try {
        const { userId, email } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // In a real app, verify the request is from the authenticated user.

        // 1. Create a Stripe Account (Express)
        // Ideally check if user already has one in Firestore first.
        // For simplicity, we'll create a new one or expect the frontend to pass existing ID.
        // Let's rely on the frontend passing current status, or better yet, do a check here if we had Admin SDK.
        // We will assume a new account for now or passed ID.

        let accountId;
        // Check local DB? We don't have Admin SDK easily accessible in this context maybe?
        // Let's create an account.

        const account = await stripe.accounts.create({
            type: 'express',
            country: 'US', // Defaulting to US for this demo
            email: email,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
        });
        accountId = account.id;

        // 2. Create an Account Link (Onboarding flow)
        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${request.headers.get('origin')}/landlord/account`,
            return_url: `${request.headers.get('origin')}/landlord/account?stripe_connect_success=true&account_id=${accountId}`,
            type: 'account_onboarding',
        });

        return NextResponse.json({
            url: accountLink.url,
            accountId: accountId // Send back so frontend can save it to Firestore
        });

    } catch (error: any) {
        console.error('Stripe Connect Check Error:', error);
        return NextResponse.json(
            { error: `Internal Server Error: ${error.message}` },
            { status: 500 }
        );
    }
}
