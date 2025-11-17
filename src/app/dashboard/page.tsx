"use client";

import PropertyCard from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getPropertiesByLandlord, getPropertiesByTenant, getUserById } from "@/lib/data";
import { PlusCircle, Building, Home } from "lucide-react";

// Mock current user - replace with real auth
const useUser = () => {
  // To test a landlord, use 'user-1'. 
  // To test a student tenant, use 'user-3'.
  const user = getUserById('user-1'); 
  return { user };
}

export default function DashboardPage() {
  const { user } = useUser();

  if (!user) {
    return <div className="container py-12">Please log in to view your dashboard.</div>;
  }

  if (user.role === 'student') {
    return <StudentDashboard />;
  }
  
  return <LandlordDashboard />;
}

function LandlordDashboard() {
  const landlord = getUserById('user-1'); // mock
  const properties = landlord ? getPropertiesByLandlord(landlord.id) : [];

  return (
    <div className="container mx-auto max-w-7xl py-12 px-4">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
                <h1 className="font-headline text-3xl font-bold">Landlord Dashboard</h1>
                <p className="text-muted-foreground">Manage your properties and rental requests.</p>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Property
            </Button>
        </div>
        <Separator className="my-6" />

        <h2 className="text-2xl font-headline font-semibold">My Properties ({properties.length})</h2>
        
        {properties.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
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
                     <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        List a Property
                    </Button>
                </CardContent>
            </Card>
        )}
    </div>
  );
}

function StudentDashboard() {
  const student = getUserById('user-3'); // mock
  const rentedProperties = student ? getPropertiesByTenant(student.id) : [];

  return (
     <div className="container mx-auto max-w-7xl py-12 px-4">
        <div>
            <h1 className="font-headline text-3xl font-bold">Student Dashboard</h1>
            <p className="text-muted-foreground">Manage your current rental.</p>
        </div>
        <Separator className="my-6" />

        <h2 className="text-2xl font-headline font-semibold">My Home</h2>
        
        {rentedProperties.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {rentedProperties.map(property => (
                    <PropertyCard key={property.id} property={property} />
                ))}
            </div>
        ) : (
            <Card className="mt-6">
                 <CardHeader>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                        <Home className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-center">You are not currently renting any property.</CardTitle>
                    <CardDescription className="text-center">Once your rental request is accepted, it will show up here.</CardDescription>
                </CardHeader>
            </Card>
        )}
    </div>
  )
}
