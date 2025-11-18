

'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import React, { useState, useEffect } from "react";
import { amenities as allAmenities } from "@/lib/definitions";
import { MapPin } from "lucide-react";

export type FilterState = {
  country?: string;
  state?: string;
  school?: string;
  price?: number;
  propertyType?: string;
  bedrooms?: string;
  bathrooms?: string;
  amenities?: string[];
  useCurrentLocation?: boolean;
};

type SearchFiltersProps = {
    onFilterChange: (filters: FilterState) => void;
    onReset: () => void;
    initialFilters?: FilterState;
    onLocationSuccess: (coords: { lat: number; lng: number }) => void;
};


export default function SearchFilters({ onFilterChange, onReset, initialFilters, onLocationSuccess }: SearchFiltersProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilters || {});
  const [price, setPrice] = useState(initialFilters?.price || 3000);

  useEffect(() => {
    if (initialFilters) {
        setFilters(initialFilters);
        setPrice(initialFilters.price || 3000);
    }
  }, [initialFilters]);
  
  const handleInputChange = (field: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [field]: value };
    // If a manual location filter is changed, turn off `useCurrentLocation`
    if (['country', 'state', 'school'].includes(field)) {
      newFilters.useCurrentLocation = false;
    }
    setFilters(newFilters);
  };
  
  const handleAmenityChange = (amenity: string, checked: boolean) => {
    const currentAmenities = filters.amenities || [];
    const newAmenities = checked ? [...currentAmenities, amenity] : currentAmenities.filter(a => a !== amenity);
    handleInputChange('amenities', newAmenities);
  }

  const handleApplyFilters = () => {
    onFilterChange({...filters, price});
  };

  const handleReset = () => {
      setPrice(3000);
      onReset();
  }

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                onLocationSuccess({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            (error) => {
                console.error("Geolocation error:", error);
                alert("Could not get your location. Please ensure location services are enabled and try again.");
                // Reset location state if it fails
                const newFilters = { ...filters, useCurrentLocation: false };
                setFilters(newFilters);
                onFilterChange(newFilters);
            }
        );
    } else {
        alert("Geolocation is not supported by this browser.");
    }
  }

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="font-headline">Filter & Sort</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="country">Country</Label>
          <Select value={filters.useCurrentLocation ? '' : filters.country} onValueChange={(value) => handleInputChange('country', value)} disabled={filters.useCurrentLocation}>
            <SelectTrigger id="country">
              <SelectValue placeholder="Select Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USA">United States</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="state">State</Label>
          <Select value={filters.useCurrentLocation ? '' : filters.state} onValueChange={(value) => handleInputChange('state', value)} disabled={filters.useCurrentLocation}>
            <SelectTrigger id="state">
              <SelectValue placeholder="Select State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CA">California</SelectItem>
              <SelectItem value="NY">New York</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
            <Label htmlFor="school">School</Label>
            <div className="flex gap-2">
                <Select value={filters.useCurrentLocation ? '' : filters.school} onValueChange={(value) => handleInputChange('school', value)} disabled={filters.useCurrentLocation}>
                    <SelectTrigger id="school">
                    <SelectValue placeholder="Select School" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="Urbanville University">Urbanville University</SelectItem>
                    <SelectItem value="Metropolis University">Metropolis University</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={handleCurrentLocation}>
                    <MapPin className="h-4 w-4" />
                    <span className="sr-only">Use current location</span>
                </Button>
            </div>
             {filters.useCurrentLocation && <p className="text-xs text-primary">Showing properties near you.</p>}
        </div>
        <div className="grid gap-2">
          <Label>Max Price: ${price.toLocaleString()}</Label>
          <Slider 
            value={[price]} 
            onValueChange={(value) => setPrice(value[0])}
            max={5000} 
            min={500} 
            step={50} 
           />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="property-type">Property Type</Label>
          <Select value={filters.propertyType} onValueChange={(value) => handleInputChange('propertyType', value)}>
            <SelectTrigger id="property-type">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="Apartment">Apartment</SelectItem>
              <SelectItem value="House">House</SelectItem>
              <SelectItem value="Studio">Studio</SelectItem>
              <SelectItem value="Loft">Loft</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
             <div className="grid gap-2">
                <Label htmlFor="bedrooms">Beds</Label>
                <Select value={filters.bedrooms} onValueChange={(value) => handleInputChange('bedrooms', value)}>
                    <SelectTrigger id="bedrooms"><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4+</SelectItem>
                    </SelectContent>
                </Select>
            </div>
             <div className="grid gap-2">
                <Label htmlFor="bathrooms">Baths</Label>
                <Select value={filters.bathrooms} onValueChange={(value) => handleInputChange('bathrooms', value)}>
                    <SelectTrigger id="bathrooms"><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3+</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
        <div className="grid gap-2">
          <Label>Amenities</Label>
          <div className="grid grid-cols-2 gap-2">
            {allAmenities.slice(0, 6).map(amenity => (
              <div key={amenity} className="flex items-center space-x-2">
                <Checkbox 
                    id={amenity.toLowerCase().replace(/[\s-]/g, '')}
                    checked={filters.amenities?.includes(amenity)}
                    onCheckedChange={(checked) => handleAmenityChange(amenity, !!checked)}
                />
                <Label htmlFor={amenity.toLowerCase().replace(/[\s-]/g, '')} className="text-sm font-normal">{amenity}</Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button className="w-full" onClick={handleApplyFilters}>Apply Filters</Button>
        <Button variant="ghost" className="w-full" onClick={handleReset}>Reset</Button>
      </CardFooter>
    </Card>
  );
}
