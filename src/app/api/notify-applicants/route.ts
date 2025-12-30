import { NextResponse } from 'next/server';
import { notifyRejectedApplicants } from '@/lib/server-actions';

export async function POST(request: Request) {
    try {
        const { propertyId, winnerTenantId, propertyTitle } = await request.json();

        if (!propertyId || !winnerTenantId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Trigger background notification (don't await for response time optimization if preferred, 
        // but Vercel function limits suggest awaiting is safer to ensure execution)
        await notifyRejectedApplicants(propertyId, winnerTenantId, propertyTitle || 'Property');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
