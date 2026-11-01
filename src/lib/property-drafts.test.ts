import { describe, expect, it } from 'vitest';
import { draftProgress, toDraftValues } from './property-drafts';

describe('property drafts', () => {
  it('drops file fields and undefined values', () => {
    const values = toDraftValues({
      title: 'Cosy room',
      price: 500,
      school: undefined,
      kitchenImage: { length: 1 } as unknown as FileList,
      propertyVideo: null,
    });
    expect(values).toEqual({ title: 'Cosy room', price: 500 });
  });

  it('computes progress from the step reached', () => {
    expect(draftProgress({ step: 1 }, 7)).toBe(0);
    expect(draftProgress({ step: 4 }, 7)).toBe(43);
    expect(draftProgress({ step: 8 }, 7)).toBe(100);
  });
});
