"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cn } from "@/utils";

interface LandingHeroProps {
    imageUrl: string;
    title: string;
    description: string;
}

export function LandingHero({ imageUrl, title, description }: LandingHeroProps) {
    return (
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-20">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <Image
                    src={imageUrl}
                    alt="Hero background"
                    fill
                    className="object-cover scale-105 animate-slow-zoom"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
            </div>

            {/* Dynamic Background Elements */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-1/4 -right-24 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] animate-pulse delay-700" />
            </div>

            <div className="container relative z-10 mx-auto px-4 text-center">
                <div className="max-w-4xl mx-auto">
                    <h1 className="font-headline text-4xl sm:text-6xl md:text-8xl font-black text-white leading-[1.05] tracking-tight mb-8 animate-in fade-in slide-in-from-top-12 duration-1000 fill-mode-both">
                        {title.split(' ').map((word, i) => (
                            <React.Fragment key={i}>
                                {word === "Perfect" || word === "Student" ? (
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-primary bg-[length:200%_auto] animate-gradient-x mx-2">
                                        {word}
                                    </span>
                                ) : (
                                    <span>{word} </span>
                                )}
                            </React.Fragment>
                        ))}
                    </h1>

                    <p className="mt-8 text-lg sm:text-2xl text-white/80 leading-relaxed max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both">
                        {description}
                    </p>

                    <div className="mt-12 flex flex-col sm:flex-row gap-6 justify-center items-center animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500 fill-mode-both">
                        <Button asChild size="lg" className="h-16 px-10 text-xl font-bold rounded-2xl shadow-2xl shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-1 bg-gradient-to-r from-primary to-blue-600 border-none">
                            <Link href="/student/properties" className="flex items-center">
                                Find Your Home <ArrowRight className="ml-2 h-6 w-6" />
                            </Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="h-16 px-10 text-xl font-bold rounded-2xl bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10 transition-all hover:-translate-y-1 hover:border-white/30">
                            <Link href="/landlord">
                                List Property
                            </Link>
                        </Button>
                    </div>

                    {/* Trust Indicators */}
                    <div className="mt-20 pt-10 border-t border-white/10 flex flex-wrap justify-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-700 fill-mode-both">
                        <div className="flex items-center gap-2 text-white font-bold tracking-widest text-xs uppercase">
                            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                            2,000+ Properties
                        </div>
                        <div className="flex items-center gap-2 text-white font-bold tracking-widest text-xs uppercase">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping delay-150" />
                            15,000+ Students
                        </div>
                        <div className="flex items-center gap-2 text-white font-bold tracking-widest text-xs uppercase">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-ping delay-300" />
                            Verified Landlords
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
                <div className="w-6 h-10 rounded-full border-2 border-white flex justify-center p-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-scroll-pill" />
                </div>
            </div>
        </section>
    );
}
