
'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import React, { useState, useEffect } from "react";
import { amenities as allAmenities } from "@/lib/definitions";

export type FilterState = {
  location?: {
    searchTerm?: string;
    lat?: number;
    lng?: number;
  };
  price?: number;
  propertyType?: string;
  bedrooms?: string;
  bathrooms?: string;
  amenities?: string[];
};

type SearchFiltersProps = {
    onFilterChange: (filters: FilterState) => void;
    onReset: () => void;
};


export default function SearchFilters({ onFilterChange, onReset }: SearchFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({});
  const [price, setPrice] = useState(3000);
  
  const handleInputChange = (field: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };
  
  const handleLocationSearch = (term: string) => {
    setFilters(prev => ({ ...prev, location: { searchTerm: term } }));
  }
  
  const handleAmenityChange = (amenity: string, checked: boolean) => {
    const currentAmenities = filters.amenities || [];
    if (checked) {
      handleInputChange('amenities', [...currentAmenities, amenity]);
    } else {
      handleInputChange('amenities', currentAmenities.filter(a => a !== amenity));
    }
  }

  const handleLocationClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log("Lat:", latitude, "Lon:", longitude);
          setFilters(prev => ({ ...prev, location: { lat: latitude, lng: longitude, searchTerm: 'Current Location' } }));
        },
        (error) => {
          console.error("Error getting location: ", error);
          alert("Could not get your location. Please ensure you've enabled location services for this site.");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const handleApplyFilters = () => {
    onFilterChange({...filters, price});
  };

  const handleReset = () => {
      setFilters({});
      setPrice(3000);
      onReset();
  }

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="font-headline">Filter & Sort</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="location">Location</Label>
          <div className="relative">
            <Input 
              id="location" 
              placeholder="e.g. Urbanville" 
              value={filters.location?.searchTerm || ""} 
              onChange={(e) => handleLocationSearch(e.target.value)}
              className="pr-10"
            />
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="absolute inset-y-0 right-0 h-full px-3"
              onClick={handleLocationClick}
            >
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Use current location</span>
            </Button>
          </div>
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
