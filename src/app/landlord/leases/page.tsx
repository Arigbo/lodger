
'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { LeaseAgreement, User, Property } from '@/lib/definitions';
import { FileText } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import Loading from '@/app/loading';

type AggregatedLease = {
  lease: LeaseAgreement;
  tenant: User | null;
  property: Property | null;
};

// Helper function to split an array into chunks
function chunkArray<T>(array: T[], size: number): T[][] {
  if (array.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}


export default function LandlordLeasesPage() {
  const { user: landlord, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [aggregatedLeases, setAggregatedLeases] = React.useState<AggregatedLease[]>([]);
  const [isAggregating, setIsAggregating] = React.useState(true);
  
  const leasesQuery = useMemoFirebase(() => {
      if (!landlord) return null;
      return query(collection(firestore, 'leaseAgreements'), where('landlordId', '==', landlord.uid));
  }, [landlord, firestore]);

  const { data: landlordLeases, isLoading: areLeasesLoading } = useCollection<LeaseAgreement>(leasesQuery);

  React.useEffect(() => {
    if (areLeasesLoading) return;
    if (!landlordLeases || !firestore) {
      setAggregatedLeases([]);
      setIsAggregating(false);
      return;
    }

    const aggregateData = async () => {
      setIsAggregating(true);
      if (landlordLeases.length === 0) {
        setAggregatedLeases([]);
        setIsAggregating(false);
        return;
      }

      const tenantIds = [...new Set(landlordLeases.map(l => l.tenantId))].filter(Boolean);
      const propertyIds = [...new Set(landlordLeases.map(l => l.propertyId))].filter(Boolean);

      const usersMap = new Map<string, User>();
      const propertiesMap = new Map<string, Property>();

      if (tenantIds.length > 0) {
        const userChunks = chunkArray(tenantIds, 30);
        for (const chunk of userChunks) {
            const usersQuery = query(collection(firestore, 'users'), where(documentId(), 'in', chunk));
            const userSnapshots = await getDocs(usersQuery);
            userSnapshots.forEach(doc => usersMap.set(doc.id, { id: doc.id, ...doc.data() } as User));
        }
      }

      if (propertyIds.length > 0) {
        const propertyChunks = chunkArray(propertyIds, 30);
        for (const chunk of propertyChunks) {
            const propertyPromises = query(collection(firestore, 'properties'), where(documentId(), 'in', chunk));
            const propertySnapshots = await getDocs(propertyPromises);
            propertySnapshots.forEach(doc => propertiesMap.set(doc.id, { id: doc.id, ...doc.data() } as Property));
        }
      }
      
      const finalData = landlordLeases.map(lease => ({
        lease,
        tenant: usersMap.get(lease.tenantId) || null,
        property: propertiesMap.get(lease.propertyId) || null,
      }));

      setAggregatedLeases(finalData.sort((a,b) => new Date(b.lease.startDate).getTime() - new Date(a.lease.startDate).getTime()));
      setIsAggregating(false);
    };

    aggregateData();
  }, [landlordLeases, areLeasesLoading, firestore]);

  const getStatusVariant = (status: LeaseAgreement['status']) => {
    switch (status) {
      case 'active':
        return 'secondary';
      case 'expired':
        return 'outline';
      case 'pending':
        return 'default';
      default:
        return 'default';
    }
  };

  if (isUserLoading || areLeasesLoading || isAggregating) {
    return <Loading />;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold">Lease Agreements</h1>
          <p className="text-muted-foreground">
            View all lease agreements for your properties.
          </p>
        </div>
      </div>
      <Separator className="my-6" />

      <Card>
        <CardHeader>
          <CardTitle>All Leases</CardTitle>
          <CardDescription>
            You have {aggregatedLeases.length} total lease agreements on record.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {aggregatedLeases.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aggregatedLeases.map(({lease, tenant, property}) => {
                  return (
                    <TableRow key={lease.id}>
                      <TableCell>
                        <Link href={`/landlord/properties/${property?.id}`} className="font-medium hover:underline">
                          {property?.title || 'Unknown Property'}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/landlord/tenants/${tenant?.id}`} className="text-muted-foreground hover:underline">
                          {tenant?.name || 'Unknown Tenant'}
                        </Link>
                      </TableCell>
                      <TableCell>{new Date(lease.startDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(lease.endDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                         <Badge variant={getStatusVariant(lease.status)}>
                            {lease.status}
                         </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/landlord/leases/${lease.id}`}>
                                <FileText className="mr-2 h-4 w-4" /> View
                            </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
             <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-background">
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No Lease Agreements</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                When you sign a lease with a tenant, it will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
