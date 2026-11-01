'use client';

import { useCallback, useSyncExternalStore } from 'react';

const EVENT = 'lodger:local-storage';

function read(key: string, fallback: boolean): boolean {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value === 'true';
  } catch {
    return fallback;
  }
}

/** A boolean persisted in localStorage (per browser), synced across tabs. */
export function useLocalStorageFlag(key: string, fallback = false): [boolean, (value: boolean) => void] {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener('storage', onChange);
    window.addEventListener(EVENT, onChange);
    return () => {
      window.removeEventListener('storage', onChange);
      window.removeEventListener(EVENT, onChange);
    };
  }, []);

  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback,
  );

  const setValue = useCallback(
    (next: boolean) => {
      try {
        window.localStorage.setItem(key, String(next));
      } catch {
        /* storage unavailable (private mode): keep the in-memory default */
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );

  return [value, setValue];
}
