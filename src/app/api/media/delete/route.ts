import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { ApiError, readJson, requireUser, withApiHandler } from '@/lib/server/api';

export const dynamic = 'force-dynamic';

/** Deletes a Cloudinary asset, but only one inside the caller's own folder. */
export const POST = withApiHandler(async (request: Request) => {
  const { uid } = await requireUser(request);
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new ApiError(503, 'Media storage is not configured.');

  const { url } = await readJson<{ url?: string }>(request);
  // e.g. https://res.cloudinary.com/<cloud>/image/upload/v123/lodger/properties/<uid>/<id>/kitchen.webp
  const match = url?.match(/^https:\/\/res\.cloudinary\.com\/([^/]+)\/(image|video|raw)\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?$/i);
  if (!match || match[1] !== cloudName) throw new ApiError(400, 'Not a media URL from this project.');
  const [, , resourceType, publicId] = match;
  if (!publicId.startsWith('lodger/') || publicId.split('/')[2] !== uid) {
    throw new ApiError(403, 'You can only delete your own files.');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash('sha1').update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`).digest('hex');
  const body = new URLSearchParams({ public_id: publicId, timestamp: String(timestamp), api_key: apiKey, signature });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, { method: 'POST', body });
  if (!response.ok) throw new ApiError(502, 'Could not delete the file.');
  return NextResponse.json({ ok: true });
});
