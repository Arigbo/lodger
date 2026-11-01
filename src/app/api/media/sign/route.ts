import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { ApiError, readJson, requireUser, withApiHandler } from '@/lib/server/api';

export const dynamic = 'force-dynamic';

/**
 * Signs a direct-to-Cloudinary upload for the signed-in user. Files never
 * pass through this server, and uploads are confined to the user's own
 * folder, so the Cloudinary secret is never exposed to the browser.
 */
export const POST = withApiHandler(async (request: Request) => {
  const { uid } = await requireUser(request);
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new ApiError(503, 'Media uploads are not configured.');

  const { path } = await readJson<{ path?: string }>(request);
  if (!path || !/^[\w./-]{1,200}$/.test(path) || path.includes('..')) throw new ApiError(400, 'Invalid upload path.');

  // The first segment is the area (properties, users); the user's ID is
  // always enforced as the owner folder regardless of what the client sent.
  const [area, ...rest] = path.split('/').filter(Boolean);
  if (!['properties', 'users'].includes(area)) throw new ApiError(400, 'Invalid upload area.');
  const withoutOwner = rest[0] === uid ? rest.slice(1) : rest;
  const publicId = withoutOwner.join('/') || `${Date.now()}`;
  const folder = `lodger/${area}/${uid}`;

  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = createHash('sha1').update(toSign + apiSecret).digest('hex');

  return NextResponse.json({ cloudName, apiKey, timestamp, signature, folder, publicId });
});
