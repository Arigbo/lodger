import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create a new ratelimiter that allows 10 requests per 10 seconds
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

// Different rate limit configurations for different use cases
export const authRateLimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 requests per 15 minutes
        analytics: true,
        prefix: "ratelimit:auth",
    })
    : null;

export const apiRateLimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests per minute
        analytics: true,
        prefix: "ratelimit:api",
    })
    : null;

export const uploadRateLimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 h"), // 10 requests per hour
        analytics: true,
        prefix: "ratelimit:upload",
    })
    : null;

export const paymentRateLimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, "1 h"), // 20 requests per hour
        analytics: true,
        prefix: "ratelimit:payment",
    })
    : null;

// Helper function to get client identifier (IP address or user ID)
export function getClientIdentifier(request: Request): string {
    // Try to get IP from headers (works with most proxies/load balancers)
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");

    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }

    if (realIp) {
        return realIp;
    }

    // Fallback to a default identifier
    return "anonymous";
}

// Helper function to apply rate limiting
export async function checkRateLimit(
    rateLimit: Ratelimit | null,
    identifier: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
    // If rate limiting is not configured (e.g., in development), allow all requests
    if (!rateLimit) {
        return { success: true, limit: 0, remaining: 0, reset: 0 };
    }

    const { success, limit, remaining, reset } = await rateLimit.limit(identifier);

    return { success, limit, remaining, reset };
}
