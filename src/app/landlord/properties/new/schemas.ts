import * as z from 'zod';
import { MAX_FILE_SIZE, ACCEPTED_IMAGE_TYPES, MAX_VIDEO_SIZE, ACCEPTED_VIDEO_TYPES } from './constants';

export const imageSchema = z.any()
    .refine((files) => !files || files.length === 0 || files.length === 1, "Only one image per slot.")
    .refine((files) => !files || files.length === 0 || files[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
        (files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files[0]?.type),
        "Only .jpg, .jpeg, .png and .webp formats are supported."
    );

export const videoSchema = z.any()
    .refine((files) => !files || files.length === 0 || files.length === 1, "Only one video permitted.")
    .refine((files) => !files || files.length === 0 || files[0]?.size <= MAX_VIDEO_SIZE, `Max video size is 50MB.`)
    .refine(
        (files) => !files || files.length === 0 || ACCEPTED_VIDEO_TYPES.includes(files[0]?.type),
        "Only .mp4, .webm, .ogg and .mov formats are supported."
    );

export const formSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters.'),
    description: z.string().min(10, 'Description must be at least 10 characters.').optional().or(z.literal('')),
    price: z.coerce.number().positive('Price must be a positive number.'),
    currency: z.string().min(3, 'Currency is required.'),
    type: z.enum(['Flat', 'House', 'Duplex', 'Bungalow', 'Terrace', 'Penthouse', 'Mansion', 'Studio', 'Self Contain', 'BHK', 'Townhouse']),
    address: z.string().min(5, 'Address is required.'),
    country: z.string().min(2, 'Country is required.'),
    city: z.string().min(2, 'City is required.'),
    state: z.string().min(2, 'State is required.'),
    zip: z.string().min(2, 'Zip code is required.'),
    school: z.string().optional(),
    bedrooms: z.coerce.number().int().min(0, 'Bedrooms must be 0 or more.'),
    bathrooms: z.coerce.number().int().min(1, 'Must have at least 1 bathroom.'),
    amenities: z.array(z.string()).refine((value) => value.some((item) => item), {
        message: 'You have to select at least one amenity.',
    }),
    rules: z.string().optional(),
    leaseTemplate: z.string().min(100, 'Lease template must not be empty.'),
    kitchenImage: imageSchema,
    livingRoomImage: imageSchema,
    bathroomImage: imageSchema,
    bedroomImage: imageSchema,
    otherImage: imageSchema.optional(),
    propertyVideo: videoSchema.optional(),
    lat: z.coerce.number().optional().or(z.literal('')),
    lng: z.coerce.number().optional().or(z.literal('')),
});

export type FormValues = z.infer<typeof formSchema>;
