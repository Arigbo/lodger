import { describe, expect, it } from 'vitest';
import type { Property } from '@/types';
import { propertyJsonLd, propertyMetadata, truncate } from './seo';

const property: Property = {
  id: 'abc',
  title: 'Cosy Studio',
  description: 'A bright studio flat a short walk from campus.',
  price: 500,
  currency: 'USD',
  type: 'Studio' as Property['type'],
  location: { address: '1 Road', city: 'Lagos', state: 'Lagos', country: 'Nigeria', zip: '100001', school: 'UNILAG' },
  bedrooms: 1,
  bathrooms: 1,
  area: 300,
  amenities: ['Wi-Fi'],
  images: ['https://example.com/a.jpg'],
  landlordId: 'l1',
  status: 'available',
  rules: [],
};

describe('seo helpers', () => {
  it('truncates on a word boundary', () => {
    expect(truncate('one two three four', 10)).toBe('one two…');
    expect(truncate('short', 10)).toBe('short');
  });

  it('builds canonical metadata for a property', () => {
    const meta = propertyMetadata(property);
    expect(meta.alternates?.canonical).toBe('/properties/abc');
    expect(String(meta.title)).toContain('Cosy Studio');
    expect(meta.robots).toBeUndefined();
  });

  it('noindexes occupied listings', () => {
    expect(propertyMetadata({ ...property, status: 'occupied' }).robots).toEqual({ index: false, follow: true });
  });

  it('emits schema.org accommodation data', () => {
    const ld = propertyJsonLd(property);
    expect(ld['@type']).toBe('Accommodation');
    expect(ld.offers.priceCurrency).toBe('USD');
    expect(ld.address.addressLocality).toBe('Lagos');
  });
});
