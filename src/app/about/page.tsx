"use client";

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Globe, ShieldCheck, Users } from "lucide-react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import AboutTeam from '@/components/about-team';
import { LandingHero } from '@/components/landing-hero';
import { StatCard } from '@/components/stat-card';

const stats = [
    { label: 'Verified Listings', value: 2000, suffix: '+' },
    { label: 'Student Users', value: 15000, suffix: '+' },
    { label: 'Partner Universities', value: 50, suffix: '+' },
    { label: 'Secure Contracts', value: 100, suffix: '%' },
];


const values = [
    {
        title: "Transparency First",
        description: "We believe in clear, honest communication between landlords and tenants. No hidden fees, no surprises.",
        icon: ShieldCheck,
    },
    {
        title: "Student-Centric",
        description: "Every feature we build is designed to solve the unique challenges students face when looking for a home.",
        icon: Users,
    },
    {
        title: "Global Vision",
        description: "Supporting students across different countries and currencies to provide a seamless relocation experience.",
        icon: Globe,
    },
    {
        title: "Verified Quality",
        description: "Every property on our platform undergoes a verification process to ensure it's safe and accurately represented.",
        icon: CheckCircle2,
    },
];

export default function AboutPage() {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            {/* Premium Hero Section */}
            <LandingHero
                imageUrl="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop"
                title="About Lodger"
                description="The new standard of student living. Lodger is a technology-driven platform connecting students with verified landlords."
            />

            {/* Mission Section */}
            <section className="py-16 sm:py-24 md:py-32 bg-secondary/10 overflow-hidden">
                <div className="container mx-auto px-4">
                    <div className="grid gap-8 sm:gap-12 md:gap-20 lg:grid-cols-2 items-center">
                        <div className="relative hidden lg:block animate-in fade-in slide-in-from-left-20 duration-1000 fill-mode-both">
                            <div className="absolute -top-6 -left-6 w-16 h-16 sm:w-24 sm:h-24 bg-primary/20 rounded-2xl blur-2xl" />
                            <div className="absolute -bottom-6 -right-6 w-16 h-16 sm:w-24 sm:h-24 bg-blue-500/20 rounded-2xl blur-2xl" />
                            <div className="relative aspect-[4/3] rounded-2xl sm:rounded-3xl md:rounded-[3rem] overflow-hidden shadow-2xl border-4 sm:border-8 border-background ring-1 ring-border group">
                                <Image
                                    src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop"
                                    alt="Students studying together"
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                            </div>
                        </div>

                        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-right-20 duration-1000 fill-mode-both">
                            <div>
                                <h2 className="font-headline text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4 sm:mb-6"> Our Mission </h2>
                                <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed">
                                    Lodger is more than a booking platform. We are a technology-driven ecosystem built by <span className="text-primary font-bold italic">Ancients</span>, dedicated to simplifying the housing journey and ensuring every student has a safe, verified place to call home.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div className="flex gap-6 p-8 rounded-[2rem] bg-background/80 border border-border/50 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group">
                                    <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                        <ShieldCheck className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xl mb-1">Uncompromising Safety</h4>
                                        <p className="text-muted-foreground">Every property undergoes a rigorous verification process to ensure transparency and security.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6 p-8 rounded-[2rem] bg-background/80 border border-border/50 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group">
                                    <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                        <Globe className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xl mb-1">Industry Innovation</h4>
                                        <p className="text-muted-foreground">We empower landlords and students with smart tools designed to solve the complexities of modern student living.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-32 border-y border-border/50 bg-background relative overflow-hidden">
                <div className="container mx-auto px-4 relative z-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
                        {stats.map((stat, index) => (
                            <StatCard key={index} {...stat} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Team & Testimonials Section */}
            <section className="py-32">
                <AboutTeam />
            </section>

            {/* CTA Section */}
            <section className="pb-32 container mx-auto px-4 overflow-hidden">
                <div className="relative rounded-2xl sm:rounded-3xl md:rounded-[3rem] bg-foreground text-background px-4 sm:px-8 py-16 sm:py-24 md:py-40 shadow-2xl overflow-hidden text-center group animate-in fade-in zoom-in-95 duration-1000 fill-mode-both">
                    <div className="absolute inset-0 z-0">
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.3),transparent_50%)]" />
                        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_50%,rgba(147,51,234,0.3),transparent_50%)]" />
                    </div>

                    <div className="relative z-10 max-w-4xl mx-auto">
                        <h2 className="font-headline text-2xl sm:text-4xl md:text-7xl font-bold tracking-tight mb-6 sm:mb-8">
                            Ready to join the <br /> <span className="italic text-primary">Lodger</span> movement?
                        </h2>
                        <p className="text-base sm:text-xl md:text-2xl text-muted-foreground mb-8 sm:mb-16 max-w-2xl mx-auto opacity-80">
                            Whether you're a student seeking safety or a landlord seeking efficiency, we're here to help you move forward.
                        </p>
                        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-8">
                            <Button size="lg" variant="default" className="h-14 sm:h-20 px-6 sm:px-12 text-base sm:text-2xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl sm:rounded-[2rem] shadow-2xl shadow-primary/40 hover:-translate-y-1 transition-all w-full sm:w-auto" asChild>
                                <Link href="/auth/signup">Get Started</Link>
                            </Button>
                            <Button size="lg" variant="outline" className="h-14 sm:h-20 px-6 sm:px-12 text-base sm:text-2xl font-bold bg-transparent border-white/20 hover:bg-white/10 rounded-xl sm:rounded-[2rem] hover:-translate-y-1 transition-all w-full sm:w-auto" asChild>
                                <Link href="/landlord">Learn More</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
