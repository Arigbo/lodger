/**
 * Hosts whose images are run through the Next.js image optimiser.
 * Shared by next.config.ts (remotePatterns) and `optimizedImageProps()`, so an
 * image from any other host is still rendered — just without optimisation —
 * instead of failing with "hostname is not configured".
 */
export const OPTIMIZED_IMAGE_HOSTS = [
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
  'lh3.googleusercontent.com', // Google account avatars
  'res.cloudinary.com', // default media provider
  'images.unsplash.com',
  'placehold.co',
  'picsum.photos',
  'fastly.picsum.photos',
] as const;

const hostSet = new Set<string>(OPTIMIZED_IMAGE_HOSTS);

/** True for local paths and for remote URLs on an allowed host. */
export function canOptimizeImage(src: string | undefined | null): boolean {
  if (!src) return false;
  if (src.startsWith('/')) return !src.startsWith('//');
  if (src.startsWith('blob:') || src.startsWith('data:')) return false;
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && hostSet.has(url.hostname);
  } catch {
    return false;
  }
}

/** Spread onto `next/image`: `<Image {...optimizedImageProps(src)} … />`. */
export function optimizedImageProps(src: string) {
  return { src, unoptimized: !canOptimizeImage(src) };
}
