'use client';

export type CompressOptions = {
  /** Longest edge in pixels (default 1600 — sharp on retina listing cards, small on disk). */
  maxDimension?: number;
  /** 0–1 encoder quality (default 0.8). */
  quality?: number;
};

const OUTPUT_TYPES = ['image/webp', 'image/jpeg'] as const;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Resizes and re-encodes a photo in the browser before upload. This strips
 * EXIF metadata (including GPS location) and typically turns a 3–5 MB phone
 * photo into 150–400 KB. Non-images, GIFs and anything that fails to decode
 * are returned unchanged; the result is never larger than the original.
 */
export async function compressImage(file: File, { maxDimension = 1600, quality = 0.8 }: CompressOptions = {}): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const type of OUTPUT_TYPES) {
    const blob = await canvasToBlob(canvas, type, quality);
    // Some browsers silently fall back to PNG for unsupported types.
    if (blob && blob.type === type) {
      if (blob.size >= file.size && scale === 1) return file;
      const name = file.name.replace(/\.[^.]+$/, '') + (type === 'image/webp' ? '.webp' : '.jpg');
      return new File([blob], name, { type, lastModified: Date.now() });
    }
  }
  return file;
}
