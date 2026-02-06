import { NextResponse } from 'next/server';
import { dispatchBroadcast } from '@/lib/server-actions';
import { auth, db } from '@/firebase/admin';

const ALLOWED_ORIGINS = [
    'https://lodger-admin.vercel.app',
    'https://lodger-ancient.vercel.app',
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
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            console.error('Missing or malformed Authorization header');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        // Diagnostic log for Firebase Admin
        const hasKey = !!process.env.FIREBASE_PRIVATE_KEY;
        const hasEmail = !!process.env.FIREBASE_CLIENT_EMAIL;
        console.log(`[Broadcast API] Auth Check - HasKey: ${hasKey}, HasEmail: ${hasEmail}`);

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await auth.verifyIdToken(idToken);
        
        const userEmail = decodedToken.email?.toLowerCase();
        
        const authorizedAdmins = [
            'admin@lodger.com', 
            'arigbo.lodger@gmail.com',
            'arigbo@gmail.com',
            'support@lodger.com',
            'info@lodger.com'
        ];
        
        console.log('[Broadcast] Authorization check:', {
            email: userEmail,
            uid: decodedToken.uid,
            inWhitelist: authorizedAdmins.includes(userEmail || '')
        });
        
        let isAuthorized = userEmail && authorizedAdmins.includes(userEmail);

        // Fallback: Check for 'admin' role in Firestore
        if (!isAuthorized) {
            try {
                const userDoc = await db.collection('users').doc(decodedToken.uid).get();
                const hasAdminRole = userDoc.exists && userDoc.data()?.role === 'admin';
                console.log('[Broadcast] Firestore role check:', {
                    uid: decodedToken.uid,
                    docExists: userDoc.exists,
                    role: userDoc.data()?.role,
                    hasAdminRole
                });
                if (hasAdminRole) {
                    isAuthorized = true;
                }
            } catch (err) {
                console.error('Role check failed:', err);
            }
        }

        if (!isAuthorized) {
            console.error(`Forbidden: [${userEmail || 'No Email'}] (UID: ${decodedToken.uid}) is not authorized.`);
            return NextResponse.json({ 
                error: 'Forbidden', 
                debug: {
                    email: userEmail,
                    uid: decodedToken.uid,
                    whitelist: authorizedAdmins.includes(userEmail || ''),
                    fallbackRoleCheck: !authorizedAdmins.includes(userEmail || '')
                }
            }, { status: 403, headers: corsHeaders });
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
