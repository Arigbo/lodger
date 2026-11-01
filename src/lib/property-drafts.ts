import type { Timestamp } from 'firebase/firestore';
import type { FormValues } from '@/app/landlord/properties/new/schemas';

/** Photo/video slots in the listing wizard, keyed by form field. */
export const MEDIA_SLOTS = [
  { field: 'kitchenImage', key: 'kitchen' },
  { field: 'livingRoomImage', key: 'livingRoom' },
  { field: 'bedroomImage', key: 'bedroom' },
  { field: 'bathroomImage', key: 'bathroom' },
  { field: 'otherImage', key: 'other' },
  { field: 'propertyVideo', key: 'video' },
] as const;

export type MediaSlotKey = (typeof MEDIA_SLOTS)[number]['key'];
export type MediaFieldName = (typeof MEDIA_SLOTS)[number]['field'];
export type SavedMedia = Partial<Record<MediaSlotKey, string>>;

/** Form values without file inputs (those are stored as URLs in `media`). */
export type DraftValues = Partial<Omit<FormValues, MediaFieldName>>;

/**
 * An unpublished listing. Stored in its own owner-only `propertyDrafts`
 * collection so drafts never appear in public listings or student queries.
 */
export type PropertyDraft = {
  id: string;
  landlordId: string;
  title: string;
  /** Wizard step to resume at (1-based). */
  step: number;
  values: DraftValues;
  media: SavedMedia;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
};

const MEDIA_FIELDS = new Set<string>(MEDIA_SLOTS.map((s) => s.field));

/** Strips files and `undefined` (Firestore rejects both) from form values. */
export function toDraftValues(values: Partial<FormValues>): DraftValues {
  const entries = Object.entries(values).filter(([key, value]) => !MEDIA_FIELDS.has(key) && value !== undefined);
  return JSON.parse(JSON.stringify(Object.fromEntries(entries))) as DraftValues;
}

/** How far through the wizard a draft is, as a 0–100 percentage. */
export function draftProgress(draft: Pick<PropertyDraft, 'step'>, totalSteps: number): number {
  return Math.round((Math.max(0, Math.min(draft.step - 1, totalSteps)) / totalSteps) * 100);
}
