'use client';

import { useEffect, useEffectEvent, useState } from 'react';

type AsyncResult<R> = {
  data: R | undefined;
  error: unknown;
  isLoading: boolean;
};

/**
 * Runs `load(source)` whenever `source` changes and returns the result.
 *
 * - Results are keyed by the source they were computed from, so a stale
 *   response for an old source is never shown (or written) for a new one.
 * - `isLoading` is derived, so no state is set synchronously in the effect.
 * - Pass `null`/`undefined` while inputs are not ready; nothing runs.
 * - With `keepPrevious`, the last result stays visible while a new source
 *   loads (use for live data that refreshes, to avoid loading flashes).
 */
export function useAsyncResult<S, R>(
  source: S | null | undefined,
  load: (source: S) => Promise<R>,
  { keepPrevious = false }: { keepPrevious?: boolean } = {},
): AsyncResult<R> {
  const [result, setResult] = useState<{ source: S; data?: R; error?: unknown } | null>(null);
  const run = useEffectEvent((input: S) => load(input));

  useEffect(() => {
    if (source === null || source === undefined) return;
    let cancelled = false;
    run(source).then(
      (data) => !cancelled && setResult({ source, data }),
      (error) => {
        console.error(error);
        if (!cancelled) setResult({ source, error });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [source]);

  const hasSource = source !== null && source !== undefined;
  const current = hasSource && result?.source === source ? result : null;
  const shown = current ?? (keepPrevious && hasSource ? result : null);
  return {
    data: shown?.data,
    error: shown?.error,
    isLoading: hasSource && !shown,
  };
}
