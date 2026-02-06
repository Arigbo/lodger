
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth as adminAuth, firestore as adminFirestore } from '@/firebase/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover',
});

export async function POST(request: Request) {
    try {
        const { userId, email } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // 1. Verify Authentication & Existence
        if (!adminAuth || !adminFirestore) {
            return NextResponse.json({ error: 'Server initialization error' }, { status: 500 });
        }

        const userDocRef = adminFirestore.collection('users').doc(userId);
        const userDoc = await userDocRef.get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userData = userDoc.data();
        let accountId = userData?.stripeAccountId;

        // 2. Create or Retrieve Stripe Account
        if (!accountId) {
            const account = await stripe.accounts.create({
                type: 'express',
                country: 'US', // Defaulting to US for this demo, could be dynamic based on userData.country
                email: email || userData?.email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                metadata: {
                    userId: userId
                }
            });
            accountId = account.id;

            // Save to Firestore immediately
            await userDocRef.update({ stripeAccountId: accountId });
        }

        // 3. Create an Account Link (Onboarding flow)
        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${request.headers.get('origin')}/landlord/account`,
            return_url: `${request.headers.get('origin')}/landlord/account?stripe_connect_success=true&account_id=${accountId}`,
            type: 'account_onboarding',
        });

        return NextResponse.json({
            url: accountLink.url,
            accountId: accountId
        });

    } catch (error: any) {
        console.error('Stripe Connect Check Error:', error);
        return NextResponse.json(
            { error: `Internal Server Error: ${error.message}` },
            { status: 500 }
        );
    }
}
