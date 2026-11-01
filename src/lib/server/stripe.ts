import 'server-only';
import Stripe from 'stripe';
import { ApiError } from './api';

let client: Stripe | null = null;

/**
 * Lazily creates the Stripe client so builds and routes that never touch
 * Stripe work without STRIPE_SECRET_KEY.
 */
export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new ApiError(503, 'Payments are not configured on this server.');
  client = new Stripe(key, { apiVersion: '2025-12-15.clover' });
  return client;
}
