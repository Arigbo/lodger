
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { isMemoizedFirebaseObject } from '@/firebase/provider';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
  refetch: () => void;      // Function to manually trigger a refetch.
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 * 
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *  
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = DocumentData>(
  memoizedTargetRefOrQuery: CollectionReference<DocumentData> | Query<DocumentData> | null | undefined,
): UseCollectionResult<T> {
  // The latest result is stored together with the query it belongs to, so
  // switching queries never shows another query's data and loading state is
  // derived rather than set synchronously inside the effect.
  const [result, setResult] = useState<{
    source: unknown;
    token: number;
    data: WithId<T>[] | null;
    error: FirestoreError | Error | null;
  } | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const refetch = useCallback(() => {
    setRefetchKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) return;
    const source = memoizedTargetRefOrQuery;

    return onSnapshot(
      source,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const data = snapshot.docs.map((doc) => ({ ...(doc.data() as T), id: doc.id }));
        setResult({ source, token: refetchKey, data, error: null });
      },
      () => {
        const path =
          source.type === 'collection'
            ? (source as CollectionReference).path
            : (source as unknown as InternalQuery)._query.path.toString();
        const contextualError = new FirestorePermissionError({ operation: 'list', path });
        setResult({ source, token: refetchKey, data: null, error: contextualError });
        errorEmitter.emit('permission-error', contextualError);
      },
    );
  }, [memoizedTargetRefOrQuery, refetchKey]);

  if (memoizedTargetRefOrQuery && !isMemoizedFirebaseObject(memoizedTargetRefOrQuery)) {
    throw new Error('useCollection query was not properly memoized using useMemoFirebase. This can cause infinite loops and unnecessary Firestore reads.');
  }

  const current = memoizedTargetRefOrQuery && result?.source === memoizedTargetRefOrQuery ? result : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    isLoading: !!memoizedTargetRefOrQuery && (!current || current.token !== refetchKey),
    refetch,
  };
}
