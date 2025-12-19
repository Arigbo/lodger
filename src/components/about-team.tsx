"use client";

import React, { useState } from 'react';
import {
    Linkedin,
    Twitter,
    Github,
    GraduationCap,
    Award,
    Quote,
    Star,
    Sparkles,
    CheckCircle,
    ArrowUpRight
} from "lucide-react";
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';
import Image from 'next/image';

type TeamMember = {
    id: string;
    name: string;
    role: string;
    image: string;
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
        id: 'jesse',
        name: 'Arigbo Jesse',
        role: 'Founder & Owner',
        image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1974&auto=format&fit=crop',
        education: 'B.Sc. Computer Science',
        bio: 'Visionary founder of Lodger, an Ancients company. Jesse is a computer science graduate dedicated to revolutionizing student housing through cutting-edge technology and a commitment to transparency.',
        socials: {
            linkedin: 'https://linkedin.com',
            twitter: 'https://twitter.com',
            github: 'https://github.com'
        }
    },
    {
        id: 'daniel',
        name: 'Daniel Oye',
        role: 'Co-founder & Software Engineer',
        image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=1974&auto=format&fit=crop',
        education: 'B.Sc. Microbiology',
        bio: 'A software engineer and co-founder with a unique analytical background. Daniel brings technical precision and a data-driven approach to building Lodger\'s robust platforms.',
        socials: {
            linkedin: 'https://linkedin.com',
            twitter: 'https://twitter.com'
        }
    },
    {
        id: 'sammie',
        name: 'Sammie (Sampha)',
        role: 'Co-founder & Lead Designer',
        image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=1974&auto=format&fit=crop',
        education: 'B.Sc. Computer Science',
        bio: 'Sammie, also known as Sampha, is the creative force behind Lodger. With a background in computer science, he ensures a premium, intuitive, and seamless experience for every user.',
        socials: {
            linkedin: 'https://linkedin.com',
            github: 'https://github.com'
        }
    }
];

const testimonials = [
    {
        name: "Sarah Johnson",
        role: "International Student",
        content: "Finding a home while overseas was daunting until I found Lodger. The verified listings and secure payments gave me total peace of mind.",
        rating: 5,
        image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1974&auto=format&fit=crop",
        size: "large"
    },
    {
        name: "David Chen",
        role: "Graduate Student",
        content: "The lease signing process is so smooth. Everything is legal, transparent, and completely digital.",
        rating: 5,
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop",
        size: "small"
    },
    {
        name: "Mrs. Adeyemi",
        role: "Property Owner",
        content: "As a landlord, Lodger has made managing my properties and finding reliable student tenants incredibly easy and stress-free.",
        rating: 5,
        image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1976&auto=format&fit=crop",
        size: "medium"
    },
    {
        name: "Michael Obi",
        role: "Final Year Student",
        content: "I finally found a place that actually looks like the pictures. The verification team is doing an amazing job.",
        rating: 5,
        image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1974&auto=format&fit=crop",
        size: "small"
    },
    {
        name: "Jessica Wu",
        role: "Exchange Student",
        content: "The support I received during my move was exceptional. Lodger isn't just a site, it's a partner in your student journey.",
        rating: 5,
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1964&auto=format&fit=crop",
        size: "medium"
    },
    {
        name: "Ibrahim Musa",
        role: "Property Manager",
        content: "Integrating Lodger into my workflow has increased my occupancy rates by 40%. The platform is built for efficiency.",
        rating: 5,
        image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop",
        size: "large"
    }
];

export default function AboutTeam() {
    const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

    return (
        <div className="space-y-32">
            {/* Team Section */}
            <section className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
                    <div className="max-w-2xl">
                        <div className="h-1.5 w-12 bg-primary rounded-full mb-6" />
                        <h2 className="font-headline text-4xl md:text-5xl font-bold tracking-tight">Meet our <span className="text-primary italic">Founding Team</span></h2>
                        <p className="mt-6 text-xl text-muted-foreground leading-relaxed">
                            A team of passionate designers, engineers, and strategists building the future of student housing.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {teamMembers.map((member) => {
                        const isExpanded = expandedMemberId === member.id;

                        return (
                            <div
                                key={member.id}
                                className={cn(
                                    "relative min-h-[500px] flex flex-col rounded-[2.5rem] overflow-hidden transition-all duration-500 ease-in-out group",
                                    "border border-border/50 bg-card/50 backdrop-blur-sm",
                                    isExpanded ? "shadow-2xl ring-2 ring-primary/20 scale-[1.02]" : "shadow-xl hover:shadow-2xl hover:-translate-y-2"
                                )}
                            >
                                {/* Member Image Container */}
                                <div className={cn(
                                    "relative transition-all duration-700 ease-in-out overflow-hidden flex-shrink-0",
                                    isExpanded ? "h-64" : "h-72"
                                )}>
                                    <Image
                                        src={member.image}
                                        alt={member.name}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                    <div className="absolute bottom-6 left-8 text-white">
                                        <h3 className="text-2xl font-bold font-headline">{member.name}</h3>
                                        <p className="text-primary-foreground/80 font-medium text-sm mt-1 uppercase tracking-wider">{member.role}</p>
                                    </div>
                                </div>

                                {/* Content Area */}
                                <div className="flex flex-col flex-1 p-8">
                                    <div className="flex-1">
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
                                                    <GraduationCap className="h-3 w-3" /> Education
                                                </div>
                                                <p className="text-sm font-medium leading-normal">{member.education}</p>
                                            </div>

                                            <div className="space-y-2 transition-all duration-500">
                                                <div className="flex items-center gap-2 text-muted-foreground font-bold text-[10px] uppercase tracking-widest">
                                                    <Award className="h-3 w-3" /> Background
                                                </div>
                                                <p className={cn(
                                                    "text-sm text-muted-foreground leading-relaxed transition-all duration-500",
                                                    isExpanded ? "" : "line-clamp-3"
                                                )}>
                                                    {member.bio}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer / Actions */}
                                    <div className="mt-8 pt-6 border-t border-border/50 flex items-center justify-between">
                                        <div className="flex gap-4">
                                            {member.socials.linkedin && (
                                                <a href={member.socials.linkedin} target="_blank" className="text-muted-foreground hover:text-primary transition-colors">
                                                    <Linkedin className="h-5 w-5" />
                                                </a>
                                            )}
                                            {member.socials.twitter && (
                                                <a href={member.socials.twitter} target="_blank" className="text-muted-foreground hover:text-primary transition-colors">
                                                    <Twitter className="h-5 w-5" />
                                                </a>
                                            )}
                                            {member.socials.github && (
                                                <a href={member.socials.github} target="_blank" className="text-muted-foreground hover:text-primary transition-colors">
                                                    <Github className="h-5 w-5" />
                                                </a>
                                            )}
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-primary hover:text-primary hover:bg-primary/5 rounded-full font-bold"
                                            onClick={() => setExpandedMemberId(isExpanded ? null : member.id)}
                                        >
                                            {isExpanded ? "See Less" : "Learn More"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Testimonials Section - Masonry Bento Grid */}
            <section className="relative py-32 overflow-hidden bg-background">
                <div className="absolute inset-0 bg-secondary/5" />
                <div className="absolute top-0 right-0 p-64 opacity-[0.03] blur-3xl bg-primary rounded-full -mr-64 -mt-64" />
                <div className="absolute bottom-0 left-0 p-64 opacity-[0.03] blur-3xl bg-blue-600 rounded-full -ml-64 -mb-64" />

                <div className="container relative mx-auto px-4">
                    <div className="max-w-3xl mb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both">
                        <Badge className="bg-primary/10 text-primary border-primary/20 mb-6 px-4 py-1.5 rounded-full uppercase tracking-widest text-[10px] font-black">Success Stories</Badge>
                        <h2 className="font-headline text-4xl md:text-5xl font-bold tracking-tight mb-6">What our <span className="text-primary italic">community</span> says</h2>
                        <p className="text-xl text-muted-foreground">Join thousands of students and landlords who trust Lodger for their housing needs.</p>
                    </div>

                    <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
                        {testimonials.map((t, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "break-inside-avoid relative group h-full animate-in fade-in slide-in-from-bottom-12 duration-1000 fill-mode-both",
                                    "p-8 rounded-[2.5rem] bg-card border border-border shadow-xl hover:shadow-2xl transition-all duration-500",
                                    "hover:-translate-y-2 flex flex-col justify-between"
                                )}
                                style={{ animationDelay: `${i * 100}ms` }}
                            >
                                <div className="absolute top-8 right-8 text-primary/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12">
                                    <Quote className="h-12 w-12 fill-current" />
                                </div>

                                <div className="relative">
                                    <div className="flex items-center gap-1 mb-6">
                                        {[...Array(t.rating)].map((_, j) => (
                                            <Star key={j} className="h-4 w-4 text-yellow-500 fill-current" />
                                        ))}
                                    </div>

                                    <blockquote className={cn(
                                        "font-medium leading-relaxed mb-8 text-foreground",
                                        t.size === 'large' ? "text-2xl" : "text-lg"
                                    )}>
                                        "{t.content}"
                                    </blockquote>
                                </div>

                                <div className="flex items-center gap-4 pt-8 border-t border-border/50">
                                    <div className="relative h-12 w-12 rounded-xl overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500">
                                        <Image src={t.image} alt={t.name} fill className="object-cover" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-foreground">{t.name}</p>
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{t.role}</p>
                                    </div>
                                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <Sparkles className="h-4 w-4 text-primary" />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Visual Filler Card */}
                        <div className="break-inside-avoid p-10 rounded-[2.5rem] bg-primary text-primary-foreground shadow-2xl flex flex-col justify-center items-center text-center space-y-6 animate-in fade-in slide-in-from-bottom-12 duration-1000 fill-mode-both" style={{ animationDelay: '600ms' }}>
                            <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <CheckCircle className="h-8 w-8" />
                            </div>
                            <h3 className="font-headline text-2xl font-bold">100% Secure Platform</h3>
                            <p className="text-primary-foreground/80 text-sm leading-relaxed">We utilize advanced verification to ensure your safety and provide complete peace of mind.</p>
                            <Button variant="outline" className="rounded-full bg-white/10 border-white/20 hover:bg-white/20 text-white w-full h-12">
                                Learn More <ArrowUpRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
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
