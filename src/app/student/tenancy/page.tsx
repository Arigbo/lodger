
'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { LeaseAgreement, Property } from '@/lib/definitions';
import { Building } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PropertyCard from '@/components/property-card';
import React from 'react';
import Loading from '@/app/loading';

export default function TenancyDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const leasesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'leaseAgreements'), where('tenantId', '==', user.uid), where('status', '==', 'active'));
  }, [user, firestore]);
  
  const { data: leases, isLoading: areLeasesLoading } = useCollection<LeaseAgreement>(leasesQuery);

  React.useEffect(() => {
    if (areLeasesLoading || !leases) return;

    const fetchProperties = async () => {
        if (leases.length === 0) {
            setProperties([]);
            setIsLoading(false);
            return;
        }

        const propertyIds = leases.map(lease => lease.propertyId);
        const propertiesQuery = query(collection(firestore, 'properties'), where('id', 'in', propertyIds));
        const propertySnapshots = await getDocs(propertiesQuery);
        const fetchedProperties = propertySnapshots.docs.map(doc => doc.data() as Property);
        setProperties(fetchedProperties);
        setIsLoading(false);
    }
    fetchProperties();
  }, [leases, areLeasesLoading, firestore]);


  if (isUserLoading || isLoading) {
      return <Loading />;
  }

  return (
    <div className="space-y-6">
        <div className="text-center">
            <h1 className="font-headline text-3xl font-bold">My Tenancies</h1>
            <p className="text-muted-foreground">Manage your current rental agreements and payments.</p>
        </div>

        {properties && properties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {properties.map(property => (
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

    