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
import { motion } from "framer-motion";

interface PropertyHeroCarouselProps {
    images: string[];
    title: string;
}

export function PropertyHeroCarousel({ images, title }: PropertyHeroCarouselProps) {
    if (!images || images.length === 0) return null;

    return (
        <div className="relative group w-full h-[300px] md:h-[350px] overflow-hidden rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] bg-black/5">
            <Carousel className="w-full h-full" opts={{ loop: true }}>
                <CarouselContent className="h-full ml-0 [&>div]:h-full">
                    {images.map((image, index) => (
                        <CarouselItem key={index} className="pl-0 h-full">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5 }}
                                className="relative w-full h-full"
                            >
                                <Image
                                    src={image}
                                    alt={`${title} - ${index + 1}`}
                                    fill
                                    className="object-cover transform group-hover:scale-105 transition-transform duration-[3s]"
                                    priority={index === 0}
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                            </motion.div>
                        </CarouselItem>
                    ))}
                </CarouselContent>

                <div className="absolute bottom-6 right-6 flex items-center gap-4 z-30">
                    <div className="flex bg-black/40 backdrop-blur-2xl px-4 py-2 rounded-2xl border border-white/10 gap-4 text-white text-[10px] font-black uppercase tracking-widest shadow-2xl">
                        <span className="flex items-center gap-2">
                            <Camera className="h-3.5 w-3.5 text-primary" /> {images.length} Photos
                        </span>
                    </div>
                </div>

                {/* Navigation Controls */}
                <div className="absolute top-1/2 -translate-y-1/2 left-6 transition-all duration-500 opacity-0 group-hover:opacity-100 hidden md:block z-40">
                    <CarouselPrevious className="h-12 w-12 bg-white/10 hover:bg-primary text-white border-white/10 backdrop-blur-xl relative left-0 translate-x-0 shadow-2xl" />
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 right-6 transition-all duration-500 opacity-0 group-hover:opacity-100 hidden md:block z-40">
                    <CarouselNext className="h-12 w-12 bg-white/10 hover:bg-primary text-white border-white/10 backdrop-blur-xl relative right-0 translate-x-0 shadow-2xl" />
                </div>
            </Carousel>
        </div>
    );
}

export default PropertyHeroCarousel;
