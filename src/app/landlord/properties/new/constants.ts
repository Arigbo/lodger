export const steps = [
    { id: 1, name: 'Basic Info', fields: ['title', 'type', 'price', 'currency', 'bedrooms', 'bathrooms'] },
    { id: 2, name: 'Location', fields: ['address', 'country', 'city', 'state', 'zip', 'school'] },
    { id: 3, name: 'Amenities & Rules', fields: ['amenities', 'rules'] },
    { id: 4, name: 'Lease Template', fields: ['leaseTemplate'] },
    { id: 5, name: 'Media', fields: ['kitchenImage', 'livingRoomImage', 'bathroomImage', 'bedroomImage', 'otherImage', 'propertyVideo'] },
    { id: 6, name: 'Description', fields: ['description'] },
    { id: 7, name: 'Review & Submit', fields: [] }
];

export const MAX_FILE_SIZE = 5000000;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
export const MAX_VIDEO_SIZE = 50000000; // 50MB
