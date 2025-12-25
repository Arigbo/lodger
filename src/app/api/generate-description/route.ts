import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { title, type, bedrooms, bathrooms, area, amenities, city, state, country, school } = body;

        // Generate a description based on the property details
        const description = generatePropertyDescription({
            title,
            type,
            bedrooms,
            bathrooms,
            area,
            amenities,
            city,
            state,
            country,
            school,
        });

        return NextResponse.json({ description });
    } catch (error) {
        console.error('Error generating description:', error);
        return NextResponse.json(
            { error: 'Failed to generate description' },
            { status: 500 }
        );
    }
}

function generatePropertyDescription(data: {
    title?: string;
    type?: string;
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
    amenities?: string[];
    city?: string;
    state?: string;
    country?: string;
    school?: string;
}): string {
    const {
        title,
        type,
        bedrooms,
        bathrooms,
        area,
        amenities = [],
        city,
        state,
        country,
        school,
    } = data;

    // Build description parts
    const parts: string[] = [];

    // Opening statement
    if (title && type) {
        parts.push(`Welcome to ${title}, a beautiful ${type.toLowerCase()} perfect for students and young professionals.`);
    } else if (type) {
        parts.push(`This stunning ${type.toLowerCase()} offers comfortable living in a prime location.`);
    }

    // Property details
    const details: string[] = [];
    if (bedrooms) details.push(`${bedrooms} ${bedrooms === 1 ? 'bedroom' : 'bedrooms'}`);
    if (bathrooms) details.push(`${bathrooms} ${bathrooms === 1 ? 'bathroom' : 'bathrooms'}`);
    if (area) details.push(`${area} square feet of living space`);

    if (details.length > 0) {
        parts.push(`The property features ${details.join(', ')}, providing ample space for comfortable living.`);
    }

    // Location
    const locationParts: string[] = [];
    if (city) locationParts.push(city);
    if (state) locationParts.push(state);
    if (country) locationParts.push(country);

    if (locationParts.length > 0) {
        let locationText = `Located in ${locationParts.join(', ')}`;
        if (school) {
            locationText += `, this property is conveniently situated near ${school}, making it ideal for students`;
        }
        locationText += '.';
        parts.push(locationText);
    }

    // Amenities
    if (amenities.length > 0) {
        const amenityList = amenities.slice(0, 5).join(', ');
        const remaining = amenities.length - 5;

        let amenityText = `Enjoy modern amenities including ${amenityList}`;
        if (remaining > 0) {
            amenityText += `, and ${remaining} more`;
        }
        amenityText += '.';
        parts.push(amenityText);
    }

    // Closing statement
    parts.push('This property offers excellent value and a comfortable lifestyle. Schedule a viewing today to experience it for yourself!');

    return parts.join(' ');
}
