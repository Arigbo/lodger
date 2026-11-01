import { describe, expect, it } from 'vitest';
import { toDate, toMillis } from './dates';

describe('date helpers', () => {
  it('handles Firestore-like timestamps', () => {
    const ts = { toDate: () => new Date(1000) } as unknown as Parameters<typeof toDate>[0];
    expect(toMillis(ts)).toBe(1000);
  });
  it('handles strings, numbers and dates', () => {
    expect(toMillis('1970-01-01T00:00:02.000Z')).toBe(2000);
    expect(toMillis(3000)).toBe(3000);
    expect(toDate(new Date(4000))?.getTime()).toBe(4000);
  });
  it('returns null/0 for missing or invalid values', () => {
    expect(toDate(null)).toBeNull();
    expect(toDate('not a date')).toBeNull();
    expect(toMillis(undefined)).toBe(0);
  });
});
