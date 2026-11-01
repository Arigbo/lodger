import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ApiError, readJson, requireUser, withApiHandler } from '@/lib/server/api';
import { checkRateLimit, moderationRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']);
/** Remote images may only be fetched from our own storage bucket (prevents SSRF). */
const ALLOWED_IMAGE_HOSTS = new Set(['firebasestorage.googleapis.com', 'storage.googleapis.com', 'res.cloudinary.com']);
const CACHE_TTL = 60 * 60 * 1000;
const cache = new Map<string, { result: Analysis; timestamp: number }>();

type Analysis = {
  safety: 'SAFE' | 'UNSAFE';
  context: 'RELEVANT' | 'IRRELEVANT';
  labels: string[];
  reason: string;
};

const PROMPT = `Analyze this image for an apartment rental listing.
1. Safety: Is there any inappropriate content (nudity, violence, drugs, or sensitive personal info)? (SAFE or UNSAFE)
2. Context: Does this look like it belongs in a property listing (room, kitchen, bathroom, exterior, furniture)? (RELEVANT or IRRELEVANT)
3. Labels: A short list of detected room types or objects.
4. Reason: Briefly explain if it's UNSAFE or IRRELEVANT.
Return JSON only: {"safety":"SAFE"|"UNSAFE","context":"RELEVANT"|"IRRELEVANT","labels":[],"reason":""}`;

async function stripMetadata(buffer: Buffer): Promise<Buffer> {
  try {
    const sharp = (await import('sharp')).default;
    return await sharp(buffer).rotate().jpeg({ quality: 90 }).toBuffer();
  } catch (error) {
    console.error('Metadata stripping failed:', error);
    return buffer;
  }
}

async function loadImage(imageBase64?: string, imageUrl?: string): Promise<Buffer> {
  if (imageBase64) return Buffer.from(imageBase64, 'base64');

  let url: URL;
  try {
    url = new URL(imageUrl!);
  } catch {
    throw new ApiError(400, 'Invalid image URL.');
  }
  if (url.protocol !== 'https:' || !ALLOWED_IMAGE_HOSTS.has(url.hostname)) {
    throw new ApiError(400, 'Images must be uploaded to Lodger storage first.');
  }
  const response = await fetch(url, { redirect: 'error' });
  if (!response.ok) throw new ApiError(400, 'Could not download the image.');
  return Buffer.from(await response.arrayBuffer());
}

export const POST = withApiHandler(async (request: Request) => {
  const { uid } = await requireUser(request);

  const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ApiError(503, 'Image moderation is currently unavailable.');

  const limit = await checkRateLimit(moderationRateLimit, uid);
  if (!limit.success) throw new ApiError(429, 'Too many image checks. Please wait a minute and try again.');

  const { imageBase64, imageUrl, mimeType } = await readJson<{ imageBase64?: string; imageUrl?: string; mimeType?: string }>(request);
  if (!imageBase64 && !imageUrl) throw new ApiError(400, 'No image provided.');
  if (mimeType && !ALLOWED_MIME.has(mimeType)) throw new ApiError(400, 'Unsupported image type.');

  const cacheKey = `${(imageBase64 || imageUrl)!.slice(0, 64)}:${(imageBase64 || imageUrl)!.length}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return NextResponse.json({ ...cached.result, cached: true });

  const raw = await loadImage(imageBase64, imageUrl);
  if (raw.byteLength > MAX_BYTES) throw new ApiError(413, 'Image is too large (max 8 MB).');
  const image = await stripMetadata(raw);

  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  });

  let analysis: Analysis = { safety: 'SAFE', context: 'RELEVANT', labels: [], reason: '' };
  try {
    const result = await model.generateContent([PROMPT, { inlineData: { data: image.toString('base64'), mimeType: 'image/jpeg' } }]);
    const match = result.response.text().match(/\{[\s\S]*\}/);
    if (match) analysis = { ...analysis, ...JSON.parse(match[0]) };
  } catch (error) {
    const message = (error as Error).message || '';
    console.error('Gemini moderation failed:', message);
    if (message.includes('quota')) throw new ApiError(503, 'Moderation quota exceeded. Please try again later.');
    throw new ApiError(502, 'Image moderation failed. Please try again.');
  }

  cache.set(cacheKey, { result: analysis, timestamp: Date.now() });
  if (cache.size > 500) {
    const now = Date.now();
    for (const [key, value] of cache) if (now - value.timestamp > CACHE_TTL) cache.delete(key);
  }

  return NextResponse.json(analysis);
});
