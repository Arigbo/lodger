'use client';

import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
    User,
    Linkedin,
    Twitter,
    Github,
    Mail,
    GraduationCap,
    Award,
    Quote,
    Star,
    ChevronRight,
    ArrowLeft,
    CheckCircle2
} from "lucide-react";
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/utils';
import Image from 'next/image';

type TeamMember = {
    id: string;
    name: string;
    role: string;
    image: string;
    useUserImage?: boolean;
    education: string;
    bio: string;
    socials: {
        linkedin?: string;
        twitter?: string;
        github?: string;
    };
};

const teamMembers: TeamMember[] = [
    {
        id: 'user',
        name: 'Co-founder',
        role: 'Co-founder',
        image: '',
        useUserImage: true,
        education: 'University of Technology, Computer Science',
        bio: 'Visionary co-founder focused on revolutionizing the student housing experience through technology and transparent systems.',
        socials: {
            linkedin: 'https://linkedin.com',
            twitter: 'https://twitter.com',
            github: 'https://github.com'
        }
    },
    {
        id: 'daniel',
        name: 'Oye Daniel',
        role: 'Co-founder',
        image: '/images/team/daniel.png',
        education: 'Business Administration & Entrepreneurship',
        bio: 'Business strategist with a passion for building scalable solutions that empower local communities and simplify complex real estate processes.',
        socials: {
            linkedin: 'https://linkedin.com',
            twitter: 'https://twitter.com'
        }
    },
    {
        id: 'samuel',
        name: 'Samuel (sampha)',
        role: 'Lead Designer',
        image: '/images/team/samuel.png',
        education: 'Visual Arts & Product Design',
        bio: 'Creative mind behind the seamless Lodger UI/UX. Samuel ensures that every interaction feels premium, intuitive, and beautiful.',
        socials: {
            linkedin: 'https://linkedin.com',
            github: 'https://github.com'
        }
    },
    {
        id: 'austin',
        name: 'Austin',
        role: 'Lead BA',
        image: '/images/team/austin.png',
        education: 'Corporate Strategy & Analytics',
        bio: 'Leading the business analysis efforts to ensure every feature aligns with market needs and provides maximum value to both students and landlords.',
        socials: {
            linkedin: 'https://linkedin.com'
        }
    },
    {
        id: 'gabriel',
        name: 'Gabriel Igeu',
        role: 'Associate BA',
        image: '/images/team/gabriel.png',
        education: 'Information Management Systems',
        bio: 'Assisting in product strategy and requirements gathering, Gabriel bridges the gap between technical execution and business goals.',
        socials: {
            linkedin: 'https://linkedin.com'
        }
    }
];

const testimonials = [
    {
        name: "Sarah Johnson",
        role: "International Student",
        content: "Finding a home while overseas was daunting until I found Lodger. The verified listings and secure payments gave me total peace of mind.",
        rating: 5,
        image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1974&auto=format&fit=crop"
    },
    {
        name: "David Chen",
        role: "Graduate Student",
        content: "The lease signing process is so smooth. Everything is legal, transparent, and completely digital. Highly recommended!",
        rating: 5,
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop"
    },
    {
        name: "Mrs. Adeyemi",
        role: "Property Owner",
        content: "As a landlord, Lodger has made managing my properties and finding reliable student tenants incredibly easy and stress-free.",
        rating: 5,
        image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1976&auto=format&fit=crop"
    }
];

export default function AboutTeam() {
    const { user } = useUser();
    const firestore = useFirestore();
    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<any>(userDocRef);

    const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

    const currentUserName = userProfile?.name || user?.displayName || 'Co-founder';
    const currentUserImage = userProfile?.profileImageUrl || user?.photoURL;

    return (
        <div className="space-y-32">
            {/* Team Section */}
            <section className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                    <div className="max-w-2xl">
                        <Badge variant="outline" className="mb-4 px-4 py-1 border-primary/30 text-primary">Our Visionaries</Badge>
                        <h2 className="font-headline text-4xl font-bold tracking-tight sm:text-5xl">Meet the minds behind <span className="text-primary italic">Lodger</span></h2>
                        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                            A diverse team of designers, strategists, and engineers working together to redefine student living across the globe.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {teamMembers.map((member) => {
                        const isExpanded = expandedMemberId === member.id;
                        const name = member.id === 'user' ? currentUserName : member.name;
                        const image = member.id === 'user' ? currentUserImage : member.image;

                        return (
                            <div
                                key={member.id}
                                className={cn(
                                    "relative h-[320px] rounded-3xl overflow-hidden transition-all duration-700 ease-in-out group",
                                    "border-2 border-transparent hover:border-primary/20",
                                    isExpanded ? "shadow-2xl ring-4 ring-primary/5" : "shadow-lg bg-card"
                                )}
                            >
                                <div className="flex h-full w-full">
                                    {/* Left Area: Image */}
                                    <div className={cn(
                                        "relative h-full transition-all duration-700 ease-in-out overflow-hidden flex-shrink-0",
                                        isExpanded ? "w-[30%] sm:w-[25%]" : "w-[45%]"
                                    )}>
                                        {image ? (
                                            <Image
                                                src={image}
                                                alt={name}
                                                fill
                                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="h-full w-full bg-secondary flex items-center justify-center">
                                                <User className="h-20 w-20 text-muted-foreground/30" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/10" />
                                    </div>

                                    {/* Right Area: Info/Bio */}
                                    <div className={cn(
                                        "h-full transition-all duration-700 ease-in-out flex flex-col p-8 md:p-10 flex-grow",
                                        isExpanded ? "bg-primary/5" : "bg-card"
                                    )}>
                                        <div className="flex-1 flex flex-col">
                                            {/* Top info always visible or shifting */}
                                            <div className={cn(
                                                "transition-all duration-500",
                                                isExpanded ? "mb-6" : "mb-2"
                                            )}>
                                                <h3 className={cn(
                                                    "font-bold font-headline transition-all duration-500",
                                                    isExpanded ? "text-2xl" : "text-xl"
                                                )}>{name}</h3>
                                                <p className="text-primary font-semibold tracking-wide uppercase text-[10px] md:text-xs mt-1">{member.role}</p>
                                            </div>

                                            {/* Details - Only visible when expanded */}
                                            <div className={cn(
                                                "transition-all duration-700 flex flex-col gap-6 overflow-hidden",
                                                isExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 h-0 pointer-events-none"
                                            )}>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                                                        <GraduationCap className="h-3 w-3" /> Education
                                                    </p>
                                                    <p className="text-xs md:text-sm font-medium">{member.education}</p>
                                                </div>
                                                <div className="space-y-1 transition-opacity duration-1000 delay-300">
                                                    <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                                                        <Award className="h-3 w-3" /> About
                                                    </p>
                                                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed line-clamp-4">{member.bio}</p>
                                                </div>

                                                <div className="flex gap-4 mt-auto">
                                                    {member.socials.linkedin && (
                                                        <a href={member.socials.linkedin} target="_blank" className="p-2 rounded-full border border-primary/20 hover:bg-primary/10 transition-colors">
                                                            <Linkedin className="h-4 w-4 text-primary" />
                                                        </a>
                                                    )}
                                                    {member.socials.twitter && (
                                                        <a href={member.socials.twitter} target="_blank" className="p-2 rounded-full border border-primary/20 hover:bg-primary/10 transition-colors">
                                                            <Twitter className="h-4 w-4 text-primary" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Default teaser - Only visible when NOT expanded */}
                                            {!isExpanded && (
                                                <p className="text-sm text-muted-foreground mt-4 line-clamp-3 leading-relaxed transition-opacity duration-500">
                                                    {member.bio.substring(0, 100)}...
                                                </p>
                                            )}
                                        </div>

                                        {/* Action Button */}
                                        <div className="mt-auto pt-6 flex justify-between items-center border-t border-border/50">
                                            {isExpanded ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="p-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
                                                    onClick={() => setExpandedMemberId(null)}
                                                >
                                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Team
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="p-0 hover:bg-transparent text-primary hover:translate-x-1 transition-transform group/btn"
                                                    onClick={() => setExpandedMemberId(member.id)}
                                                >
                                                    View More <ChevronRight className="ml-1 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Testimonials Section - Premium Layout */}
            <section className="relative py-32 overflow-hidden bg-slate-950">
                <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]" />
                </div>

                <div className="container relative mx-auto px-4">
                    <div className="text-center mb-24 max-w-3xl mx-auto">
                        <Badge className="bg-primary/20 text-primary border-primary/30 mb-6 px-4 py-1">Community Trust</Badge>
                        <h2 className="font-headline text-4xl font-bold tracking-tight text-white mb-6">Trusted by students <br className="hidden sm:block" /> and landlords worldwide</h2>
                        <div className="h-1 w-20 bg-primary mx-auto rounded-full" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                        {testimonials.map((t, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "flex flex-col p-8 md:p-10 rounded-3xl border border-white/10 backdrop-blur-xl bg-white/5 transition-all duration-500",
                                    "hover:bg-white/10 hover:-translate-y-2 group",
                                    i === 1 ? "md:scale-110 md:z-10 shadow-2xl shadow-primary/10 border-primary/20" : "opacity-80 hover:opacity-100"
                                )}
                            >
                                <div className="flex items-center gap-1 mb-6">
                                    {[...Array(t.rating)].map((_, j) => (
                                        <Star key={j} className="h-4 w-4 text-yellow-500 fill-current" />
                                    ))}
                                </div>
                                <Quote className="h-10 w-10 text-primary/30 mb-4 group-hover:text-primary transition-colors" />
                                <blockquote className="text-lg text-slate-200 font-medium leading-relaxed mb-10 flex-1">
                                    "{t.content}"
                                </blockquote>
                                <div className="flex items-center gap-4 pt-8 border-t border-white/10">
                                    <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-primary/50 flex-shrink-0">
                                        <Image src={t.image} alt={t.name} fill className="object-cover" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-sm">{t.name}</p>
                                        <p className="text-xs text-primary/80 font-medium">{t.role}</p>
                                    </div>
                                    <CheckCircle2 className="h-5 w-5 text-primary ml-auto opacity-50" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}

function Badge({ children, className, variant = "default" }: { children: React.ReactNode, className?: string, variant?: "default" | "outline" }) {
    return (
        <span className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            variant === "outline" ? "text-foreground border border-input bg-background" : "bg-primary text-primary-foreground hover:bg-primary/80",
            className
        )}>
            {children}
        </span>
    );
}
