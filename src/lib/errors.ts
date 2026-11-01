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
