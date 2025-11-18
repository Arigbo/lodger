
"use client";

import PropertyCard from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getPropertiesByTenant, getUserById } from "@/lib/data";
import { Home } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";


// Mock current user - replace with real auth
const useUser = () => {
  // To test a landlord, use 'user-1'. 
  // To test a student tenant, use 'user-3'.
  const user = getUserById('user-3'); 
  return { user };
}


export default function StudentDashboardPage() {
  const { user } = useUser();
  const router = useRouter();

  if (!user) {
    return <div className="container py-12">Please log in to view your dashboard.</div>;
  }
  
  if (user.role === 'landlord') {
    router.replace('/landlord');
    return null;
  }
  
  const rentedProperties = getPropertiesByTenant(user.id);

  return (
     <div>
        <div>
            <h1 className="font-headline text-3xl font-bold">Student Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user.name}.</p>
        </div>
        <Separator className="my-6" />

        <h2 className="text-2xl font-headline font-semibold">My Home</h2>
        
        {rentedProperties.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
                {rentedProperties.map(property => (
                    <PropertyCard key={property.id} property={property} />
                ))}
            </div>
        ) : (
            <Card className="mt-6">
                 <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                        <Home className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <CardTitle>You are not currently renting any property.</CardTitle>
                    <CardDescription>Once your rental request is accepted, it will show up here.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Button asChild>
                        <Link href="/student/properties">Find a Property</Link>
                    </Button>
                </CardContent>
            </Card>
        )}
    </div>
  )
}
