
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
import type { LeaseAgreement, UserProfile as User, Property } from '@/types';
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
          userSnapshots.forEach((doc: any) => usersMap.set(doc.id, { id: doc.id, ...doc.data() } as User));
        }
      }

      if (propertyIds.length > 0) {
        const propertyChunks = chunkArray(propertyIds, 30);
        for (const chunk of propertyChunks) {
          const propertyPromises = query(collection(firestore, 'properties'), where(documentId(), 'in', chunk));
          const propertySnapshots = await getDocs(propertyPromises);
          propertySnapshots.forEach((doc: any) => propertiesMap.set(doc.id, { id: doc.id, ...doc.data() } as Property));
        }
      }

      const finalData = landlordLeases.map(lease => ({
        lease,
        tenant: usersMap.get(lease.tenantId) || null,
        property: propertiesMap.get(lease.propertyId) || null,
      }));

      setAggregatedLeases(finalData.sort((a, b) => new Date(b.lease.startDate).getTime() - new Date(a.lease.startDate).getTime()));
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold">Lease Agreements</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            View all lease agreements for your properties.
          </p>
        </div>
      </div>
      <Separator className="my-4 sm:my-6" />

      <Card>
        <CardHeader>
          <CardTitle>All Leases</CardTitle>
          <CardDescription>
            You have {aggregatedLeases.length} total lease agreements on record.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          {aggregatedLeases.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <div className="inline-block min-w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Property</TableHead>
                      <TableHead className="hidden sm:table-cell text-xs sm:text-sm whitespace-nowrap">Tenant</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Start Date</TableHead>
                      <TableHead className="hidden md:table-cell text-xs sm:text-sm whitespace-nowrap">End Date</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-xs sm:text-sm"><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aggregatedLeases.map(({ lease, tenant, property }) => {
                      return (
                        <TableRow key={lease.id}>
                          <TableCell className="text-xs sm:text-sm py-2 sm:py-4">
                            <Link href={`/landlord/properties/${property?.id}`} className="font-medium hover:underline line-clamp-2">
                              {property?.title || 'Unknown Property'}
                            </Link>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs sm:text-sm py-2 sm:py-4">
                            <Link href={`/landlord/tenants/${tenant?.id}`} className="text-muted-foreground hover:underline line-clamp-1">
                              {tenant?.name || 'Unknown Tenant'}
                            </Link>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm py-2 sm:py-4 whitespace-nowrap">{new Date(lease.startDate).toLocaleDateString()}</TableCell>
                          <TableCell className="hidden md:table-cell text-xs sm:text-sm py-2 sm:py-4 whitespace-nowrap">{new Date(lease.endDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-xs sm:text-sm py-2 sm:py-4">
                            <Badge variant={getStatusVariant(lease.status)} className="text-xs">
                              {lease.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm py-2 sm:py-4">
                            <Button variant="outline" size="xs" className="text-xs h-7 whitespace-nowrap" asChild>
                              <Link href={`/landlord/leases/${lease.id}`}>
                                <FileText className="mr-1 h-3 w-3 sm:h-4 sm:w-4" /> View
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
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


