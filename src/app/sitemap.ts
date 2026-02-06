import { MetadataRoute } from 'next';
import { getAdminDb } from "@/firebase/admin"; // We need to ensure we have a way to access admin DB here, strictly server-side
import { Property } from '@/types';

// TODO: Replace with your actual domain
const BASE_URL = 'https://lodger.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticRoutes = [
        '',
        '/auth/login',
        '/auth/signup',
        '/privacy',
        '/terms',
        '/student/properties'
    ].map((route) => ({
        url: `${BASE_URL}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    try {
        // Check if admin credentials are available before attempting to fetch
        if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
            console.warn('Skipping dynamic sitemap generation: Missing Firebase Admin credentials.');
            return staticRoutes;
        }

        const db = getAdminDb();
        const propertiesSnapshot = await db.collection('properties').get();

        // Check if we have documents
        if (propertiesSnapshot.empty) {
            return staticRoutes;
        }

        const dynamicRoutes = propertiesSnapshot.docs.map((doc) => {
            const data = doc.data();
            // Fallback to current date if specific date field is missing, or use a field like 'updatedAt' if available
            const lastModified = new Date();

            return {
                url: `${BASE_URL}/student/properties/${doc.id}`,
                lastModified: lastModified,
                changeFrequency: 'weekly' as const,
                priority: 0.9,
            };
        });

        return [...staticRoutes, ...dynamicRoutes];
    } catch (error) {
        console.error('Error generating sitemap:', error);
        return staticRoutes;
    }
}
