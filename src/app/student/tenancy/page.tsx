
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Property } from '@/lib/definitions';
import { Building } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function TenancyRedirectPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const rentedPropertiesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'properties'), where('currentTenantId', '==', user.uid), where('status', '==', 'occupied'));
  }, [user, firestore]);
  
  const { data: rentedProperties, isLoading: isPropertiesLoading } = useCollection<Property>(rentedPropertiesQuery);
  
  useEffect(() => {
      if (!isUserLoading && !isPropertiesLoading && rentedProperties && rentedProperties.length > 0) {
          const property = rentedProperties[0]; // Assuming one property per tenant for now
          router.replace(`/student/properties/${property.id}`);
      }
  }, [rentedProperties, isUserLoading, isPropertiesLoading, router]);

  if (isUserLoading || isPropertiesLoading) {
      return (
          <Card>
            <CardHeader>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-10 w-40" />
            </CardContent>
          </Card>
      );
  }

  // This state is reached if loading is complete and there are no rented properties.
  return (
    <Card>
        <CardHeader className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                <Building className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="mt-4">No Active Tenancy Found</CardTitle>
            <CardDescription>You are not currently renting any properties. Your active tenancy details will appear here once you've signed a lease.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
            <Button asChild>
                <Link href="/student/properties">Find a Property to Rent</Link>
            </Button>
        </CardContent>
    </Card>
  );
}
