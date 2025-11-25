
"use client";

import PropertyCard from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { PlusCircle, Building } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { collection, query, where } from "firebase/firestore";
import type { Property } from "@/types";
import Loading from '@/app/loading';

export default function LandlordDashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/auth/login');
    }
  }, [isUserLoading, user, router]);

  if (isUserLoading || !user) {
    return <Loading />;
  }
  
  // This is a client component, but we have user data. We must ensure only landlords see this page.
  // We will get the user document from firestore to check the role.
  // For now, we'll assume if they try to access /landlord, they are one if logged in.
  // A more robust solution involves custom claims or checking the user doc.

  return <LandlordOverview />;
}

function LandlordOverview() {
  const { user } = useUser();
  const firestore = useFirestore();

  const propertiesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'properties'), where('landlordId', '==', user.uid));
  }, [user, firestore]);

  const { data: properties, isLoading } = useCollection<Property>(propertiesQuery);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
                <h1 className="font-headline text-3xl font-bold">Overview</h1>
                <p className="text-muted-foreground">Welcome back, {user?.displayName || user?.email}.</p>
            </div>
            <Button asChild>
                <Link href="/landlord/properties/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Property
                </Link>
            </Button>
        </div>
        <Separator className="my-6" />

        <h2 className="text-2xl font-headline font-semibold">My Properties ({properties?.length || 0})</h2>
        
        {properties && properties.length > 0 ? (
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

    

