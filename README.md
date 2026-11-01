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
| `npm run deploy:rules` | Deploy Firestore rules and indexes |
| `npm run deploy:storage-rules` | Deploy Storage rules (only if you use Firebase Storage, which needs Blaze) |
| `npm run emulators` · `npm run seed` · `npm run dev:emulators` | Run fully offline against Firebase emulators with demo accounts (`student@demo.lodger` / `landlord@demo.lodger`, password `password123`) |
| `npm run reset:firebase -- --project <id>` | Preview, then (with `--yes`) wipe all Firestore data and Auth users in a project. Add `--storage` to also empty the bucket |

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

See [`.env.example`](.env.example) for every variable. Set `NEXT_PUBLIC_SITE_URL` to the production domain so canonical URLs, the sitemap and social cards are correct.

After changing `firestore.rules` or `firestore.indexes.json`, deploy them with `npm run deploy:rules`.

### Running on the free Spark plan

Lodger runs without Firebase's paid Blaze plan:

| Piece | Free option |
| --- | --- |
| Firestore and Auth | Included in Spark (daily read and write limits apply). |
| Photos and videos | **Cloudinary free plan.** This is the default (`NEXT_PUBLIC_MEDIA_PROVIDER=cloudinary`). New Firebase Storage buckets need Blaze. See [`docs/media-storage.md`](docs/media-storage.md). |
| Hosting (pages and API routes) | **Vercel Hobby** (free). Import the repo, add the variables from `.env.example`, and deploy. Firebase App Hosting and Cloud Functions need Blaze. |
| Rate limiting | Upstash Redis free tier (optional; without it, limits are kept in memory). |
| Image moderation | Gemini API free tier via `GOOGLE_GENAI_API_KEY` (optional; uploads go through unchecked without it). |
| Card payments | Stripe has no monthly fee; it takes a cut of each payment. Bank-transfer payments work without Stripe. |

If you upgrade to Blaze later, `apphosting.yaml` already maps the secrets for Firebase App Hosting (`scripts/setup-firebase-secrets.ps1` creates them).

### Admins

Admin access is granted out-of-band: create a document at `admin_users/{uid}` in the Firebase console, or list the email in `ADMIN_EMAILS`. Clients can no longer create admin records or change their own `role`.

## Resetting a Firebase project

`scripts/reset-firebase.mjs` deletes **data** only (all Firestore collections and Firebase Auth users, plus Storage files with `--storage`). Rules, indexes and settings stay as they are. It needs Admin credentials (see `.env.example`). It only prints what it would delete until you pass `--yes`, and it then asks you to type the project ID.

```bash
npm run reset:firebase -- --project studio-2267792175-c3d0d          # preview
npm run reset:firebase -- --project studio-2267792175-c3d0d --yes    # wipe Firestore + Auth
```

## Further docs

- [`docs/media-storage.md`](docs/media-storage.md): image compression, and Firebase Storage vs Cloudinary

- [`docs/rate-limiting.md`](docs/rate-limiting.md): Upstash rate limit tiers
- [`docs/product-blueprint.md`](docs/product-blueprint.md): original product brief
- [`docs/data-model.json`](docs/data-model.json): Firestore entity reference
