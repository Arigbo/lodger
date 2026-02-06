import { NextResponse } from 'next/server';
import { dispatchBroadcast } from '@/lib/server-actions';
import { auth } from '@/firebase/admin';

export async function POST(request: Request) {
    try {
        // Basic Security Check: Ensure request comes from an authorized admin session
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await auth.verifyIdToken(idToken);
        
        const authorizedAdmins = ['admin@lodger.com', 'arigbo.lodger@gmail.com']; // Expanded list
        
        if (!decodedToken.email || !authorizedAdmins.includes(decodedToken.email)) {
            console.error(`Unauthorized broadcast attempt from: ${decodedToken.email}`);
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { title, message, target, type, sendEmail } = await request.json();

        if (!title || !message || !target) {
            return NextResponse.json({ error: 'Missing required payload' }, { status: 400 });
        }

        const result = await dispatchBroadcast({
            title,
            message,
            target,
            type,
            sendEmail
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Broadcast API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
