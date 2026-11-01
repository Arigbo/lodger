# Lodger

Lodger is a student-housing marketplace. Students find verified homes near campus, request to rent, sign leases and pay rent online. Landlords list properties, manage requests, tenants, maintenance and payouts from one dashboard.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS + shadcn/ui · Firebase (Auth, Firestore, Storage) · Stripe Connect · Upstash Redis · Google Gemini.

---

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in what you need
npm run dev                  # http://localhost:3000
```

The app runs with only the public Firebase web config (committed in `src/firebase/config.ts`). Without server credentials, server-rendered listing data, payments, moderation and rate limiting switch themselves off. Pages fall back to client-side data where they can.

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run check` | Typecheck + lint + unit tests (run before pushing) |
| `npm run lint` / `lint:fix` | ESLint (flat config, `eslint.config.mjs`) |
| `npm test` | Vitest unit tests (`src/**/*.test.ts`) |
| `npm run deploy:rules` | Deploy Firestore/Storage rules and indexes |

## Project structure

```
src/
├── app/
│   ├── (marketing)/        # Public, indexable pages: home, /properties, about, blog, legal
│   ├── auth/               # Login, signup, password reset (no site chrome)
│   ├── student/            # Student dashboard (client, auth-guarded, noindex)
│   ├── landlord/           # Landlord dashboard (client, auth-guarded, noindex)
│   ├── api/                # Route handlers (Stripe, payments, moderation, broadcast)
│   ├── sitemap.ts, robots.ts, manifest.ts, opengraph-image.tsx
│   └── layout.tsx          # Root: fonts, providers, global metadata, JSON-LD
├── components/
│   ├── layout/             # Header, footer, dashboard shell, sidebar, logo
│   ├── marketing/          # Landing page sections
│   ├── properties/         # Property card, browser, detail, gallery, maps
│   ├── leases/ payments/ notifications/ shared/
│   └── ui/                 # shadcn/ui primitives
├── config/                 # site.ts (brand, URL) and navigation.ts (all nav menus)
├── firebase/               # Client SDK provider/hooks + Admin SDK (server-only)
├── lib/
│   ├── data/               # Server-side Firestore reads for SSR/SEO
│   ├── server/             # Server-only: API auth/errors, Stripe, rate limits, broadcasts
│   ├── api-client.ts       # Client fetch helpers that attach the Firebase ID token
│   ├── notifications.ts    # Notification templates + sender
│   ├── seo.ts              # Metadata and schema.org builders
│   └── utils.ts, currencies.ts, lease.ts
├── data/                   # Static datasets (countries, schools)
├── hooks/ · types/
└── proxy.ts                # Rate limiting for /api/* (Next 16 "proxy", formerly middleware)
```

### Key conventions

- **Public vs. app routes.** Anything that should rank in search lives under `(marketing)` and renders on the server. The canonical listing URL is `/properties/[id]`. Dashboard copies (`/student/properties/[id]`) point their canonical URL there and are `noindex`.
- **Auth state.** `useUser()` returns `{ user, profile, role, isUserLoading }`. The profile is a single live Firestore listener, so don't subscribe to `users/{uid}` again in components.
- **API routes** use `withApiHandler`, `requireUser` and `requireProfile` from `src/lib/server/api.ts`. Clients call them with `apiPost()` or `authHeaders()` from `src/lib/api-client.ts`. Never trust user IDs sent in the request body.
- **Config over constants.** Brand, URLs and menus live in `src/config`. Change them there, not in components.

## Environment & deployment

See [`.env.example`](.env.example) for every variable. Production runs on Firebase App Hosting (`apphosting.yaml` maps secrets). `scripts/setup-firebase-secrets.ps1` helps create them. Set `NEXT_PUBLIC_SITE_URL` to the production domain so canonical URLs, the sitemap and social cards are correct.

After changing `firestore.rules`, `storage.rules` or `firestore.indexes.json`, deploy them with `npm run deploy:rules`.

### Admins

Admin access is granted out-of-band: create a document at `admin_users/{uid}` in the Firebase console, or list the email in `ADMIN_EMAILS`. Clients can no longer create admin records or change their own `role`.

## Further docs

- [`docs/rate-limiting.md`](docs/rate-limiting.md): Upstash rate limit tiers
- [`docs/product-blueprint.md`](docs/product-blueprint.md): original product brief
- [`docs/data-model.json`](docs/data-model.json): Firestore entity reference
