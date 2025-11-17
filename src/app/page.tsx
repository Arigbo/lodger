import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, MapPin, KeyRound, Smile } from "lucide-react";
import PropertyCard from "@/components/property-card";
import { getProperties } from "@/lib/data";
import placeholderImages from '@/lib/placeholder-images.json';

export default function Home() {
  const featuredProperties = getProperties().slice(0, 3);
  const heroImage = placeholderImages.placeholderImages.find(p => p.id === 'hero-image');

  return (
    <div className="flex flex-col">
      <section className="relative h-[60vh] w-full">
        {heroImage && (
            <Image
                src={heroImage.imageUrl}
                alt={heroImage.description}
                fill
                className="object-cover"
                data-ai-hint={heroImage.imageHint}
                priority
            />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-white">
          <h1 className="font-headline text-5xl font-bold md:text-7xl">
            Find Your Urban Nest
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-200">
            The perfect place for students to discover apartments and homes for rent near campus.
          </p>
          <div className="mt-8 flex w-full max-w-xl items-center space-x-2 rounded-lg bg-white p-2 shadow-lg">
            <Input
              type="text"
              placeholder="Enter a city, neighborhood, or university"
              className="flex-grow border-0 text-base text-gray-700 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              <Search className="mr-2 h-5 w-5" />
              Search
            </Button>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-background py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center font-headline text-4xl font-bold">
            How It Works
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">
            Finding your next home is as easy as 1, 2, 3.
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <Card className="transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
              <CardContent className="p-8 text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 text-accent-foreground">
                  <MapPin className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-headline text-2xl font-semibold">
                  1. Search & Discover
                </h3>
                <p className="mt-4 text-muted-foreground">
                  Use our advanced filters to find the perfect apartment by location, price, and amenities.
                </p>
              </CardContent>
            </Card>
            <Card className="transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
              <CardContent className="p-8 text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 text-accent-foreground">
                  <KeyRound className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-headline text-2xl font-semibold">
                  2. Connect & Apply
                </h3>
                <p className="mt-4 text-muted-foreground">
                  Contact landlords, schedule virtual tours, and submit your rental application directly on our platform.
                </p>
              </CardContent>
            </Card>
            <Card className="transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
              <CardContent className="p-8 text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 text-accent-foreground">
                  <Smile className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-headline text-2xl font-semibold">
                  3. Move In
                </h3>
                <p className="mt-4 text-muted-foreground">
                  Sign your lease online and get ready to move into your new home. Welcome to the neighborhood!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="featured" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center font-headline text-4xl font-bold">
            Featured Properties
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">
            Check out some of the best student-friendly apartments available right now.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {featuredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
          <div className="mt-12 text-center">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
              <Link href="/properties">View All Properties</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-primary py-20 text-primary-foreground">
        <div className="container mx-auto flex flex-col items-center justify-between px-4 text-center md:flex-row md:text-left">
          <div>
            <h2 className="font-headline text-4xl font-bold">
              Are you a landlord?
            </h2>
            <p className="mt-2 max-w-2xl">
              List your property on Urban Nest and connect with thousands of qualified student tenants.
            </p>
          </div>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="mt-6 shrink-0 bg-accent text-accent-foreground hover:bg-accent/90 md:mt-0"
          >
            <Link href="/dashboard">List Your Property</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
