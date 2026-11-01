// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAsyncResult } from './use-async-result';

describe('useAsyncResult', () => {
  it('stays idle without a source', () => {
    const { result } = renderHook(() => useAsyncResult(null, async () => 1));
    expect(result.current).toEqual({ data: undefined, error: undefined, isLoading: false });
  });

  it('loads data for a source', async () => {
    const { result } = renderHook(() => useAsyncResult('a', async (s) => s.toUpperCase()));
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.data).toBe('A'));
    expect(result.current.isLoading).toBe(false);
  });

  it('keeps the previous result while refreshing when asked', async () => {
    const { result, rerender } = renderHook(({ s }) => useAsyncResult(s, async (v: number) => v * 2, { keepPrevious: true }), {
      initialProps: { s: 1 },
    });
    await waitFor(() => expect(result.current.data).toBe(2));
    rerender({ s: 2 });
    expect(result.current).toMatchObject({ data: 2, isLoading: false });
    await waitFor(() => expect(result.current.data).toBe(4));
  });

  it('ignores stale results when the source changes', async () => {
    const resolvers: Record<string, (v: string) => void> = {};
    const load = (s: string) => new Promise<string>((resolve) => (resolvers[s] = resolve));
    const { result, rerender } = renderHook(({ s }) => useAsyncResult(s, load), { initialProps: { s: 'first' } });
    rerender({ s: 'second' });
    resolvers.first('stale');
    resolvers.second('fresh');
    await waitFor(() => expect(result.current.data).toBe('fresh'));
  });
});
