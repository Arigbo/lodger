import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

const amenities = ["Furnished", "Wi-Fi", "In-unit Laundry", "Pet Friendly", "Parking Spot", "Gym Access"];

export default function SearchFilters() {
  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="font-headline">Filter & Sort</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" placeholder="e.g. Urbanville" />
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
