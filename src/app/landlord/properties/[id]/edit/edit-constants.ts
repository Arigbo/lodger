import type { EditFormValues } from "./edit-schemas";
export const DEFAULT_EDIT_VALUES: EditFormValues = {
  title: '',
  description: '',
  price: 0,
  currency: 'USD',
  type: 'Flat',
  address: '',
  country: '',
  city: '',
  state: '',
  zip: '',
  school: '',
  lat: '',
  lng: '',
  bedrooms: 1,
  bathrooms: 1,
  area: 0,
  amenities: [] as string[],
  rules: '',
};

export const MOCK_RATES: Record<string, number> = {
  'USD': 1,
  'NGN': 1600,
  'GHS': 15,
  'KES': 130,
  'GBP': 0.79,
  'EUR': 0.92,
};
