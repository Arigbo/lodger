import { Metadata } from 'next';
import { getAdminDb } from "@/firebase/admin";
import PropertyDetailClient from './PropertyDetailClient';
import { Property } from '@/types';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const db = getAdminDb();

    try {
        const propertySnap = await db.collection('properties').doc(id).get();

        if (!propertySnap.exists) {
            return {
                title: 'Property Not Found | Lodger',
            };
        }

        const property = propertySnap.data() as Property;

        return {
            title: `${property.title} | Lodger`,
            description: property.description.substring(0, 160),
            openGraph: {
                title: property.title,
                description: property.description.substring(0, 160),
                images: property.images && property.images.length > 0 ? [{
                    url: property.images[0],
                    width: 1200,
                    height: 630,
                    alt: property.title,
                }] : [],
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                title: property.title,
                description: property.description.substring(0, 160),
                images: property.images && property.images.length > 0 ? [property.images[0]] : [],
            }
        };
    } catch (error) {
        console.error("Error generating metadata:", error);
        return {
            title: 'Property Details | Lodger',
        };
    }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const db = getAdminDb();

    const propertySnap = await db.collection('properties').doc(id).get();

    if (!propertySnap.exists) {
        notFound();
    }

    const property = {
        id: propertySnap.id,
        ...propertySnap.data()
    } as Property;

    return <PropertyDetailClient initialProperty={property} propertyId={id} />;
}
