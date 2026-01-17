export const PROPERTY_TYPES = [
    {
        value: "Self Contain",
        label: "Self Contain",
        description: "A single room serving as bedroom and living area, with an ensuite kitchen and bathroom."
    },
    {
        value: "Flat",
        label: "Flat / Apartment",
        description: "A standard residential unit within a building, featuring separate bedrooms and living spaces."
    },
    {
        value: "BHK",
        label: "BHK",
        description: "Bedroom, Hall, Kitchen. A standard apartment configuration (e.g., 2BHK is 2 beds, hall, kitchen)."
    },
    {
        value: "Studio",
        label: "Studio",
        description: "An open-plan unit combining living, sleeping, and kitchen areas, typically with a separate bathroom."
    },
    {
        value: "Duplex",
        label: "Duplex",
        description: "A residential unit spread over two floors connected by an indoor staircase."
    },
    {
        value: "Bungalow",
        label: "Bungalow",
        description: "A detached, single-story house, often with a veranda."
    },
    {
        value: "Terrace",
        label: "Terrace",
        description: "A row of identical houses sharing side walls with neighbors."
    },
    {
        value: "Townhouse",
        label: "Townhouse",
        description: "A tall, narrow, multi-story house, usually part of a row or complex."
    },
    {
        value: "Penthouse",
        label: "Penthouse",
        description: "A luxurious apartment located on the top floor of a building, often with exclusive features."
    },
    {
        value: "Mansion",
        label: "Mansion",
        description: "A large, impressive, and luxurious standalone house."
    },
    {
        value: "House",
        label: "House",
        description: "A generic term for a standalone residential building."
    }
] as const;

export type PropertyType = typeof PROPERTY_TYPES[number]['value'];
