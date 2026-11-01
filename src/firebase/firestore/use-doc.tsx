'use client';
    
import { useState, useEffect, useCallback } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { isMemoizedFirebaseObject } from '@/firebase/provider';

/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
  refetch: () => void; // Function to manually trigger a refetch.
}

/**
 * React hook to subscribe to a single Firestore document in real-time.
 * Handles nullable references.
 * 
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {DocumentReference<DocumentData> | null | undefined} docRef -
 * The Firestore DocumentReference. Waits if null/undefined.
 * @returns {UseDocResult<T>} Object with data, isLoading, error, and refetch function.
 */
export function useDoc<T = DocumentData>(
  memoizedDocRef: DocumentReference<DocumentData> | null | undefined,
): UseDocResult<T> {
  // See useCollection: results are keyed by the ref they belong to.
  const [result, setResult] = useState<{
    source: unknown;
    token: number;
    data: WithId<T> | null;
    error: FirestoreError | Error | null;
  } | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const refetch = useCallback(() => {
    setRefetchKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!memoizedDocRef) return;
    const source = memoizedDocRef;

    return onSnapshot(
      source,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        const data = snapshot.exists() ? { ...(snapshot.data() as T), id: snapshot.id } : null;
        setResult({ source, token: refetchKey, data, error: null });
      },
      () => {
        const contextualError = new FirestorePermissionError({ operation: 'get', path: source.path });
        setResult({ source, token: refetchKey, data: null, error: contextualError });
        errorEmitter.emit('permission-error', contextualError);
      },
    );
  }, [memoizedDocRef, refetchKey]);

  if (memoizedDocRef && !isMemoizedFirebaseObject(memoizedDocRef)) {
    throw new Error('useDoc reference was not properly memoized using useMemoFirebase. This can cause infinite loops and unnecessary Firestore reads.');
  }

  const current = memoizedDocRef && result?.source === memoizedDocRef ? result : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    isLoading: !!memoizedDocRef && (!current || current.token !== refetchKey),
    refetch,
  };
}
