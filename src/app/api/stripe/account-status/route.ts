
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover',
});

export async function POST(request: Request) {
    try {
        const { accountId } = await request.json();

        if (!accountId) {
            return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
        }

        // Retrieve the Stripe account details
        const account = await stripe.accounts.retrieve(accountId);

        // Check onboarding and capability status
        const isOnboardingComplete = account.details_submitted;
        const canAcceptPayments = account.charges_enabled;
        const transfersCapability = account.capabilities?.transfers;
        const hasTransfers = transfersCapability === 'active';

        // Determine overall status
        let status: 'incomplete' | 'pending' | 'active' = 'incomplete';
        let message = '';

        if (!isOnboardingComplete) {
            status = 'incomplete';
            message = 'Please complete your Stripe onboarding to receive payments.';
        } else if (!hasTransfers) {
            status = 'pending';
            message = 'Your account is being verified. Transfer capabilities will be enabled soon.';
        } else if (canAcceptPayments && hasTransfers) {
            status = 'active';
            message = 'Your account is fully set up and ready to receive payments.';
        } else {
            status = 'pending';
            message = 'Your account setup is in progress.';
        }

        return NextResponse.json({
            status,
            message,
            details: {
                onboardingComplete: isOnboardingComplete,
                chargesEnabled: canAcceptPayments,
                transfersEnabled: hasTransfers,
                transfersCapability: transfersCapability,
            }
        });

    } catch (error: any) {
        console.error('Stripe Account Status Error:', error);

        // Handle specific Stripe errors
        if (error.type === 'StripeInvalidRequestError') {
            return NextResponse.json(
                { error: 'Invalid Stripe account ID' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: `Internal Server Error: ${error.message}` },
            { status: 500 }
        );
    }
}
