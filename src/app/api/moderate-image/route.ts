import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";


// Initialize Gemini for visual analysis
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || '');

// Rate limiting: 10 requests per minute per IP
const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
});

// Simple in-memory cache for moderation results (expires after 1 hour)
const moderationCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Strip EXIF metadata from image buffer
 */
async function stripMetadata(imageBuffer: Buffer): Promise<Buffer> {
    try {
        const sharpModule = await import('sharp');
        const sharp = sharpModule.default || sharpModule;

        return await sharp(imageBuffer)
            .rotate() // Auto-rotate based on EXIF orientation
            .withMetadata({
                exif: {}, // Remove all EXIF data
                icc: undefined, // Remove ICC profile
            })
            .jpeg({ quality: 95 })
            .toBuffer();
    } catch (error) {
        console.error('Metadata stripping failed:', error);
        return imageBuffer; // Return original if stripping fails
    }
}

/**
 * Generate cache key from image data
 */
function getCacheKey(imageData: string): string {
    // Use first 100 chars of base64 as simple hash
    return imageData.substring(0, 100);
}

export async function POST(request: NextRequest) {
    try {
        // Check for API Key
        if (!process.env.GOOGLE_GENAI_API_KEY) {
            console.error('GOOGLE_GENAI_API_KEY is missing in environment variables');
            return NextResponse.json(
                { error: 'AI features are currently unavailable. Please configure GOOGLE_GENAI_API_KEY.' },
                { status: 503 }
            );
        }
        // Rate limiting
        const ip = (request as any).ip ?? request.headers.get("x-forwarded-for") ?? "127.0.0.1";
        const { success, limit, reset, remaining } = await ratelimit.limit(ip);

        if (!success) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Please try again later.' },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Limit': limit.toString(),
                        'X-RateLimit-Remaining': remaining.toString(),
                        'X-RateLimit-Reset': reset.toString(),
                    }
                }
            );
        }

        const { imageUrl, imageBase64, mimeType } = await request.json();

        if (!imageUrl && !imageBase64) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        // Check cache
        const cacheKey = getCacheKey(imageBase64 || imageUrl);
        const cached = moderationCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return NextResponse.json({ ...cached.result, cached: true });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Construct the prompt for moderation and context
        const prompt = `
            Analyze this image for an apartment rental listing.
            1. Safety: Is there any inappropriate content (nudity, violence, drugs, or sensitive personal info)? (Status: SAFE or UNSAFE)
            2. Context: Does this look like it belongs in a property listing? (e.g., room, kitchen, bathroom, exterior building, furniture). (Status: RELEVANT or IRRELEVANT)
            3. Labels: Provide a short list of detected room types or objects.
            4. Reason: Briefly explain if it's UNSAFE or IRRELEVANT.

            Return JSON format only:
            {
                "safety": "SAFE" | "UNSAFE",
                "context": "RELEVANT" | "IRRELEVANT",
                "labels": ["kitchen", "white cabinets", ...],
                "reason": "..."
            }
        `;

        let processedImageData: string;
        let finalMimeType: string;

        if (imageBase64) {
            // Strip metadata from base64 image
            const imageBuffer = Buffer.from(imageBase64, 'base64');
            const cleanedBuffer = await stripMetadata(imageBuffer);
            processedImageData = cleanedBuffer.toString('base64');
            finalMimeType = mimeType || "image/jpeg";
        } else {
            // For hosted URLs, fetch and strip metadata
            const response = await fetch(imageUrl);
            const buffer = await response.arrayBuffer();
            const cleanedBuffer = await stripMetadata(Buffer.from(buffer));
            processedImageData = cleanedBuffer.toString('base64');
            finalMimeType = mimeType || response.headers.get('content-type') || "image/jpeg";
        }

        // Call Gemini API
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: processedImageData,
                    mimeType: finalMimeType
                }
            }
        ]);

        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {
            safety: "SAFE",
            context: "RELEVANT",
            labels: [],
            reason: ""
        };

        // Cache the result
        moderationCache.set(cacheKey, { result: analysis, timestamp: Date.now() });

        // Clean up old cache entries (simple cleanup)
        if (moderationCache.size > 1000) {
            const now = Date.now();
            for (const [key, value] of moderationCache.entries()) {
                if (now - value.timestamp > CACHE_TTL) {
                    moderationCache.delete(key);
                }
            }
        }

        return NextResponse.json(analysis);
    } catch (error: any) {
        console.error('Image moderation error:', error);

        // Specific error handling
        if (error.message?.includes('quota')) {
            return NextResponse.json(
                { error: 'API quota exceeded. Please try again later.' },
                { status: 503 }
            );
        }

        if (error.message?.includes('invalid')) {
            return NextResponse.json(
                { error: 'Invalid image format or data.' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to moderate image', details: error.message, stack: error.stack },
            { status: 500 }
        );
    }
}
