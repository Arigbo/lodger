import { NextResponse } from 'next/server';
import { ApiError, readJson, requireUser, withApiHandler } from '@/lib/server/api';
import { dispatchBroadcast, type BroadcastTarget } from '@/lib/server/notifications';
import { getAdminDb } from '@/firebase/admin';
import { siteConfig } from '@/config/site';

export const dynamic = 'force-dynamic';

const TARGETS: BroadcastTarget[] = ['all', 'landlords', 'students', 'no-stripe'];

/** Origins allowed to call this endpoint (the separate admin console). */
const allowedOrigins = new Set(
  [
    siteConfig.url,
    ...(process.env.ADMIN_ALLOWED_ORIGINS || 'https://lodger-admin.vercel.app').split(','),
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'] : []),
  ].map((o) => o.trim()).filter(Boolean),
);

/** Admin accounts by email, configurable via ADMIN_EMAILS (comma-separated). */
const adminEmails = new Set(
  (process.env.ADMIN_EMAILS || 'admin@lodger.com,arigbo.lodger@gmail.com,arigbo@gmail.com,support@lodger.com,info@lodger.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('origin');
  return {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
    ...(origin && allowedOrigins.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
  };
}

async function isAdmin(uid: string, email?: string) {
  if (email && adminEmails.has(email.toLowerCase())) return true;
  const db = getAdminDb();
  const [user, adminRecord] = await Promise.all([
    db.collection('users').doc(uid).get(),
    db.collection('admin_users').doc(uid).get(),
  ]);
  return user.data()?.role === 'admin' || adminRecord.exists;
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export const POST = withApiHandler(
  async (request: Request) => {
    const { uid, email } = await requireUser(request);
    if (!(await isAdmin(uid, email))) throw new ApiError(403, 'Forbidden');

    const { title, message, target, type, sendEmail } = await readJson<{
      title?: string;
      message?: string;
      target?: BroadcastTarget;
      type?: string;
      sendEmail?: boolean;
    }>(request);

    if (!title?.trim() || !message?.trim() || !target || !TARGETS.includes(target)) {
      throw new ApiError(400, 'title, message and a valid target are required.');
    }

    const result = await dispatchBroadcast({ title: title.trim(), message: message.trim(), target, type, sendEmail: !!sendEmail });
    return NextResponse.json(result, { headers: corsHeaders(request) });
  },
  { headers: corsHeaders },
);
