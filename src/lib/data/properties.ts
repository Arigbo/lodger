import 'server-only';
import { cache } from 'react';
import { getAdminDb, isAdminConfigured } from '@/firebase/admin';
import type { Property } from '@/types';

/**
 * Server-side property reads (Firebase Admin SDK). Used by public pages,
 * metadata and the sitemap. Every function degrades gracefully when admin
 * credentials are missing (e.g. local builds) so pages still render.
 */

/** Whether server-side reads are possible in this environment. */
export const canReadOnServer = isAdminConfigured;

/** Converts Firestore Timestamps into ISO strings so data is serialisable. */
function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) =>
      v && typeof v === 'object' && typeof v.toDate === 'function' ? v.toDate().toISOString() : v,
    ),
  );
}

function toProperty(id: string, data: FirebaseFirestore.DocumentData): Property {
  return serialize({ ...data, id } as Property);
}

export const getPropertyById = cache(async (id: string): Promise<Property | null> => {
  if (!isAdminConfigured()) return null;
  try {
    const snap = await getAdminDb().collection('properties').doc(id).get();
    return snap.exists ? toProperty(snap.id, snap.data()!) : null;
  } catch (error) {
    console.error(`getPropertyById(${id}) failed:`, error);
    return null;
  }
});

export const getAvailableProperties = cache(async (limit = 24): Promise<Property[]> => {
  if (!isAdminConfigured()) return [];
  try {
    const snap = await getAdminDb()
      .collection('properties')
      .where('status', '==', 'available')
      .limit(limit)
      .get();
    return snap.docs.map((doc) => toProperty(doc.id, doc.data()));
  } catch (error) {
    console.error('getAvailableProperties failed:', error);
    return [];
  }
});

/** Lightweight listing of every available property for the sitemap. */
export async function getPropertySitemapEntries(): Promise<{ id: string; updatedAt?: string }[]> {
  if (!isAdminConfigured()) return [];
  try {
    const snap = await getAdminDb()
      .collection('properties')
      .where('status', '==', 'available')
      .select('updatedAt', 'createdAt')
      .get();
    return snap.docs.map((doc) => {
      const data = serialize(doc.data()) as { updatedAt?: string; createdAt?: string };
      return { id: doc.id, updatedAt: data.updatedAt || data.createdAt };
    });
  } catch (error) {
    console.error('getPropertySitemapEntries failed:', error);
    return [];
  }
}
