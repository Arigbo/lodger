

'use client';

import { useState, useEffect, useMemo } from 'react';
import PropertyCard from "@/components/property-card";
import SearchFilters from "@/components/search-filters";
import { getProperties, getUserById } from "@/lib/data";
import type { Property } from '@/lib/definitions';
import type { FilterState } from '@/components/search-filters';
import { Home } from 'lucide-react';
import { haversineDistance } from '@/lib/utils';

// Mock current user - replace with real auth
const useUser = () => {
  // To test, use 'user-2' who is a student with location data
  const user = getUserById('user-2'); 
  return { user };
}

const allProperties = getProperties(true); // Get all available properties once, including occupied.

// Mock coordinates for major state centers to determine location
const stateCoordinates: { [key: string]: { lat: number; lng: number } } = {
  'CA': { lat: 36.7783, lng: -119.4179 },
  'NY': { lat: 40.7128, lng: -74.0060 },
};

export default function PropertiesPage() {
  const { user } = useUser();
  
  const [filters, setFilters] = useState<FilterState>({
      country: user?.country,
      state: user?.state,
      school: user?.school,
      useCurrentLocation: false,
  });
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [schoolsInArea, setSchoolsInArea] = useState<string[] | null>(null);
  
  const availableStates = useMemo(() => [...new Set(allProperties.map(p => p.location.state))], []);
  const availableSchools = useMemo(() => [...new Set(allProperties.map(p => p.location.school).filter(Boolean as any as (value: string | undefined) => value is string))], []);


  useEffect(() => {
    let properties = allProperties;

    // Filter by availability first
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

    setFilteredProperties(properties);
  }, [filters, currentLocation]);


  const handleFilterChange = (newFilters: FilterState) => {
    if (newFilters.useCurrentLocation === false) {
      setCurrentLocation(null);
      setSchoolsInArea(null);
    }
    setFilters(newFilters);
  };
  
  const handleLocationSuccess = (coords: {lat: number, lng: number}) => {
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

  return (
    <div>
        <div className="text-center mb-12">
            <h1 className="font-headline text-4xl font-bold">Find Your Next Home</h1>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">Browse through our curated list of student-friendly apartments and houses.</p>
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            <aside className="lg:col-span-1">
            <SearchFilters 
                onFilterChange={handleFilterChange} 
                onReset={resetFilters} 
                initialFilters={filters}
                onLocationSuccess={handleLocationSuccess}
                schoolsInArea={schoolsInArea}
                availableStates={availableStates}
                availableSchools={availableSchools}
            />
            </aside>
            <main className="lg:col-span-3">
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
