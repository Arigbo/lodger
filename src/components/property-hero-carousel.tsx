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
        <div className="relative group w-full h-[400px] md:h-[500px] overflow-hidden rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] bg-black/5">
            <Carousel className="w-full h-full" opts={{ loop: true }}>
                <CarouselContent className="h-full ml-0">
                    {images.map((image, index) => (
                        <CarouselItem key={index} className="pl-0 h-full">
                            <motion.div
                                initial={{ scale: 1.1, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 1.2, ease: "easeOut" }}
                                className="relative w-full h-full"
                            >
                                <Image
                                    src={image}
                                    alt={`${title} - ${index + 1}`}
                                    fill
                                    className="object-cover transform group-hover:scale-105 transition-transform duration-[3s]"
                                    priority={index === 0}
                                    sizes="100vw"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                            </motion.div>
                        </CarouselItem>
                    ))}
                </CarouselContent>

                {/* Floating Info Badges */}
                <div className="absolute top-8 left-8 flex flex-wrap gap-3 z-30">
                    <div className="flex bg-primary/95 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/20 shadow-2xl items-center gap-2 animate-in slide-in-from-left-4 duration-700">
                        <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Verified Space</span>
                    </div>
                </div>

                <div className="absolute bottom-8 right-8 flex items-center gap-4 z-30">
                    <div className="flex bg-white/10 backdrop-blur-2xl px-6 py-3 rounded-2xl border border-white/20 gap-6 text-white text-[11px] font-black uppercase tracking-widest shadow-2xl hover:bg-white/15 transition-colors cursor-default">
                        <span className="flex items-center gap-2.5">
                            <Camera className="h-4 w-4 text-primary" /> {images.length} High-Res Photos
                        </span>
                    </div>
                </div>

                {/* Navigation Controls */}
                <div className="absolute top-1/2 -translate-y-1/2 left-8 transition-all duration-500 opacity-0 group-hover:opacity-100 hidden md:block z-40 transform translate-x-[-20px] group-hover:translate-x-0">
                    <CarouselPrevious className="h-14 w-14 bg-black/20 hover:bg-primary text-white border-white/10 backdrop-blur-xl relative left-0 translate-x-0 shadow-2xl" />
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 right-8 transition-all duration-500 opacity-0 group-hover:opacity-100 hidden md:block z-40 transform translate-x-[20px] group-hover:translate-x-0">
                    <CarouselNext className="h-14 w-14 bg-black/20 hover:bg-primary text-white border-white/10 backdrop-blur-xl relative right-0 translate-x-0 shadow-2xl" />
                </div>
            </Carousel>
        </div>
    );
}

export default PropertyHeroCarousel;
