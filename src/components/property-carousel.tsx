'use client';

import React from 'react';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import type { Property } from "@/types";
import PropertyCard from "./property-card";

interface PropertyCarouselProps {
    properties: Property[];
}

export function PropertyCarousel({ properties }: PropertyCarouselProps) {
    if (!properties || properties.length === 0) return null;

    return (
        <Carousel
            opts={{
                align: "start",
                loop: true,
            }}
            className="w-full relative px-4 sm:px-0"
        >
            <CarouselContent className="-ml-4 sm:-ml-6 pb-8">
                {properties.map((property) => (
                    <CarouselItem key={property.id} className="pl-4 sm:pl-6 basis-full sm:basis-1/2 lg:basis-1/3">
                        <PropertyCard property={property} />
                    </CarouselItem>
                ))}
            </CarouselContent>

            <div className="hidden md:flex absolute -left-12 top-1/2 -translate-y-1/2">
                <CarouselPrevious className="h-12 w-12 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md relative left-0 translate-x-0" />
            </div>
            <div className="hidden md:flex absolute -right-12 top-1/2 -translate-y-1/2">
                <CarouselNext className="h-12 w-12 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md relative right-0 translate-x-0" />
            </div>
        </Carousel>
    );
}

export default PropertyCarousel;
