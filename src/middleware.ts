import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { apiRateLimit, authRateLimit, paymentRateLimit, uploadRateLimit, getClientIdentifier, checkRateLimit } from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
    try {
        // Skip rate limiting in development if RATE_LIMIT_ENABLED is not set
        if (process.env.NODE_ENV === 'development' && process.env.RATE_LIMIT_ENABLED !== 'true') {
            return NextResponse.next();
        }

        const pathname = request.nextUrl.pathname;
        const identifier = getClientIdentifier(request);

        // Determine which rate limit to apply based on the route
        let rateLimit = apiRateLimit;

        if (pathname.startsWith('/api/auth')) {
            rateLimit = authRateLimit;
        } else if (pathname.includes('/payment') || pathname.includes('/stripe')) {
            rateLimit = paymentRateLimit;
        } else if (pathname.includes('/upload')) {
            rateLimit = uploadRateLimit;
        }

        // Check rate limit
        const { success, limit, remaining, reset } = await checkRateLimit(rateLimit, identifier);

        // Create response
        const response = success
            ? NextResponse.next()
            : NextResponse.json(
                {
                    error: 'Too many requests',
                    message: 'You have exceeded the rate limit. Please try again later.',
                },
                { status: 429 }
            );

        // Add rate limit headers
        if (limit > 0) {
            response.headers.set('X-RateLimit-Limit', limit.toString());
            response.headers.set('X-RateLimit-Remaining', remaining.toString());
            response.headers.set('X-RateLimit-Reset', new Date(reset).toISOString());
        }

        return response;
    } catch (error) {
        // Log the error and allow the request to proceed
        // This prevents the whole site from going down if the rate limiting service (e.g., Upstash) fails
        console.error('Middleware Error:', error);
        return NextResponse.next();
    }
}

// Configure which routes to apply middleware to
export const config = {
    matcher: [
        '/api/:path*',
    ],
};
