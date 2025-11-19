
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Property } from '@/lib/definitions';

export default function TenancyRedirectPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const rentedPropertiesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'properties'), where('currentTenantId', '==', user.uid));
  }, [user, firestore]);
  
  const { data: rentedProperties, isLoading: isPropertiesLoading } = useCollection<Property>(rentedPropertiesQuery);
  
  useEffect(() => {
      if (!isUserLoading && !isPropertiesLoading && rentedProperties && rentedProperties.length > 0) {
          const property = rentedProperties[0]; // Assuming one property per tenant
          router.replace(`/student/properties/${property.id}`);
      }
  }, [rentedProperties, isUserLoading, isPropertiesLoading, router]);

  if (isUserLoading || isPropertiesLoading) {
      return (
          <div>
              <p>Checking your tenancy status...</p>
          </div>
      );
  }

  if (rentedProperties && rentedProperties.length > 0) {
      // This will be briefly shown while redirecting
      return <div>Redirecting to your tenancy details...</div>;
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>No Tenancy Found</CardTitle>
            <CardDescription>You are not currently renting any properties.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild>
                <Link href="/student/properties">Find a Property to Rent</Link>
            </Button>
        </CardContent>
    </Card>
  );
}
