/** Extracts a human-readable message from an unknown thrown value. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return fallback;
}

/** Firebase/Stripe-style error code (e.g. "auth/invalid-credential"), if present. */
export function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') return error.code;
  return undefined;
}

/**
 * User-facing explanation for Firebase Storage upload failures.
 * Falls back to a generic message for anything unrecognised.
 */
export function describeUploadError(error: unknown): { title: string; description: string } {
  switch (getErrorCode(error)) {
    case 'storage/quota-exceeded':
      return {
        title: 'Photo storage is unavailable',
        description:
          'Firebase Storage needs the Blaze plan. Set NEXT_PUBLIC_MEDIA_PROVIDER=cloudinary to use the free Cloudinary plan instead (see docs/media-storage.md).',
      };
    case 'media/not-configured':
      return {
        title: 'Photo uploads are not set up yet',
        description: 'Add the Cloudinary keys (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) and restart the app.',
      };
    case 'storage/unauthorized':
    case 'storage/unauthenticated':
      return { title: "Upload wasn't allowed", description: 'Please sign in again and retry. Files must be under 5 MB.' };
    case 'storage/retry-limit-exceeded':
    case 'storage/server-file-wrong-size':
      return { title: 'Upload timed out', description: 'Check your connection and try again.' };
    case 'storage/canceled':
      return { title: 'Upload cancelled', description: 'The upload was stopped before it finished.' };
    default:
      return { title: 'Upload failed', description: getErrorMessage(error, 'Something went wrong while uploading. Please try again.') };
  }
}
