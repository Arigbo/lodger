"use client";

import React, { useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Property } from '@/types';
import PropertyCard from './property-card';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PropertyCarouselProps {
    properties: Property[];
}

export default function PropertyCarousel({ properties }: PropertyCarouselProps) {
    const [emblaRef, emblaApi] = useEmblaCarousel({
        align: 'start',
        loop: true,
        skipSnaps: false,
        dragFree: true
    });

    const scrollPrev = useCallback(() => {
        if (emblaApi) emblaApi.scrollPrev();
    }, [emblaApi]);

    const scrollNext = useCallback(() => {
        if (emblaApi) emblaApi.scrollNext();
    }, [emblaApi]);

    if (!properties || properties.length === 0) return null;

    return (
        <div className="relative group px-12">
            <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex -ml-6">
                    {properties.map((property) => (
                        <div key={property.id} className="flex-[0_0_100%] min-w-0 pl-6 md:flex-[0_0_50%] lg:flex-[0_0_33.333%] py-4">
                            <div className="h-full transition-transform duration-500 hover:-translate-y-2">
                                <PropertyCard property={property} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation Buttons */}
            <Button
                variant="outline"
                size="icon"
                className="absolute left-0 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full border-2 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl z-20 hover:bg-primary hover:text-primary-foreground hover:border-primary disabled:hidden"
                onClick={scrollPrev}
            >
                <ChevronLeft className="h-6 w-6" />
            </Button>

            <Button
                variant="outline"
                size="icon"
                className="absolute right-0 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full border-2 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl z-20 hover:bg-primary hover:text-primary-foreground hover:border-primary disabled:hidden"
                onClick={scrollNext}
            >
                <ChevronRight className="h-6 w-6" />
            </Button>

            {/* Progress Dots could be added here if needed */}
        </div>
    );
}
