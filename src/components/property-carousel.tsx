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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, Video, Maximize2 } from "lucide-react";
import { cn } from "@/utils";

interface PropertyCarouselProps {
    images: string[];
    videos?: string[];
    title: string;
    onViewAll?: () => void;
}

export function PropertyCarousel({ images, videos = [], title, onViewAll }: PropertyCarouselProps) {
    const allMedia = [
        ...videos.map(v => ({ type: 'video' as const, url: v })),
        ...images.map(i => ({ type: 'image' as const, url: i }))
    ];

    if (allMedia.length === 0) return null;

    return (
        <div className="relative group w-full h-[400px] md:h-[600px] lg:h-[700px]">
            <Carousel className="w-full h-full" opts={{ loop: true }}>
                <CarouselContent className="h-full ml-0">
                    {allMedia.map((media, index) => (
                        <CarouselItem key={index} className="pl-0 h-[400px] md:h-[600px] lg:h-[700px]">
                            <div className="relative w-full h-full">
                                {media.type === 'image' ? (
                                    <Image
                                        src={media.url}
                                        alt={`${title} - ${index + 1}`}
                                        fill
                                        className="object-cover"
                                        priority={index === 0}
                                    />
                                ) : (
                                    <video
                                        src={media.url}
                                        className="w-full h-full object-cover"
                                        controls
                                        playsInline
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>

                <div className="absolute bottom-8 right-8 flex items-center gap-4 z-20">
                    <div className="flex bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 gap-4 text-white text-[10px] font-black uppercase tracking-widest">
                        <span className="flex items-center gap-2">
                            <Camera className="h-3 w-3" /> {images.length}
                        </span>
                        {videos.length > 0 && (
                            <span className="flex items-center gap-2">
                                <Video className="h-3 w-3" /> {videos.length}
                            </span>
                        )}
                    </div>

                    {onViewAll && (
                        <Button
                            variant="secondary"
                            className="bg-white text-black hover:bg-white/90 rounded-full font-black text-[10px] uppercase tracking-widest h-10 px-6 shadow-2xl"
                            onClick={onViewAll}
                        >
                            <Maximize2 className="h-3 w-3 mr-2" />
                            View Gallery
                        </Button>
                    )}
                </div>

                <div className="absolute top-1/2 -translate-y-1/2 left-8 transition-opacity opacity-0 group-hover:opacity-100 hidden md:block">
                    <CarouselPrevious className="h-12 w-12 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md relative left-0 translate-x-0" />
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 right-8 transition-opacity opacity-0 group-hover:opacity-100 hidden md:block">
                    <CarouselNext className="h-12 w-12 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md relative right-0 translate-x-0" />
                </div>
            </Carousel>
        </div>
    );
}
