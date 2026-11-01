/**
 * HTTP security headers, including the Content-Security-Policy.
 *
 * The CSP is a static header (not nonce-based) so pages can stay statically
 * rendered / ISR-cached. Inline scripts are therefore allowed (Next.js needs
 * them for hydration), but every *external* origin is pinned below.
 *
 * Adding a third-party service? Add its origins here — the browser console
 * will show "Refused to … because it violates the Content Security Policy"
 * otherwise. Set CSP_REPORT_ONLY=true to switch to report-only mode while
 * debugging in production.
 */

import { firebaseConfig } from '../firebase/config';

const isDev = process.env.NODE_ENV !== 'production';
const firebaseAuthDomain = firebaseConfig.authDomain;

const directives: Record<string, string[]> = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    ...(isDev ? ["'unsafe-eval'"] : []),
    'https://js.stripe.com',
    'https://*.js.stripe.com',
    'https://apis.google.com', // Firebase Auth (Google sign-in popup)
  ],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:', 'https:', ...(isDev ? ['http://127.0.0.1:9199'] : [])], // listing/blog images may live on any HTTPS host
  'media-src': ["'self'", 'blob:', 'https:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': [
    "'self'",
    'https://*.googleapis.com', // Firestore, Auth, Storage, Installations
    'https://api.stripe.com',
    'https://api.cloudinary.com', // signed media uploads (optional provider)
    'https://maps.googleapis.com',
    ...(isDev ? ['ws:', 'wss:', 'http://127.0.0.1:9099', 'http://127.0.0.1:8080', 'http://127.0.0.1:9199'] : []),
  ],
  'frame-src': [
    "'self'",
    'https://js.stripe.com',
    'https://*.js.stripe.com',
    'https://hooks.stripe.com',
    `https://${firebaseAuthDomain}`,
    'https://accounts.google.com',
    ...(isDev ? ['http://127.0.0.1:9099'] : []),
  ],
  'worker-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'self'"],
};

export function buildContentSecurityPolicy(): string {
  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(' ')}`);
  if (!isDev) policy.push('upgrade-insecure-requests');
  return policy.join('; ');
}

export function securityHeaders() {
  const cspHeader =
    process.env.CSP_REPORT_ONLY === 'true' ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';

  return [
    { key: cspHeader, value: buildContentSecurityPolicy() },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(self "https://js.stripe.com")' },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' }, // keeps Google sign-in popups working
  ];
}
