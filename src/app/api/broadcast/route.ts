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
        
        // Check if user has admin email or custom claim
        if (decodedToken.email !== 'admin@lodger.com') {
            // Optional: Check custom claims or firestore admin_users
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
