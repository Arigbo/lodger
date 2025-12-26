
'use client';

import { useState, useMemo } from 'react';
import PropertyCard from "@/components/property-card";
import type { Property, UserProfile } from '@/types';
import { Heart, Search } from 'lucide-react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import Loading from '@/app/loading';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";


export default function BookmarksPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

    const propertiesQuery = useMemoFirebase(() => query(collection(firestore, 'properties'), where('status', '==', 'available')), [firestore]);
    const { data: allProperties, isLoading: arePropertiesLoading } = useCollection<Property>(propertiesQuery);

    const [searchQuery, setSearchQuery] = useState('');

    const bookmarkedProperties = useMemo(() => {
        if (!allProperties || !userProfile?.bookmarkedPropertyIds) return [];
        return allProperties.filter(p => userProfile.bookmarkedPropertyIds?.includes(p.id));
    }, [allProperties, userProfile?.bookmarkedPropertyIds]);

    const filteredProperties = useMemo(() => {
        if (!searchQuery) return bookmarkedProperties;
        const lowerQuery = searchQuery.toLowerCase();
        return bookmarkedProperties.filter(p =>
            p.title.toLowerCase().includes(lowerQuery) ||
            p.location.address.toLowerCase().includes(lowerQuery) ||
            p.location.city.toLowerCase().includes(lowerQuery)
        );
    }, [bookmarkedProperties, searchQuery]);

    const isLoading = isProfileLoading || arePropertiesLoading;

    if (isLoading) {
        return <Loading />;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-1000">
            {/* Simple Header */}
            <div className="flex flex-col gap-2">
                <h1 className="font-headline text-3xl md:text-4xl font-black tracking-tight text-foreground uppercase italic px-1">
                    Bookmarked <span className="text-primary italic">Places.</span>
                </h1>
                <div className="h-1 w-12 bg-primary rounded-full ml-1" />
            </div>

            {/* Refined Search Bar */}
            {bookmarkedProperties.length > 0 && (
                <div className="relative group max-w-2xl mx-auto md:mx-0">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none transition-transform group-focus-within:scale-110">
                        <Search className="h-5 w-5 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                    </div>
                    <Input
                        placeholder="Search your curation..."
                        className="h-18 pl-14 pr-8 rounded-[1.5rem] border-2 border-muted/20 bg-white/50 backdrop-blur-xl shadow-2xl shadow-black/[0.02] text-lg font-medium ring-offset-background placeholder:text-muted-foreground/30 focus-visible:ring-4 focus-visible:ring-primary/5 transition-all text-center md:text-left"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            )}

            {/* Bookmarked Properties Grid */}
            {filteredProperties.length > 0 ? (
                <div className="grid grid-cols-1 gap-12 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                    {filteredProperties.map((property, idx) => (
                        <div
                            key={property.id}
                            className="animate-in fade-in slide-in-from-bottom-8 duration-1000 group transition-all"
                            style={{ animationDelay: `${idx * 150}ms` }}
                        >
                            <PropertyCard property={property} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="relative overflow-hidden rounded-[3.5rem] bg-white border-2 border-muted/10 shadow-3xl p-20 text-center space-y-10 animate-in zoom-in-95 duration-1000">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#3b82f60a_0%,transparent_70%)]" />
                    <div className="relative z-10 max-w-md mx-auto space-y-8">
                        <div className="relative h-32 w-32 mx-auto">
                            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150 animate-pulse" />
                            <div className="relative flex h-full w-full items-center justify-center rounded-[2.5rem] bg-muted/20 border-2 border-white shadow-inner transform -rotate-6 group-hover:rotate-0 transition-transform duration-700">
                                <Heart className="h-14 w-14 text-primary opacity-20" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-3xl font-black uppercase tracking-tight">Curate Your <span className="text-primary italic">Future</span></h2>
                            <p className="text-lg text-muted-foreground font-serif italic leading-relaxed">
                                {bookmarkedProperties.length === 0
                                    ? "Your personal gallery of premium dwellings is currently blank. Explore our collection and begin your curation."
                                    : "Our archives don't match your current search criteria. Perhaps a different inquiry?"}
                            </p>
                        </div>
                        <Button size="lg" className="h-16 rounded-2xl px-12 font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all" asChild>
                            <Link href="/student/properties">{bookmarkedProperties.length === 0 ? "START CURATION" : "CLEAR ARCHIVES"}</Link>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
