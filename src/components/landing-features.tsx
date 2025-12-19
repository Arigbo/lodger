"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Building, UserCheck, ArrowRight } from "lucide-react";
import { cn } from "@/utils";

const features = [
    {
        title: "Search & Discover",
        description: "Browse thousands of verified listings near your university with powerful search filters tailored for students.",
        icon: Search,
        color: "bg-primary/10 text-primary"
    },
    {
        title: "View Properties",
        description: "Explore detailed photos, comprehensive descriptions, and immersive virtual tours to find your perfect fit.",
        icon: Building,
        color: "bg-blue-500/10 text-blue-500"
    },
    {
        title: "Request to Rent",
        description: "Seamlessly connect with landlords and submit rental requests directly through our secure platform.",
        icon: UserCheck,
        color: "bg-green-500/10 text-green-500"
    }
];

export function LandingFeatures() {
    return (
        <section id="how-it-works" className="py-32 bg-secondary/30 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-border to-transparent" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-24 animate-in fade-in slide-in-from-bottom-12 duration-1000 fill-mode-both">
                    <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-black uppercase tracking-widest mb-8">
                        <ArrowRight className="h-3 w-3" /> How It Works
                    </div>
                    <h2 className="font-headline text-4xl md:text-6xl font-black mb-8 leading-tight">
                        Finding Your Next Home <br /> <span className="text-primary italic">Simplified</span>
                    </h2>
                    <p className="text-xl text-muted-foreground leading-relaxed">
                        We've built the ultimate ecosystem to bridge the gap between ambitious students and the perfect living space.
                    </p>
                </div>

                <div className="grid gap-10 md:grid-cols-3">
                    {features.map((feature, i) => (
                        <div
                            key={i}
                            className={cn(
                                "group relative p-10 rounded-[3rem] bg-background border border-border/50 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-4",
                                "animate-in fade-in slide-in-from-bottom-16 duration-1000 fill-mode-both"
                            )}
                            style={{ animationDelay: `${i * 200}ms` }}
                        >
                            <div className="absolute top-10 right-10 text-[6rem] font-black text-foreground/[0.03] leading-none pointer-events-none group-hover:text-primary/5 transition-colors">
                                0{i + 1}
                            </div>

                            <div className={cn(
                                "flex h-20 w-20 items-center justify-center rounded-3xl mb-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3",
                                feature.color
                            )}>
                                <feature.icon className="h-10 w-10" />
                            </div>

                            <h3 className="font-headline text-2xl font-bold mb-6">{feature.title}</h3>
                            <p className="text-muted-foreground text-lg leading-relaxed">
                                {feature.description}
                            </p>

                            <div className="mt-8 flex items-center gap-2 text-primary font-bold text-sm opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                                Learn More <ArrowRight className="h-4 w-4" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
