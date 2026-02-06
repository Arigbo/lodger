import { NextResponse } from 'next/server';
import { dispatchBroadcast } from '@/lib/server-actions';
import { auth } from '@/firebase/admin';

const ALLOWED_ORIGINS = [
    'https://lodger-admin.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002'
];

function getCorsHeaders(origin: string | null) {
    const headers: Record<string, string> = {
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        headers['Access-Control-Allow-Origin'] = origin;
    }

    return headers;
}

export async function OPTIONS(request: Request) {
    const origin = request.headers.get('origin');
    return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin),
    });
}

export async function POST(request: Request) {
    const origin = request.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);

    try {
        // Basic Security Check: Ensure request comes from an authorized admin session
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await auth.verifyIdToken(idToken);
        
        const authorizedAdmins = ['admin@lodger.com', 'arigbo.lodger@gmail.com'];
        
        if (!decodedToken.email || !authorizedAdmins.includes(decodedToken.email)) {
            console.error(`Unauthorized broadcast attempt from: ${decodedToken.email}`);
            return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
        }

        const { title, message, target, type, sendEmail } = await request.json();

        if (!title || !message || !target) {
            return NextResponse.json({ error: 'Missing required payload' }, { status: 400, headers: corsHeaders });
        }

        const result = await dispatchBroadcast({
            title,
            message,
            target,
            type,
            sendEmail
        });

        return NextResponse.json(result, { headers: corsHeaders });
    } catch (error: any) {
        console.error('Broadcast API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' }, 
            { status: 500, headers: corsHeaders }
        );
    }
}
