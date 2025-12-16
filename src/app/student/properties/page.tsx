
'use client';

import { useState, useEffect, useMemo } from 'react';
import PropertyCard from "@/components/property-card";
import SearchFilters from "@/components/search-filters";
import type { Property, UserProfile } from '@/types';
import type { FilterState } from '@/components/search-filters';
import { Home, Search } from 'lucide-react';
import { haversineDistance } from '@/utils';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import Loading from '@/app/loading';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SlidersHorizontal } from "lucide-react";


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
            properties = properties.filter(p => p.price <= filters.price!);
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
            switch (sortBy) {
                case 'price-asc':
                    return a.price - b.price;
                case 'price-desc':
                    return b.price - a.price;
                case 'bedrooms-desc':
                    return b.bedrooms - a.bedrooms;
                case 'area-desc':
                    return b.area - a.area;
                case 'newest':
                default:
                    // Assuming higher ID means newer if no timestamp, or we could add createdAt to Property type
                    // For now, let's just reverse the order (last created usually comes last in default fetch)
                    // But if we want consistent sort without timestamp, we might need a createdAt field.
                    // Let's assume natural order is oldest first, so reverse for newest
                    return -1;
            }
        });

        setFilteredProperties(properties);
    }, [filters, currentLocation, allProperties, searchQuery, sortBy]);


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
        <div>
            {/* Removed grid layout, using single column with responsive filters */}
            <div>
                <main>
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by title, location..."
                                    className="pl-8"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                {/* Mobile Filter (Sheet) */}
                                <div className="md:hidden">
                                    <Sheet>
                                        <SheetTrigger asChild>
                                            <Button variant="outline" className="gap-2">
                                                <SlidersHorizontal className="h-4 w-4" />
                                                Filters
                                            </Button>
                                        </SheetTrigger>
                                        <SheetContent side="left" className="w-full sm:w-[540px] overflow-y-auto p-0">
                                            <SearchFilters
                                                onFilterChange={handleFilterChange}
                                                onReset={resetFilters}
                                                initialFilters={filters}
                                                onLocationSuccess={handleLocationSuccess}
                                                schoolsInArea={schoolsInArea}
                                                availableStates={availableStates}
                                                className="border-0 shadow-none"
                                            />
                                        </SheetContent>
                                    </Sheet>
                                </div>

                                {/* Desktop Filter (Popover) */}
                                <div className="hidden md:block">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="gap-2">
                                                <SlidersHorizontal className="h-4 w-4" />
                                                Filters
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[480px] p-0" align="end">
                                            <SearchFilters
                                                onFilterChange={handleFilterChange}
                                                onReset={resetFilters}
                                                initialFilters={filters}
                                                onLocationSuccess={handleLocationSuccess}
                                                schoolsInArea={schoolsInArea}
                                                availableStates={availableStates}
                                                className="border-0 shadow-none max-h-[80vh] overflow-y-auto"
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline-block ml-2">Sort by:</span>
                                <Select value={sortBy} onValueChange={setSortBy}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="Sort by" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="newest">Newest First</SelectItem>
                                        <SelectItem value="price-asc">Price: Low to High</SelectItem>
                                        <SelectItem value="price-desc">Price: High to Low</SelectItem>
                                        <SelectItem value="bedrooms-desc">Bedrooms: Most First</SelectItem>
                                        <SelectItem value="area-desc">Area: Largest First</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <div className="mb-4">
                        <p className="text-sm text-muted-foreground">{filteredProperties.length} properties found</p>
                    </div>
                    {filteredProperties.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-2">
                            {filteredProperties.map(property => (
                                <PropertyCard key={property.id} property={property} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center h-full">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-background">
                                <Home className="h-10 w-10 text-muted-foreground" />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold">No Properties Found</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                There are no available properties matching your criteria. Try adjusting your filters.
                            </p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
