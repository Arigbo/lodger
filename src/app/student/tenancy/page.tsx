
'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Property } from '@/lib/definitions';
import { Building } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PropertyCard from '@/components/property-card';

export default function TenancyDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const rentedPropertiesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'properties'), where('status', '==', 'occupied'));
  }, [user, firestore]);
  
  const { data: rentedProperties, isLoading: isPropertiesLoading } = useCollection<Property>(rentedPropertiesQuery);

  if (isUserLoading || isPropertiesLoading) {
      return (
        <div className="space-y-6">
            <div className="flex flex-col items-center justify-center text-center">
                <Skeleton className="h-8 w-48 mb-2"/>
                <Skeleton className="h-4 w-64"/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><Skeleton className="h-48 w-full"/></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-6 w-3/4"/>
                        <Skeleton className="h-4 w-full"/>
                        <Skeleton className="h-4 w-1/2"/>
                    </CardContent>
                </Card>
            </div>
        </div>
      );
  }

  return (
    <div className="space-y-6">
        <div className="text-center">
            <h1 className="font-headline text-3xl font-bold">My Tenancies</h1>
            <p className="text-muted-foreground">Manage your current rental agreements and payments.</p>
        </div>

        {rentedProperties && rentedProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {rentedProperties.map(property => (
                     <Link key={property.id} href={`/student/tenancy/${property.id}`} className="group block">
                        <PropertyCard property={property} as="div" />
                     </Link>
                ))}
            </div>
        ) : (
            <Card className="mt-6">
                <CardHeader className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                        <Building className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <CardTitle className="mt-4">No Active Tenancy Found</CardTitle>
                    <CardDescription>Your active tenancy details will appear here once you've signed a lease.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Button asChild>
                        <Link href="/student/properties">Find a Property to Rent</Link>
                    </Button>
                </CardContent>
            </Card>
        )}
    </div>
  );
}
