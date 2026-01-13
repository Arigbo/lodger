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
        <div className="relative group w-full h-[400px] md:h-[550px] lg:h-[650px] overflow-hidden rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] bg-black/5">
            <Carousel className="w-full h-full" opts={{ loop: true }}>
                <CarouselContent className="h-full ml-0 [&>div]:h-full">
                    {images.map((image, index) => (
                        <CarouselItem key={index} className="pl-0 h-full relative">
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
                                    className="object-cover transform group-hover:scale-105 transition-transform duration-[4s] ease-out"
                                    priority={index === 0}
                                    sizes="100vw"
                                />
                                {/* Softened Gradient for better image visibility */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
                            </motion.div>

                            {/* Image Counter Overlay */}
                            <div className="absolute bottom-8 left-8 z-30 flex items-center gap-3">
                                <div className="bg-white/10 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/20 shadow-2xl">
                                    <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                                        Ref. {index + 1} <span className="text-white/40 mx-1">/</span> {images.length}
                                    </p>
                                </div>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>

                <div className="absolute bottom-8 right-8 flex items-center gap-4 z-30">
                    <div className="flex bg-primary/90 backdrop-blur-2xl px-5 py-2.5 rounded-2xl border border-white/10 gap-3 text-white text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-primary transition-colors cursor-pointer group/badge">
                        <Camera className="h-4 w-4 transition-transform group-hover/badge:scale-110" />
                        <span>View All {images.length}</span>
                    </div>
                </div>

                {/* Navigation Controls - More prominent and elegant */}
                <div className="absolute top-1/2 -translate-y-1/2 left-8 transition-all duration-500 opacity-0 group-hover:opacity-100 hidden md:block z-40">
                    <CarouselPrevious className="h-14 w-14 bg-white/10 hover:bg-primary text-white border-white/10 backdrop-blur-2xl relative left-0 translate-x-0 shadow-2xl transition-all hover:scale-110 active:scale-95" />
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 right-8 transition-all duration-500 opacity-0 group-hover:opacity-100 hidden md:block z-40">
                    <CarouselNext className="h-14 w-14 bg-white/10 hover:bg-primary text-white border-white/10 backdrop-blur-2xl relative right-0 translate-x-0 shadow-2xl transition-all hover:scale-110 active:scale-95" />
                </div>
            </Carousel>
        </div>
    );
}

export default PropertyHeroCarousel;
