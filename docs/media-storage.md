# Media storage

Listing photos, videos and profile pictures are uploaded through one helper,
`uploadMedia()` in `src/lib/media/upload-media.ts`. Before anything is stored,
images are resized to 1600px on the longest side and re-encoded as WebP/JPEG
in the browser. That strips EXIF/GPS data and usually shrinks a phone photo
from 3–5 MB to 150–400 KB, roughly 10x less storage and bandwidth.

## Choosing a provider

Set `NEXT_PUBLIC_MEDIA_PROVIDER` in `.env.local` (and in your host's env):

| Provider | Value | Free allowance (check current pricing) | Notes |
| --- | --- | --- | --- |
| Firebase Storage | `firebase` (default) | Requires the Blaze plan for `*.firebasestorage.app` buckets; Blaze includes a no-cost tier | No extra setup. A `storage/quota-exceeded` error usually means the project is on Spark or over quota. |
| Cloudinary | `cloudinary` | Free plan with monthly credits | Images are served from a global CDN with on-the-fly optimisation. |

### Firebase (default)

Nothing to configure. If uploads fail with `storage/quota-exceeded`, open the
Firebase console, go to **Usage and billing**, and either upgrade to Blaze
(pay-as-you-go with a free tier) or switch to Cloudinary below.

### Cloudinary

1. Create a free account at cloudinary.com and copy the **Cloud name**,
   **API key** and **API secret** from the dashboard.
2. Add them to `.env.local` (and App Hosting secrets in production):

   ```env
   NEXT_PUBLIC_MEDIA_PROVIDER=cloudinary
   CLOUDINARY_CLOUD_NAME=your-cloud
   CLOUDINARY_API_KEY=123456789
   CLOUDINARY_API_SECRET=keep-this-secret
   ```

3. Restart the app. New uploads go to `lodger/<area>/<userId>/…` in your
   Cloudinary media library.

How it stays secure: the browser asks `/api/media/sign` (signed-in users only)
for a one-off signature, then uploads **directly** to Cloudinary, so files never
pass through the Lodger server. The server always fixes the folder to the
caller's own user ID, and `/api/media/delete` only deletes files inside it.
The API secret never reaches the browser.

Existing images keep working: URLs are stored as plain links, so old Firebase
images and new Cloudinary images can coexist. Nothing needs migrating.

## Drafts and storage

Saving a listing draft uploads only newly chosen photos. Re-saving doesn't
upload them again, and deleting a draft also deletes its photos.
