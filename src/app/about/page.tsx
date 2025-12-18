import React from 'react';
import Image from 'next/image';
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Globe, ShieldCheck, Users } from "lucide-react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = {
    title: "About Us | Lodger",
    description: "Learn more about Lodger's mission to simplify student living and provide secure, verified rental solutions.",
};

const stats = [
    { label: 'Verified Listings', value: '2,000+' },
    { label: 'Student Users', value: '15,000+' },
    { label: 'Partner Universities', value: '50+' },
    { label: 'Secure Contracts', value: '100%' },
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
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <section className="relative py-20 bg-primary overflow-hidden lg:py-32">
                <div className="absolute inset-0 opacity-10">
                    <svg className="h-full w-full" fill="none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 10" stroke="white" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100" height="100" fill="url(#grid)" />
                    </svg>
                </div>
                <div className="container relative mx-auto px-4 text-center">
                    <h1 className="font-headline text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
                        Simplifying Student Living
                    </h1>
                    <p className="mt-6 mx-auto max-w-2xl text-xl text-primary-foreground/90">
                        Lodger was founded on a simple idea: finding a student home should be as easy as booking a hotel.
                    </p>
                </div>
            </section>

            {/* Mission Section */}
            <section className="py-20 lg:py-24">
                <div className="container mx-auto px-4">
                    <div className="grid gap-12 lg:grid-cols-2 items-center">
                        <div>
                            <h2 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
                                Our Mission
                            </h2>
                            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                                Finding the right accommodation is more than just getting a roof over your head; it's about finding a place where you can thrive during your most transformative years.
                            </p>
                            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                                Lodger bridge the gap between students and landlords with a platform that prioritizes security, transparency, and ease of use. Whether you're moving across town or across the globe, we're here to make sure you land in the right spot.
                            </p>
                            <div className="mt-8">
                                <Button asChild size="lg">
                                    <Link href="/student/properties">Explore Properties</Link>
                                </Button>
                            </div>
                        </div>
                        <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl border-4 border-background">
                            <Image
                                src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop"
                                alt="Students studying together"
                                fill
                                className="object-cover"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="bg-secondary/30 py-16">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat, index) => (
                            <div key={index} className="text-center">
                                <div className="text-3xl font-bold text-primary sm:text-4xl">{stat.value}</div>
                                <div className="mt-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Values Section */}
            <section className="py-20 lg:py-24">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
                        Our Core Values
                    </h2>
                    <p className="mt-4 mx-auto max-w-2xl text-muted-foreground">
                        These principles guide everything we do and every feature we build.
                    </p>
                    <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        {values.map((value, index) => (
                            <Card key={index} className="border-none shadow-md hover:shadow-xl transition-shadow duration-300">
                                <CardContent className="pt-8">
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                        <value.icon className="h-7 w-7" />
                                    </div>
                                    <h3 className="mt-6 text-xl font-bold">{value.title}</h3>
                                    <p className="mt-4 text-muted-foreground">
                                        {value.description}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <div className="relative rounded-3xl bg-slate-900 px-8 py-16 shadow-2xl overflow-hidden text-center sm:px-16 sm:py-24">
                        <div className="relative z-10">
                            <h2 className="font-headline text-3xl font-bold tracking-tight text-white sm:text-5xl">
                                Ready to find your next home?
                            </h2>
                            <p className="mt-6 mx-auto max-w-xl text-lg text-slate-300">
                                Join thousands of students who have already found their perfect university stay with Lodger.
                            </p>
                            <div className="mt-10 flex flex-wrap justify-center gap-4">
                                <Button size="lg" variant="default" className="h-14 px-8 text-lg" asChild>
                                    <Link href="/auth/signup">Get Started Now</Link>
                                </Button>
                                <Button size="lg" variant="outline" className="h-14 px-8 text-lg bg-transparent text-white border-slate-700 hover:bg-slate-800" asChild>
                                    <Link href="/landlord">For Landlords</Link>
                                </Button>
                            </div>
                        </div>
                        {/* Background elements */}
                        <div className="absolute -top-24 -left-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl opacity-50" />
                        <div className="absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl opacity-50" />
                    </div>
                </div>
            </section>
        </div>
    );
}
