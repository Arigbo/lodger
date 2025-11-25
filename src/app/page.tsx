import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, Search, Building, UserCheck } from "lucide-react";
import PropertyCard from "@/components/property-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { firestore } from "@/firebase/server";
import type { Property } from "@/types";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Lodger - Find Your Perfect Student Home",
  description: "The easiest way for university students to find and book their next rental property. Search thousands of listings near your campus.",
  alternates: {
    canonical: '/',
  },
};

async function getFeaturedProperties(): Promise<Property[]> {
  try {
    // Safely get the firestore instance, which might be undefined
    const db = firestore;
    if (!db) {
      console.warn("Firestore Admin SDK not available on the server. Skipping featured properties fetch.");
      return [];
    }

    const propertiesRef = db.collection('properties');
    const querySnapshot = await propertiesRef.where('status', '==', 'available').limit(3).get();
    const properties: Property[] = [];
    querySnapshot.forEach((doc: any) => {
      properties.push({ id: doc.id, ...doc.data() } as Property);
    });
    return properties;
  } catch (error: unknown) {
    console.error("Could not fetch featured properties (server-side):", error);
    // Gracefully return an empty array if Firestore isn't configured on the server.
    return [];
  }
}


export default async function Home() {
  const featuredProperties = await getFeaturedProperties();
  const heroImage = {
    imageUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: "Modern apartment living room",
    imageHint: "apartment living room"
  }


  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-background pt-20 pb-48 md:pt-32">
        {heroImage && (
          <div className="absolute inset-0">
            <Image
              src={heroImage.imageUrl}
              alt={heroImage.description}
              fill
              className="object-cover"
              data-ai-hint={heroImage.imageHint}
              priority
            />
            <div className="absolute inset-0 bg-black/60" />
          </div>
        )}
        <div className="relative container mx-auto px-4 text-center text-primary-foreground">
          <h1 className="font-headline text-5xl font-bold md:text-7xl">
            Find Your Perfect Student Home
          </h1>
          <p className="mt-4 max-w-3xl mx-auto text-lg text-primary-foreground/90">
            The easiest way for university students to find and book their next rental property.
          </p>
        </div>
      </section>

      {/* Search Bar Section */}
      <div className="-mt-32">
        <div className="container mx-auto px-4">
          <Card className="shadow-2xl max-w-4xl mx-auto">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 items-center">
                <div className="md:col-span-2 lg:col-span-2">
                  <label htmlFor="search" className="sr-only">Search</label>
                  <Input id="search" placeholder="Enter a city, address, or school..." />
                </div>
                <div>
                  <label htmlFor="type" className="sr-only">Property Type</label>
                  <Select>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Property Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Type</SelectItem>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="loft">Loft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="price" className="sr-only">Price Range</label>
                  <Select>
                    <SelectTrigger id="price">
                      <SelectValue placeholder="Price Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Price</SelectItem>
                      <SelectItem value="<1000">{'< $1,000'}</SelectItem>
                      <SelectItem value="1000-1500">$1,000 - $1,500</SelectItem>
                      <SelectItem value="1500-2000">$1,500 - $2,000</SelectItem>
                      <SelectItem value=">2000">{'> $2,000'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="md:col-span-4 lg:col-span-1 w-full" asChild>
                  <Link href="/student/properties">
                    <Search className="mr-2 h-4 w-4" /> Search
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* How it works Section */}
      <section id="how-it-works" className="py-20 bg-secondary/50 mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="font-headline text-4xl font-bold">
              Finding Your Next Home is Easy
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
              Follow these simple steps to secure your perfect student rental.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <Card className="bg-background">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Search & Discover</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Browse thousands of verified listings near your university with powerful search filters.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Building className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>View Properties</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Look at detailed photos, read descriptions, and even take virtual tours to find the right fit.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <UserCheck className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Request to Rent</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Easily connect with landlords and submit your rental requests directly through our platform.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Properties Section */}
      <section id="featured" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="font-headline text-4xl font-bold">
              Featured Properties
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
              Check out some of the top-rated student homes available right now.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {featuredProperties.map(property => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
          <div className="mt-12 text-center">
            <Button asChild size="lg" variant="outline">
              <Link href="/student/properties">View All Properties <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-primary text-primary-foreground p-12 rounded-lg text-center">
            <h2 className="font-headline text-4xl font-bold">
              Are You a Landlord?
            </h2>
            <p className="mt-2 max-w-2xl mx-auto">
              List your property on our platform and connect with thousands of qualified student tenants.
            </p>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Link href="/landlord">List Your Property <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
