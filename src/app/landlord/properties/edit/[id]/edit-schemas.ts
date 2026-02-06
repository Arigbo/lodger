import * as z from 'zod';

export const editFormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  description: z.string().min(10, 'Description is required.'),
  price: z.coerce.number().positive('Price must be a positive number.'),
  currency: z.string().min(3, 'Currency is required.'),
  type: z.enum(['Self Contain', 'Flat', 'BHK', 'Studio', 'Duplex', 'Bungalow', 'Terrace', 'Townhouse', 'Penthouse', 'Mansion', 'House']),
  address: z.string().min(5, 'Address is required.'),
  country: z.string().min(2, 'Country is required.'),
  city: z.string().min(2, 'City is required.'),
  state: z.string().min(2, 'State is required.'),
  zip: z.string().min(5, 'ZIP code is required.'),
  school: z.string().optional(),
  lat: z.coerce.number().optional().or(z.literal('')),
  lng: z.coerce.number().optional().or(z.literal('')),
  bedrooms: z.coerce.number().int().min(1, 'Must have at least 1 bedroom.'),
  bathrooms: z.coerce.number().int().min(1, 'Must have at least 1 bathroom.'),
  area: z.coerce.number().positive('Area must be a positive number.'),
  amenities: z.array(z.string()).default([]),
  rules: z.string().optional(),
});

export type EditFormValues = z.infer<typeof editFormSchema>;
