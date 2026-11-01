'use client';

import { collection, documentId, getDocs, query, where, type Firestore } from 'firebase/firestore';

/** Firestore `in` queries accept at most 30 values. */
const IN_QUERY_LIMIT = 30;

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/**
 * Loads many documents by ID with as few queries as possible.
 * Duplicates and empty IDs are ignored; missing documents are simply absent.
 */
export async function fetchDocsByIds<T>(
  firestore: Firestore,
  collectionName: string,
  ids: (string | null | undefined)[],
): Promise<Map<string, T & { id: string }>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  const result = new Map<string, T & { id: string }>();

  await Promise.all(
    chunk(unique, IN_QUERY_LIMIT).map(async (batch) => {
      const snapshot = await getDocs(query(collection(firestore, collectionName), where(documentId(), 'in', batch)));
      snapshot.forEach((doc) => result.set(doc.id, { ...(doc.data() as T), id: doc.id }));
    }),
  );

  return result;
}
