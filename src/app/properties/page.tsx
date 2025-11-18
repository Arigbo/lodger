
'use client';

import { useState, useEffect } from 'react';
import PropertyCard from "@/components/property-card";
import SearchFilters from "@/components/search-filters";
import { getProperties } from "@/lib/data";
import type { Property } from '@/lib/definitions';
import type { FilterState } from '@/components/search-filters';
import { haversineDistance } from '@/lib/utils';
import { Home } from 'lucide-react';

export default function PropertiesPage() {
  const allProperties = getProperties(true); // Get all properties including occupied
  const [filteredProperties, setFilteredProperties] = useState<Property[]>(
    allProperties.filter(p => p.status === 'available')
  );

  const handleFilterChange = (filters: FilterState) => {
    let properties = allProperties.filter(p => p.status === 'available');

    if (filters.location) {
      if (filters.location.lat && filters.location.lng) {
        properties = properties.filter(p => {
          if (p.location.lat && p.location.lng) {
            const distance = haversineDistance(
              { lat: filters.location.lat!, lng: filters.location.lng! },
              { lat: p.location.lat, lng: p.location.lng }
            );
            return distance <= 10; // 10km radius for "nearby"
          }
          return false;
        });
      } else if (filters.location.searchTerm) {
        const searchTerm = filters.location.searchTerm.toLowerCase();
        properties = properties.filter(p => 
            p.title.toLowerCase().includes(searchTerm) ||
            p.location.address.toLowerCase().includes(searchTerm) ||
            p.location.city.toLowerCase().includes(searchTerm)
        );
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
  };

  const resetFilters = () => {
    setFilteredProperties(allProperties.filter(p => p.status === 'available'));
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="font-headline text-4xl font-bold">Find Your Next Home</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">Browse through our curated list of student-friendly apartments and houses.</p>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        <aside className="lg:col-span-1">
          <SearchFilters onFilterChange={handleFilterChange} onReset={resetFilters} />
        </aside>
        <main className="lg:col-span-3">
            <div className="mb-4">
                <p className="text-sm text-muted-foreground">{filteredProperties.length} properties found</p>
            </div>
            {filteredProperties.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
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
