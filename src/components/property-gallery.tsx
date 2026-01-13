'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Play, Maximize2, X, ChevronLeft, ChevronRight, Video as VideoIcon, Camera } from 'lucide-react';
import { cn } from '@/utils';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";

interface PropertyGalleryProps {
    images: string[];
    videos?: string[];
    title: string;
}

export function PropertyGallery({ images, videos = [], title }: PropertyGalleryProps) {
    const [selectedMedia, setSelectedMedia] = useState<{ type: 'image' | 'video'; url: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'photos' | 'videos'>(videos.length > 0 ? 'all' : 'photos');

    const allMedia = [
        ...videos.map(v => ({ type: 'video' as const, url: v })),
        ...images.map(i => ({ type: 'image' as const, url: i }))
    ];

    const filteredMedia = activeTab === 'all'
        ? allMedia
        : activeTab === 'photos'
            ? allMedia.filter(m => m.type === 'image')
            : allMedia.filter(m => m.type === 'video');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex bg-muted/30 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl">
                    {videos.length > 0 && (
                        <button
                            onClick={() => setActiveTab('all')}
                            className={cn(
                                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300",
                                activeTab === 'all'
                                    ? "bg-primary text-white shadow-lg shadow-primary/25 ring-1 ring-white/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                            )}
                        >
                            All ({allMedia.length})
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('photos')}
                        className={cn(
                            "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300",
                            activeTab === 'photos'
                                ? "bg-primary text-white shadow-lg shadow-primary/25 ring-1 ring-white/20"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                    >
                        Photos ({images.length})
                    </button>
                    {videos.length > 0 && (
                        <button
                            onClick={() => setActiveTab('videos')}
                            className={cn(
                                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300",
                                activeTab === 'videos'
                                    ? "bg-primary text-white shadow-lg shadow-primary/25 ring-1 ring-white/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                            )}
                        >
                            Videos ({videos.length})
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredMedia.map((media, index) => (
                    <div
                        key={index}
                        className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted/10 border border-white/10 cursor-pointer"
                        onClick={() => setSelectedMedia(media)}
                    >
                        {media.type === 'image' ? (
                            <Image
                                src={media.url}
                                alt={`${title} - ${index}`}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                        ) : (
                            <div className="relative w-full h-full">
                                <video
                                    src={media.url}
                                    className="w-full h-full object-cover"
                                    muted
                                    playsInline
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-colors group-hover:bg-black/20">
                                    <div className="h-14 w-14 rounded-full bg-primary/90 flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform">
                                        <Play className="h-6 w-6 ml-1 fill-current" />
                                    </div>
                                </div>
                                <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                                    <VideoIcon className="h-3 w-3 text-white" />
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Video</span>
                                </div>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                            <div className="flex items-center gap-2 text-white">
                                <Maximize2 className="h-4 w-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">View Fullscreen</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
                <DialogContent className="max-w-[95vw] md:max-w-7xl border-none bg-black/95 backdrop-blur-2xl p-0 overflow-hidden rounded-2xl md:rounded-3xl h-auto max-h-[90vh]">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Media Viewer</DialogTitle>
                    </DialogHeader>

                    <div className="relative w-full h-full flex items-center justify-center min-h-[40vh] md:min-h-[50vh]">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 md:top-6 md:right-6 h-10 w-10 md:h-12 md:w-12 rounded-full bg-white/10 text-white hover:bg-white/20 z-50 backdrop-blur-md border border-white/10"
                            onClick={() => setSelectedMedia(null)}
                        >
                            <X className="h-5 w-5 md:h-6 md:w-6" />
                        </Button>

                        {selectedMedia?.type === 'image' ? (
                            <div className="relative w-full h-full aspect-[4/3] md:aspect-[16/9]">
                                <Image
                                    src={selectedMedia.url}
                                    alt={title}
                                    fill
                                    className="object-contain"
                                />
                            </div>
                        ) : (
                            <div className="w-full flex items-center justify-center p-4">
                                <video
                                    src={selectedMedia?.url}
                                    className="w-full h-auto max-h-[70vh] md:max-h-[85vh] rounded-xl md:rounded-3xl"
                                    controls
                                    autoPlay
                                />
                            </div>
                        )}

                        <div className="absolute bottom-4 left-4 right-4 md:bottom-8 md:left-8 md:right-8 flex items-center justify-between pointer-events-none">
                            <div className="bg-black/60 backdrop-blur-xl px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl border border-white/10">
                                <p className="text-white font-black uppercase tracking-widest text-[10px] md:text-sm truncate max-w-[150px] md:max-w-none">{title}</p>
                                <div className="flex items-center gap-2 md:gap-4 mt-1 md:mt-2">
                                    <span className="flex items-center gap-1 md:gap-2 text-white/40 text-[8px] md:text-[10px] font-bold uppercase tracking-widest">
                                        {selectedMedia?.type === 'image' ? <Camera className="h-2 w-2 md:h-3 md:w-3" /> : <VideoIcon className="h-2 w-2 md:h-3 md:w-3" />}
                                        {selectedMedia?.type}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
