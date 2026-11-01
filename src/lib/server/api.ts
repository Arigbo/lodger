import 'server-only';
import { NextResponse } from 'next/server';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getAdminAuth, getAdminDb } from '@/firebase/admin';
import type { UserProfile } from '@/types';

/** An error whose message is safe to return to the client. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function jsonError(status: number, message: string, init?: { headers?: HeadersInit; code?: string }) {
  return NextResponse.json({ error: message, code: init?.code }, { status, headers: init?.headers });
}

/**
 * Wraps a route handler with consistent error handling: `ApiError`s are
 * returned as-is, anything else becomes a generic 500 (details stay in logs).
 */
export function withApiHandler<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
  options: { headers?: (...args: Args) => HeadersInit } = {},
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      const headers = options.headers?.(...args);
      if (error instanceof ApiError) return jsonError(error.status, error.message, { headers, code: error.code });
      console.error('Unhandled API error:', error);
      return jsonError(500, 'Something went wrong. Please try again.', { headers });
    }
  };
}

/** Verifies the `Authorization: Bearer <Firebase ID token>` header. */
export async function requireUser(request: Request): Promise<DecodedIdToken> {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw new ApiError(401, 'You must be signed in to do that.');

  try {
    return await getAdminAuth().verifyIdToken(token);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not initialized')) {
      throw new ApiError(503, 'Server authentication is not configured.');
    }
    throw new ApiError(401, 'Your session has expired. Please sign in again.');
  }
}

/** Loads the caller's Firestore profile, optionally enforcing a role. */
export async function requireProfile(uid: string, role?: UserProfile['role']) {
  const ref = getAdminDb().collection('users').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) throw new ApiError(404, 'User profile not found.');
  const profile = { ...(snap.data() as UserProfile), id: snap.id };
  if (role && profile.role !== role) throw new ApiError(403, 'You do not have access to this action.');
  return { ref, profile };
}

/** Safely parses a JSON body, returning 400 on malformed input. */
export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.');
  }
}
