"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import React, { useState, useEffect } from "react";
import { amenities as allAmenities } from "@/types";
import { MapPin, Info } from "lucide-react";
import { Input } from "./ui/input";
import { countries } from "@/types/countries";
import { PROPERTY_TYPES } from "@/types/property-types";
import { useToast } from "@/hooks/use-toast";
import { Combobox } from "./ui/combobox";
import { SchoolCombobox } from "@/components/school-combobox";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { cn, formatPrice } from "@/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export type FilterState = {
  country?: string;
  state?: string;
  city?: string;
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
  schoolsInArea?: string[] | null;
  availableStates: string[];
  userCurrency?: string;
  className?: string;
};

export default function SearchFilters({
  onFilterChange,
  onReset,
  initialFilters,
  onLocationSuccess,
  schoolsInArea,
  availableStates,
  userCurrency = "USD",
  className,
}: SearchFiltersProps) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<FilterState>(initialFilters || {});
  const [price, setPrice] = useState(initialFilters?.price || 3000);

  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters);
      setPrice(
        initialFilters.price ||
          (userCurrency === "NGN"
            ? 1000000
            : userCurrency === "GHS"
              ? 10000
              : 3000),
      );
    }
  }, [initialFilters, userCurrency]);

  const handleInputChange = (field: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [field]: value };
    // If a manual location filter is changed, turn off `useCurrentLocation`
    if (["country", "state", "city", "school"].includes(field)) {
      newFilters.useCurrentLocation = false;
    }
    setFilters(newFilters);
    // Auto-apply filters immediately
    onFilterChange({ ...newFilters, price });
  };

  const handleAmenityChange = (amenity: string, checked: boolean) => {
    const currentAmenities = filters.amenities || [];
    const newAmenities = checked
      ? [...currentAmenities, amenity]
      : currentAmenities.filter((a) => a !== amenity);
    handleInputChange("amenities", newAmenities);
  };

  const handleReset = () => {
    setPrice(
      userCurrency === "NGN" ? 1000000 : userCurrency === "GHS" ? 10000 : 3000,
    );
    onReset();
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onLocationSuccess({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
          alert(
            "Could not get your location. Please ensure location services are enabled and try again.",
          );
          // Reset location state if it fails
          const newFilters = { ...filters, useCurrentLocation: false };
          setFilters(newFilters);
          onFilterChange(newFilters);
        },
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle className="font-headline">Filter & Sort</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="country">Country</Label>
          <Combobox
            options={countries.map((c) => ({ label: c.name, value: c.name }))}
            value={filters.country}
            onChange={(value) => handleInputChange("country", value)}
            placeholder="Select Country"
            disabled={filters.useCurrentLocation}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-2">
            <Label htmlFor="state">State</Label>
            <Combobox
              options={
                filters.country
                  ? countries
                      .find((c) => c.name === filters.country)
                      ?.states.map((s) => ({ label: s.name, value: s.name })) ||
                    []
                  : availableStates.map((s) => ({ label: s, value: s }))
              }
              value={filters.state}
              onChange={(value) => handleInputChange("state", value)}
              placeholder="Select State"
              disabled={filters.useCurrentLocation}
              emptyText={
                filters.country
                  ? "No states found"
                  : "Select a country or use existing properties"
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              placeholder="Enter city"
              value={filters.city || ""}
              onChange={(e) => handleInputChange("city", e.target.value)}
              disabled={filters.useCurrentLocation}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="school">School</Label>
          <div className="flex gap-2">
            <div className="flex-grow">
              {schoolsInArea !== null ? (
                <Combobox
                  options={(schoolsInArea || []).map((school) => ({
                    label: school,
                    value: school,
                  }))}
                  value={filters.school}
                  onChange={(value) => handleInputChange("school", value)}
                  placeholder="Select School"
                  disabled={
                    filters.useCurrentLocation &&
                    (schoolsInArea?.length || 0) === 0
                  }
                  emptyText="No schools found in this area."
                />
              ) : (
                <SchoolCombobox
                  value={filters.school}
                  onChange={(value) => handleInputChange("school", value)}
                  placeholder="Select School"
                  disabled={filters.useCurrentLocation}
                />
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCurrentLocation}
            >
              <MapPin className="h-4 w-4" />
              <span className="sr-only">Use current location</span>
            </Button>
          </div>
          {filters.useCurrentLocation && (
            <p className="text-xs text-primary">Showing properties near you.</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label>Max Price: {formatPrice(price, userCurrency)}</Label>
          <Slider
            value={[price]}
            onValueChange={(value) => {
              setPrice(value[0]);
              onFilterChange({ ...filters, price: value[0] });
            }}
            max={
              userCurrency === "NGN"
                ? 5000000
                : userCurrency === "GHS"
                  ? 50000
                  : 10000
            }
            min={
              userCurrency === "NGN"
                ? 50000
                : userCurrency === "GHS"
                  ? 500
                  : 100
            }
            step={
              userCurrency === "NGN" ? 10000 : userCurrency === "GHS" ? 100 : 50
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="property-type">Property Type</Label>
          <Select
            value={filters.propertyType}
            onValueChange={(value) => handleInputChange("propertyType", value)}
          >
            <SelectTrigger id="property-type">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              {PROPERTY_TYPES.map((type) => (
                <SelectItem
                  key={type.value}
                  value={type.value}
                  className="group"
                >
                  <div className="flex items-center justify-between w-full gap-2 min-w-[120px]">
                    <span>{type.label}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          role="button"
                          className="p-1 hover:bg-muted rounded-full transition-colors opacity-50 group-hover:opacity-100"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <Info className="h-3 w-3" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[200px] font-bold text-[10px] uppercase tracking-widest text-primary p-4 rounded-xl border-2">
                        <p>{type.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-2">
            <Label htmlFor="bedrooms">Beds</Label>
            <Select
              value={filters.bedrooms}
              onValueChange={(value) => handleInputChange("bedrooms", value)}
            >
              <SelectTrigger id="bedrooms">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
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
            <Select
              value={filters.bathrooms}
              onValueChange={(value) => handleInputChange("bathrooms", value)}
            >
              <SelectTrigger id="bathrooms">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3+">3+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Amenities</Label>
          <div className="grid grid-cols-2 gap-2">
            {allAmenities.slice(0, 6).map((amenity) => (
              <div key={amenity} className="flex items-center space-x-2">
                <Checkbox
                  id={amenity.toLowerCase().replace(/[\s-]/g, "")}
                  checked={Boolean(filters.amenities?.includes(amenity))}
                  onCheckedChange={(checked) =>
                    handleAmenityChange(amenity, !!checked)
                  }
                />
                <Label
                  htmlFor={amenity.toLowerCase().replace(/[\s-]/g, "")}
                  className="text-sm font-normal"
                >
                  {amenity}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button variant="ghost" className="w-full" onClick={handleReset}>
          Reset All Filters
        </Button>
      </CardFooter>
    </Card>
  );
}
