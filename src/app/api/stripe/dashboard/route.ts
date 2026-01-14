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

        const loginLink = await stripe.accounts.createLoginLink(accountId);

        return NextResponse.json({ url: loginLink.url });

    } catch (error: any) {
        console.error('Stripe Login Link Error:', error);
        return NextResponse.json(
            { error: `Internal Server Error: ${error.message}` },
            { status: 500 }
        );
    }
}
