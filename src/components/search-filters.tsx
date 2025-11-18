
'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { useState } from "react";

const amenities = ["Furnished", "Wi-Fi", "In-unit Laundry", "Pet Friendly", "Parking Spot", "Gym Access"];

export default function SearchFilters() {
  const [location, setLocation] = useState("");

  const handleLocationClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // In a real app, you'd use position.coords.latitude and position.coords.longitude
          // to query a reverse geocoding API and get the city/address.
          console.log("Lat:", position.coords.latitude, "Lon:", position.coords.longitude);
          setLocation("Current Location");
          alert("Location set to your current position!");
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
              value={location} 
              onChange={(e) => setLocation(e.target.value)}
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
          <Label>Price Range</Label>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>$500</span>
            <span>$3000+</span>
          </div>
          <Slider defaultValue={[1500]} max={3000} min={500} step={50} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="property-type">Property Type</Label>
          <Select>
            <SelectTrigger id="property-type">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="apartment">Apartment</SelectItem>
              <SelectItem value="house">House</SelectItem>
              <SelectItem value="studio">Studio</SelectItem>
              <SelectItem value="loft">Loft</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
             <div className="grid gap-2">
                <Label htmlFor="bedrooms">Beds</Label>
                <Select>
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
                <Select>
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
            {amenities.map(amenity => (
              <div key={amenity} className="flex items-center space-x-2">
                <Checkbox id={amenity.toLowerCase().replace(' ', '-')}/>
                <Label htmlFor={amenity.toLowerCase().replace(' ', '-')} className="text-sm font-normal">{amenity}</Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button className="w-full">Apply Filters</Button>
        <Button variant="ghost" className="w-full">Reset</Button>
      </CardFooter>
    </Card>
  );
}
