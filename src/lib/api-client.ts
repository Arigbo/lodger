'use client';

import { getAuth } from 'firebase/auth';

export class ApiRequestError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/** JSON headers plus the signed-in user's Firebase ID token, if any. */
export async function authHeaders(): Promise<HeadersInit> {
  const user = getAuth().currentUser;
  const token = user ? await user.getIdToken() : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * POSTs JSON to one of our API routes, attaching the signed-in user's
 * Firebase ID token. Throws `ApiRequestError` with the server's message.
 */
export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: await authHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (data as { error?: string; message?: string }).message ||
      (data as { error?: string }).error ||
      `Request failed (${response.status})`;
    throw new ApiRequestError(response.status, message);
  }
  return data as T;
}
