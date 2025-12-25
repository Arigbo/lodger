
'use client';

import { useState, useEffect, useMemo } from 'react';
import PropertyCard from "@/components/property-card";
import SearchFilters from "@/components/search-filters";
import type { Property, UserProfile } from '@/types';
import type { FilterState } from '@/components/search-filters';
import { Home, Search } from 'lucide-react';
import { haversineDistance } from '@/utils';
import { getCurrencyByCountry, convertCurrency } from "@/utils/currencies";
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import Loading from '@/app/loading';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SlidersHorizontal, MapPin as MapPinIcon, Home as HomeIcon, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";


// Mock coordinates for major state centers to determine location
const stateCoordinates: { [key: string]: { lat: number; lng: number } } = {
    'CA': { lat: 36.7783, lng: -119.4179 },
    'NY': { lat: 40.7128, lng: -74.0060 },
};

export default function PropertiesPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

    const propertiesQuery = useMemoFirebase(() => query(collection(firestore, 'properties'), where('status', '==', 'available')), [firestore]);
    const { data: allProperties, isLoading: arePropertiesLoading } = useCollection<Property>(propertiesQuery);

    const [filters, setFilters] = useState<FilterState>({ useCurrentLocation: false });
    const [currentLocation, setCurrentLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
    const [schoolsInArea, setSchoolsInArea] = useState<string[] | null>(null);
    const [hasAppliedDefaults, setHasAppliedDefaults] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');

    const userCurrency = useMemo(() => {
        if (userProfile?.currency) return userProfile.currency;
        if (userProfile?.country) return getCurrencyByCountry(userProfile.country);
        return 'USD';
    }, [userProfile]);

    const availableStates = useMemo(() => {
        if (!allProperties) return [];
        let props = allProperties;
        if (filters.country) {
            props = props.filter(p => p.location.country === filters.country);
        }
        return [...new Set(props.map(p => p.location.state))];
    }, [allProperties, filters.country]);


    useEffect(() => {
        if (userProfile && !hasAppliedDefaults) {
            setFilters(prev => ({
                ...prev,
                country: userProfile.country || prev.country,
                state: userProfile.state || prev.state,
                school: userProfile.school || prev.school,
            }));
            setHasAppliedDefaults(true);
        }
    }, [userProfile, hasAppliedDefaults]);


    useEffect(() => {
        if (!allProperties) return;
        let properties = allProperties;

        // Filter by availability first (already done in the query, but good for safety)
        properties = properties.filter(p => p.status === 'available');

        if (filters.useCurrentLocation && currentLocation) {
            properties = properties.filter(p => {
                if (p.location.lat && p.location.lng) {
                    const distance = haversineDistance(currentLocation, { lat: p.location.lat, lng: p.location.lng });
                    return distance < 10; // 10km radius
                }
                return false;
            });
        } else {
            if (filters.country) {
                // Mocking country filtering as all properties are in USA
            }

            if (filters.state) {
                properties = properties.filter(p => p.location.state === filters.state);
            }

            if (filters.city) {
                properties = properties.filter(p => p.location.city.toLowerCase().includes(filters.city!.toLowerCase()));
            }

            if (filters.school) {
                properties = properties.filter(p => p.location.school === filters.school);
            }
        }


        if (filters.price) {
            properties = properties.filter(p => {
                const priceInUserCurrency = convertCurrency(p.price, p.currency, userCurrency);
                return priceInUserCurrency <= filters.price!;
            });
        }

        if (filters.propertyType && filters.propertyType !== 'any') {
            properties = properties.filter(p => p.type === filters.propertyType);
        }

        if (filters.bedrooms && filters.bedrooms !== 'any') {
            if (filters.bedrooms === '4') {
                properties = properties.filter(p => p.bedrooms >= 4);
            } else {
                properties = properties.filter(p => p.bedrooms === parseInt(filters.bedrooms!));
            }
        }

        if (filters.bathrooms && filters.bathrooms !== 'any') {
            if (filters.bathrooms === '3') {
                properties = properties.filter(p => p.bathrooms >= 3);
            } else {
                properties = properties.filter(p => p.bathrooms === parseInt(filters.bathrooms!));
            }
        }

        if (filters.amenities && filters.amenities.length > 0) {
            properties = properties.filter(p =>
                filters.amenities!.every(amenity => p.amenities.includes(amenity))
            );
        }

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            properties = properties.filter(p =>
                p.title.toLowerCase().includes(lowerQuery) ||
                p.location.address.toLowerCase().includes(lowerQuery) ||
                p.location.city.toLowerCase().includes(lowerQuery)
            );
        }

        // Sorting
        properties.sort((a, b) => {
            const priceA = convertCurrency(a.price, a.currency, userCurrency);
            const priceB = convertCurrency(b.price, b.currency, userCurrency);

            switch (sortBy) {
                case 'price-asc':
                    return priceA - priceB;
                case 'price-desc':
                    return priceB - priceA;
                case 'bedrooms-desc':
                    return b.bedrooms - a.bedrooms;
                case 'area-desc':
                    return b.area - a.area;
                case 'newest':
                default:
                    return -1;
            }
        });

        setFilteredProperties(properties);
    }, [filters, currentLocation, allProperties, searchQuery, sortBy, userCurrency]);


    const handleFilterChange = (newFilters: FilterState) => {
        if (newFilters.useCurrentLocation === false) {
            setCurrentLocation(null);
            setSchoolsInArea(null);
        }
        setFilters(newFilters);
    };

    const handleLocationSuccess = (coords: { lat: number, lng: number }) => {
        if (!allProperties) return;
        setCurrentLocation(coords);

        let closestState: string | null = null;
        let minDistance = Infinity;

        for (const state in stateCoordinates) {
            const distance = haversineDistance(coords, stateCoordinates[state]);
            if (distance < minDistance) {
                minDistance = distance;
                closestState = state;
            }
        }

        let schools: string[] = [];
        // Set a threshold for how far away is considered "in the state" (e.g., 500km)
        if (closestState && minDistance < 500) {
            schools = [...new Set(allProperties
                .filter(p => p.location.state === closestState && p.location.school)
                .map(p => p.location.school!)
            )];
        }

        setSchoolsInArea(schools);

        setFilters(prev => ({
            ...prev,
            useCurrentLocation: true,
            country: schools.length > 0 ? 'USA' : undefined,
            state: schools.length > 0 ? closestState || undefined : undefined,
            school: undefined
        }));
    }

    const resetFilters = () => {
        // Reset all filters to an empty state
        setFilters({
            country: undefined,
            state: undefined,
            city: undefined,
            school: undefined,
            useCurrentLocation: false,
            price: undefined,
            propertyType: undefined,
            bedrooms: undefined,
            bathrooms: undefined,
            amenities: []
        });
        setCurrentLocation(null);
        setSchoolsInArea(null);
    }

    const isLoading = isProfileLoading || arePropertiesLoading;

    if (isLoading) {
        return <Loading />;
    }

    return (
        <div className="container mx-auto max-w-7xl px-4 md:px-6 pt-8 pb-10">
            {/* Premium Control Bar */}
            <div className="bg-background/60 backdrop-blur-xl border-2 rounded-[2rem] p-4 md:p-6 mb-10 shadow-xl shadow-primary/5 ring-1 ring-white/10">
                <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6">
                    {/* Left: Branding/Stats */}
                    <div className="flex items-center gap-3 sm:gap-5 shrink-0 px-1 sm:px-2">
                        <div className="p-3 sm:p-3.5 bg-primary/10 rounded-2xl shadow-inner ring-1 ring-primary/20">
                            <SlidersHorizontal className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                        </div>
                        <div className="space-y-0.5">
                            <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground whitespace-nowrap">Find Your Home</h2>
                            <div className="flex items-center gap-2">
                                <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                                <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wider">
                                    {filteredProperties.length} Premium Properties
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right: Search and Filters Container */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 grow justify-end">
                        {/* Compact Search Trigger */}
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className={cn(
                                        "h-12 w-12 sm:h-14 sm:w-14 rounded-2xl border-2 bg-muted/30 hover:bg-muted/50 transition-all group",
                                        searchQuery && "border-primary bg-primary/5 text-primary"
                                    )}
                                >
                                    <Search className="h-5 w-5 sm:h-6 sm:w-6 group-hover:scale-110 transition-transform" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-[95vw] sm:max-w-[600px] p-0 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border-2 shadow-2xl">
                                <DialogHeader className="p-6 sm:p-8 pb-0">
                                    <DialogTitle className="text-xl sm:text-2xl font-bold">Find Your Next Home</DialogTitle>
                                </DialogHeader>
                                <div className="p-6 sm:p-8 space-y-6">
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                        <Input
                                            placeholder="Where are you looking for?"
                                            className="h-14 sm:h-16 pl-12 sm:pl-14 pr-6 rounded-2xl border-2 bg-muted/30 focus:bg-background focus:ring-4 focus:ring-primary/10 transition-all text-lg sm:text-xl font-medium shadow-inner"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                                        <div className="flex flex-wrap gap-2">
                                            {["Studio", "Apartment", "House", "Loft"].map(type => (
                                                <Button
                                                    key={type}
                                                    variant="secondary"
                                                    size="sm"
                                                    className="rounded-full px-4 hover:bg-primary hover:text-white transition-all text-sm h-9"
                                                    onClick={() => {
                                                        handleFilterChange({ ...filters, propertyType: type as any });
                                                    }}
                                                >
                                                    {type}
                                                </Button>
                                            ))}
                                        </div>
                                        {searchQuery && (
                                            <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-destructive font-bold h-9 px-4 rounded-xl text-sm">
                                                Clear Search
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className="p-5 sm:p-6 bg-muted/30 border-t flex justify-end">
                                    <DialogClose asChild>
                                        <Button className="h-11 sm:h-12 px-8 rounded-xl font-bold shadow-lg shadow-primary/20">
                                            Show Properties
                                        </Button>
                                    </DialogClose>
                                </div>
                            </DialogContent>
                        </Dialog>

                        {/* Filter & Sort Group - Wraps internally */}
                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                            {/* Mobile Filters */}
                            <div className="lg:hidden flex-grow sm:flex-grow-0">
                                <Sheet>
                                    <SheetTrigger asChild>
                                        <Button variant="outline" className="w-full h-14 rounded-2xl gap-3 border-2 font-bold px-6 hover:bg-primary/5 hover:border-primary transition-all">
                                            <SlidersHorizontal className="h-4 w-4" />
                                            Filters
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="left" className="w-full sm:w-[480px] overflow-y-auto p-0 border-r-0 rounded-r-[2.5rem]">
                                        <div className="p-8">
                                            <div className="flex items-center gap-3 mb-8">
                                                <div className="p-2 bg-primary/10 rounded-lg">
                                                    <SlidersHorizontal className="h-5 w-5 text-primary" />
                                                </div>
                                                <h2 className="text-2xl font-bold tracking-tight">Refine Results</h2>
                                            </div>
                                            <SearchFilters
                                                onFilterChange={handleFilterChange}
                                                onReset={resetFilters}
                                                initialFilters={filters}
                                                onLocationSuccess={handleLocationSuccess}
                                                schoolsInArea={schoolsInArea}
                                                availableStates={availableStates}
                                                userCurrency={userCurrency}
                                                className="border-0 shadow-none p-0"
                                            />
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </div>

                            {/* Desktop Advanced Filters */}
                            <div className="hidden lg:block">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="h-14 rounded-2xl gap-3 border-2 px-8 font-bold hover:bg-primary/5 hover:border-primary shadow-sm transition-all group">
                                            <SlidersHorizontal className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
                                            Advanced Filters
                                            <Badge variant="secondary" className="ml-1 h-5 px-1.5 font-bold bg-primary/10 text-primary border-none">
                                                {Object.keys(filters).filter(k => filters[k as keyof FilterState] !== undefined && filters[k as keyof FilterState] !== false).length}
                                            </Badge>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[500px] p-0 rounded-[2rem] overflow-hidden border-2 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] mt-4" align="end">
                                        <div className="bg-muted/50 p-6 border-b flex items-center justify-between">
                                            <h3 className="font-bold text-lg">Filter Preferences</h3>
                                            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-primary hover:text-primary hover:bg-primary/10 font-bold rounded-lg px-3">
                                                Reset
                                            </Button>
                                        </div>
                                        <div className="max-h-[70vh] overflow-y-auto p-8 custom-scrollbar">
                                            <SearchFilters
                                                onFilterChange={handleFilterChange}
                                                onReset={resetFilters}
                                                initialFilters={filters}
                                                onLocationSuccess={handleLocationSuccess}
                                                schoolsInArea={schoolsInArea}
                                                availableStates={availableStates}
                                                userCurrency={userCurrency}
                                                className="border-0 shadow-none p-0"
                                            />
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Sort Selector */}
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="h-14 w-full sm:w-[200px] lg:w-[240px] rounded-2xl border-2 font-bold px-6 bg-muted/30 focus:bg-background transition-all shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <span className="text-muted-foreground/60 font-medium text-xs uppercase tracking-widest hidden sm:inline">Sort:</span>
                                        <SelectValue placeholder="Newest First" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-2 p-1 border-muted overflow-hidden shadow-2xl">
                                    <SelectItem value="newest" className="rounded-xl py-3 px-4 focus:bg-primary/5 focus:text-primary font-medium">Newest First</SelectItem>
                                    <SelectItem value="price-asc" className="rounded-xl py-3 px-4 focus:bg-primary/5 focus:text-primary font-medium">Price: Low to High</SelectItem>
                                    <SelectItem value="price-desc" className="rounded-xl py-3 px-4 focus:bg-primary/5 focus:text-primary font-medium">Price: High to Low</SelectItem>
                                    <SelectItem value="bedrooms-desc" className="rounded-xl py-3 px-4 focus:bg-primary/5 focus:text-primary font-medium">Bedrooms: Most First</SelectItem>
                                    <SelectItem value="area-desc" className="rounded-xl py-3 px-4 focus:bg-primary/5 focus:text-primary font-medium">Area: Largest First</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>

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
                <div className="flex flex-col items-center justify-center rounded-2xl md:rounded-[3rem] border-4 border-dashed border-muted/50 p-8 md:p-20 text-center bg-muted/20">
                    <div className="flex h-20 w-20 md:h-32 md:w-32 items-center justify-center rounded-full bg-background shadow-2xl ring-1 ring-border">
                        <Home className="h-8 w-8 md:h-14 md:w-14 text-primary opacity-40" />
                    </div>
                    <h2 className="mt-6 md:mt-8 text-xl md:text-3xl font-bold tracking-tight">No Properties Match Your Search</h2>
                    <p className="mt-3 md:mt-4 text-sm md:text-lg text-muted-foreground max-w-md mx-auto font-medium px-4">
                        Try adjusting your filters or searching for a different area to find available homes.
                    </p>
                    <Button
                        variant="outline"
                        onClick={resetFilters}
                        className="mt-6 md:mt-8 h-12 rounded-xl px-8 border-2"
                    >
                        Clear All Filters
                    </Button>
                </div>
            )}
        </div>
    );
}
