'use client';

import React from 'react';
import Image from 'next/image';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import { Camera } from "lucide-react";

interface PropertyHeroCarouselProps {
    images: string[];
    title: string;
}

export function PropertyHeroCarousel({ images, title }: PropertyHeroCarouselProps) {
    if (!images || images.length === 0) return null;

    return (
        <div className="relative group w-full h-[400px] md:h-[600px] lg:h-[700px] overflow-hidden rounded-[2.5rem] shadow-2xl">
            <Carousel className="w-full h-full" opts={{ loop: true }}>
                <CarouselContent className="h-full ml-0">
                    {images.map((image, index) => (
                        <CarouselItem key={index} className="pl-0 h-[400px] md:h-[600px] lg:h-[700px]">
                            <div className="relative w-full h-full">
                                <Image
                                    src={image}
                                    alt={`${title} - ${index + 1}`}
                                    fill
                                    className="object-cover"
                                    priority={index === 0}
                                    sizes="100vw"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>

                <div className="absolute bottom-8 right-8 flex items-center gap-4 z-20">
                    <div className="flex bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 gap-4 text-white text-[10px] font-black uppercase tracking-widest">
                        <span className="flex items-center gap-2">
                            <Camera className="h-3 w-3" /> {images.length} Photos
                        </span>
                    </div>
                </div>

                <div className="absolute top-1/2 -translate-y-1/2 left-8 transition-opacity opacity-0 group-hover:opacity-100 hidden md:block z-30">
                    <CarouselPrevious className="h-12 w-12 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md relative left-0 translate-x-0" />
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 right-8 transition-opacity opacity-0 group-hover:opacity-100 hidden md:block z-30">
                    <CarouselNext className="h-12 w-12 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md relative right-0 translate-x-0" />
                </div>
            </Carousel>
        </div>
    );
}

export default PropertyHeroCarousel;
