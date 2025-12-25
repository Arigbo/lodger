
'use client';

import { useState, useMemo } from 'react';
import PropertyCard from "@/components/property-card";
import type { Property, UserProfile } from '@/types';
import { Home, Heart, Search } from 'lucide-react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import Loading from '@/app/loading';
import { Input } from "@/components/ui/input";
import { SlidersHorizontal } from "lucide-react";


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
        <div className="container mx-auto max-w-7xl px-0 pt-8 pb-10">
            {/* Header / Control Bar */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-4 shrink-0">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <Heart className="h-6 w-6 text-primary fill-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Your Bookmarks</h2>
                        <p className="text-sm text-muted-foreground font-medium">
                            {bookmarkedProperties.length === 0
                                ? "You haven't saved any properties yet"
                                : `You have ${bookmarkedProperties.length} saved ${bookmarkedProperties.length === 1 ? 'property' : 'properties'}`}
                        </p>
                    </div>
                </div>

                {bookmarkedProperties.length > 0 && (
                    <div className="flex flex-col md:flex-row items-center gap-3 w-full lg:w-auto">
                        <div className="relative w-full md:w-80 lg:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search in bookmarks..."
                                className="h-12 pl-10 pr-4 rounded-xl border-2 focus:ring-primary focus:border-primary transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Bookmarked Properties Grid */}
            {filteredProperties.length > 0 ? (
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                    {filteredProperties.map((property, idx) => (
                        <div
                            key={property.id}
                            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                            style={{ animationDelay: `${idx * 50}ms` }}
                        >
                            <PropertyCard property={property} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-[3rem] border-4 border-dashed border-muted/50 p-20 text-center bg-muted/20">
                    <div className="flex h-32 w-32 items-center justify-center rounded-full bg-background shadow-2xl ring-1 ring-border">
                        <Heart className="h-14 w-14 text-primary opacity-20" />
                    </div>
                    <h2 className="mt-8 text-3xl font-bold tracking-tight">
                        {bookmarkedProperties.length === 0 ? "Start Saving Properties" : "No Matches Found"}
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground max-w-md mx-auto font-medium">
                        {bookmarkedProperties.length === 0
                            ? "Click the heart icon on any property to save it to your bookmarks for later review."
                            : "Try searching for something else in your saved properties."}
                    </p>
                </div>
            )}
        </div>
    );
}
