'use client';

import { getApp } from 'firebase/app';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { apiPost } from '@/lib/api-client';
import { compressImage } from './compress-image';

/**
 * Where uploaded photos and videos are stored. Switch with
 * NEXT_PUBLIC_MEDIA_PROVIDER=cloudinary (see docs/media-storage.md).
 */
export type MediaProvider = 'firebase' | 'cloudinary';

export const mediaProvider: MediaProvider =
  process.env.NEXT_PUBLIC_MEDIA_PROVIDER === 'cloudinary' ? 'cloudinary' : 'firebase';

type UploadOptions = {
  /** Skip client-side compression (e.g. already-optimised files). */
  raw?: boolean;
};

type CloudinarySignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
};

async function uploadToFirebase(file: File, path: string): Promise<string> {
  const storageRef = ref(getStorage(getApp()), path);
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type,
    cacheControl: 'public, max-age=31536000, immutable',
  });
  return getDownloadURL(snapshot.ref);
}

async function uploadToCloudinary(file: File, path: string): Promise<string> {
  const sig = await apiPost<CloudinarySignature>('/api/media/sign', { path });
  const body = new FormData();
  body.append('file', file);
  body.append('api_key', sig.apiKey);
  body.append('timestamp', String(sig.timestamp));
  body.append('signature', sig.signature);
  body.append('folder', sig.folder);
  body.append('public_id', sig.publicId);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`, { method: 'POST', body });
  const data = (await response.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!response.ok || !data.secure_url) {
    throw Object.assign(new Error(data.error?.message || 'Upload to Cloudinary failed.'), { code: 'media/upload-failed' });
  }
  return data.secure_url;
}

/**
 * Uploads a file and returns its public URL. Images are compressed in the
 * browser first, which keeps storage and bandwidth use (and cost) low.
 *
 * `path` is a logical location such as `properties/{uid}/{listing}/kitchen`;
 * the active provider maps it to its own folder structure.
 */
export async function uploadMedia(file: File, path: string, { raw = false }: UploadOptions = {}): Promise<string> {
  const prepared = raw ? file : await compressImage(file);
  // Phone file names often contain spaces/emoji; keep paths URL- and provider-safe.
  const safePath = path.replace(/[^\w./-]+/g, '-').replace(/-{2,}/g, '-').slice(0, 200);
  return mediaProvider === 'cloudinary' ? uploadToCloudinary(prepared, safePath) : uploadToFirebase(prepared, safePath);
}

/**
 * Frees the stored file behind a media URL, best-effort. Never throws:
 * removing an image from a listing must not fail because cleanup did.
 */
export async function deleteMedia(url: string): Promise<void> {
  try {
    const { hostname } = new URL(url);
    if (hostname === 'firebasestorage.googleapis.com' || hostname.endsWith('.firebasestorage.app')) {
      const { deleteObject } = await import('firebase/storage');
      await deleteObject(ref(getStorage(getApp()), url));
    } else if (hostname === 'res.cloudinary.com') {
      await apiPost('/api/media/delete', { url });
    }
  } catch (error) {
    console.warn('Could not delete stored media (continuing):', error);
  }
}
