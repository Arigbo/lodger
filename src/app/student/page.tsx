
"use client";

import PropertyCard from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Home } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Property } from "@/lib/definitions";
import Loading from '@/app/loading';


export default function StudentDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/auth/login');
    }
  }, [isUserLoading, user, router]);
  
  const propertiesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'properties'), where('currentTenantId', '==', user.uid));
  }, [user, firestore]);
  
  const { data: rentedProperties, isLoading: propertiesLoading } = useCollection<Property>(propertiesQuery);
  
  if (isUserLoading || propertiesLoading || !user) {
      return <Loading />; // Or a more sophisticated skeleton loader
  }

  // The user object from Firebase Auth doesn't contain the role.
  // A proper role check would involve fetching the user's document from Firestore or using custom claims.
  // For now, we'll assume a user trying to access the student page is a student if they have rented properties
  // or no properties at all. This logic can be improved later with proper role management.
  if (user && !rentedProperties) {
    // This could be a landlord or a student who hasn't rented anything.
    // A robust app would check their role from a 'users' collection document.
    // For now, we let them see the student dashboard.
  }

  return (
     <div>
        <div>
            <h1 className="font-headline text-3xl font-bold">Student Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.displayName || user?.email}.</p>
        </div>
        <Separator className="my-6" />

        <h2 className="text-2xl font-headline font-semibold">My Home</h2>
        
        {rentedProperties && rentedProperties.length > 0 ? (
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

    