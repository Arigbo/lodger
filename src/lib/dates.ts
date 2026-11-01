import type { Timestamp } from 'firebase/firestore';

type DateLike = Timestamp | Date | string | number | null | undefined;

/** Normalises Firestore Timestamps, ISO strings, epoch ms and Dates to a Date (or null). */
export function toDate(value: DateLike): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object' && typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Epoch milliseconds for any date-like value; 0 when missing (e.g. pending server timestamps). */
export function toMillis(value: DateLike): number {
  return toDate(value)?.getTime() ?? 0;
}
