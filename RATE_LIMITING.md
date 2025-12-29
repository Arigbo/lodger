# Rate Limiting Setup Guide

## Overview

Rate limiting has been implemented to protect your API routes from abuse and ensure fair usage across the application.

## Configuration

### 1. Set up Upstash Redis

1. Sign up for a free account at [https://upstash.com/](https://upstash.com/)
2. Create a new Redis database
3. Copy the **REST URL** and **REST TOKEN** from your Upstash dashboard

### 2. Add Environment Variables

Add the following to your `.env.local` file:

```env
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token_here

# Optional: Enable rate limiting in development
RATE_LIMIT_ENABLED=true
```

## Rate Limit Tiers

Different endpoints have different rate limits:

| Endpoint Type | Rate Limit | Window |
|--------------|------------|--------|
| Authentication (`/api/auth/*`) | 5 requests | 15 minutes |
| Payment/Stripe (`/api/*payment*`, `/api/stripe/*`) | 20 requests | 1 hour |
| File Upload (`/api/*upload*`) | 10 requests | 1 hour |
| General API (`/api/*`) | 100 requests | 1 minute |

## How It Works

1. **Middleware**: The `src/middleware.ts` file intercepts all API requests
2. **Identification**: Requests are identified by IP address (from `x-forwarded-for` or `x-real-ip` headers)
3. **Rate Limiting**: The appropriate rate limit is applied based on the route
4. **Response**: If the limit is exceeded, a `429 Too Many Requests` response is returned

## Rate Limit Headers

All API responses include the following headers:

- `X-RateLimit-Limit`: Maximum number of requests allowed
- `X-RateLimit-Remaining`: Number of requests remaining in the current window
- `X-RateLimit-Reset`: Timestamp when the rate limit resets

## Development Mode

By default, rate limiting is **disabled in development** to make testing easier. To enable it in development, set:

```env
RATE_LIMIT_ENABLED=true
```

## Testing Rate Limits

You can test rate limiting by making multiple rapid requests to an API endpoint:

```bash
# Make 10 requests quickly
for i in {1..10}; do curl http://localhost:3000/api/your-endpoint; done
```

After exceeding the limit, you should receive a 429 response:

```json
{
  "error": "Too many requests",
  "message": "You have exceeded the rate limit. Please try again later."
}
```

## Customizing Rate Limits

To adjust rate limits, edit `src/lib/rate-limit.ts`:

```typescript
export const apiRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "1 m"), // Change these values
      analytics: true,
      prefix: "ratelimit:api",
    })
  : null;
```

## Production Deployment

Make sure to add your Upstash credentials to your production environment variables in your hosting platform (Vercel, Netlify, etc.).

## Troubleshooting

### Rate limiting not working

1. Check that `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set correctly
2. Verify your Upstash Redis database is active
3. Check the middleware is running by looking for rate limit headers in API responses

### All requests being blocked

1. Check if you're testing from the same IP address repeatedly
2. Wait for the rate limit window to reset
3. Temporarily disable rate limiting in development by removing `RATE_LIMIT_ENABLED=true`

## Security Considerations

- Rate limiting is based on IP address, which can be spoofed. For production, consider adding user-based rate limiting for authenticated requests.
- The current implementation uses a sliding window algorithm, which provides smooth rate limiting.
- Consider implementing IP whitelisting for trusted services or admin users.
