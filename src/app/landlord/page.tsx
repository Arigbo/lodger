"use client";

import PropertyCard from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getPropertiesByLandlord, getUserById } from "@/lib/data";
import { PlusCircle, Building } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Mock current user - replace with real auth
const useUser = () => {
  // To test a landlord, use 'user-1'. 
  // To test a student tenant, use 'user-3'.
  const user = getUserById('user-1'); 
  return { user };
}

export default function LandlordDashboardPage() {
  const { user } = useUser();
  const router = useRouter();

  if (!user) {
    // This should be handled by a higher-level auth boundary
    return <div className="container py-12">Please log in to view your dashboard.</div>;
  }
  
  // If a student somehow lands here, redirect them to their own dashboard
  if (user.role === 'student') {
    router.replace('/student');
    return null;
  }
  
  return <LandlordOverview />;
}

function LandlordOverview() {
  const landlord = getUserById('user-1'); // mock
  const properties = landlord ? getPropertiesByLandlord(landlord.id) : [];

  return (
    <div>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
                <h1 className="font-headline text-3xl font-bold">Overview</h1>
                <p className="text-muted-foreground">Welcome back, {landlord?.name}.</p>
            </div>
            <Button asChild>
                <Link href="/landlord/properties/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Property
                </Link>
            </Button>
        </div>
        <Separator className="my-6" />

        <h2 className="text-2xl font-headline font-semibold">My Properties ({properties.length})</h2>
        
        {properties.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
                {properties.map(property => (
                    <PropertyCard key={property.id} property={property} />
                ))}
            </div>
        ) : (
            <Card className="mt-6">
                <CardHeader>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                        <Building className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-center">No Properties Found</CardTitle>
                    <CardDescription className="text-center">Get started by listing your first property.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                     <Button asChild>
                        <Link href="/landlord/properties/new">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            List a Property
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        )}
    </div>
  );
}
