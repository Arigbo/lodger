
'use client';

import { useState, useMemo } from 'react';
import PropertyCard from "@/components/properties/property-card";
import type { Property, UserProfile } from '@/types';
import { Heart, Search } from 'lucide-react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { PageSkeleton } from "@/components/dashboard/skeletons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard";


export default function BookmarksPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

    const propertiesQuery = useMemoFirebase(() => query(collection(firestore, 'properties'), where('status', '==', 'available')), [firestore]);
    const { data: allProperties, isLoading: arePropertiesLoading } = useCollection<Property>(propertiesQuery);

    const [searchQuery, setSearchQuery] = useState('');

    const bookmarkedIds = userProfile?.bookmarkedPropertyIds;
    const bookmarkedProperties = useMemo(() => {
        if (!allProperties || !bookmarkedIds) return [];
        return allProperties.filter(p => bookmarkedIds.includes(p.id));
    }, [allProperties, bookmarkedIds]);

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
        return <PageSkeleton variant="grid" />;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-1000">
            <PageHeader title="Saved homes" description="Homes you've shortlisted. Tap the heart on any listing to save it." />

            {/* Refined Search Bar */}
            {bookmarkedProperties.length > 0 && (
                <div className="relative group max-w-2xl mx-auto md:mx-0">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none transition-transform group-focus-within:scale-110">
                        <Search className="h-5 w-5 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                    </div>
                    <Input
                        placeholder="Search saved homes…"
                        className="h-18 pl-14 pr-8 rounded-2xl border border-muted/20 bg-white/50 backdrop-blur-xl shadow-sm text-lg font-medium ring-offset-background placeholder:text-muted-foreground/30 focus-visible:ring-4 focus-visible:ring-primary/5 transition-all text-center md:text-left"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            )}

            {/* Bookmarked Properties Grid */}
            {filteredProperties.length > 0 ? (
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
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
                <div className="relative overflow-hidden rounded-3xl bg-card border border-muted/10 shadow-sm p-20 text-center space-y-10 animate-in zoom-in-95 duration-1000">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#3b82f60a_0%,transparent_70%)]" />
                    <div className="relative z-10 max-w-md mx-auto space-y-8">
                        <div className="relative h-32 w-32 mx-auto">
                            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150 animate-pulse" />
                            <div className="relative flex h-full w-full items-center justify-center rounded-3xl bg-muted/20 border border-white shadow-inner transform -rotate-6 group-hover:rotate-0 transition-transform duration-700">
                                <Heart className="h-14 w-14 text-primary opacity-20" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-3xl font-bold tracking-tight">Curate Your <span className="text-primary">Future</span></h2>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                {bookmarkedProperties.length === 0
                                    ? "You haven't saved any homes yet. Tap the heart on a listing to add it here."
                                    : "No saved homes match your search."}
                            </p>
                        </div>
                        <Button size="lg" className="h-11 rounded-2xl px-6 font-semibold text-xs uppercase tracking-wider shadow-sm hover:scale-105 active:scale-95 transition-all" asChild>
                            <Link href="/student/properties">{bookmarkedProperties.length === 0 ? "START CURATION" : "CLEAR SEARCH"}</Link>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
