
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
import type { RentalApplication, User, Property } from '@/lib/definitions';
import { BellRing, Search } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import Loading from '@/app/loading';

type AggregatedRequest = {
  request: RentalApplication;
  landlord: User | null;
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


export default function StudentRequestsPage() {
  const { user: student, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [aggregatedRequests, setAggregatedRequests] = React.useState<AggregatedRequest[]>([]);
  const [isAggregating, setIsAggregating] = React.useState(true);
  
  const requestsQuery = useMemoFirebase(() => {
      if (!student) return null;
      return query(collection(firestore, 'rentalApplications'), where('tenantId', '==', student.uid));
  }, [student, firestore]);

  const { data: studentRequests, isLoading: areRequestsLoading } = useCollection<RentalApplication>(requestsQuery);

  React.useEffect(() => {
    if (areRequestsLoading) return;
    if (!studentRequests || !firestore) {
      setAggregatedRequests([]);
      setIsAggregating(false);
      return;
    }

    const aggregateData = async () => {
      setIsAggregating(true);
      if (studentRequests.length === 0) {
        setAggregatedRequests([]);
        setIsAggregating(false);
        return;
      }

      const landlordIds = [...new Set(studentRequests.map(r => r.landlordId))].filter(Boolean);
      const propertyIds = [...new Set(studentRequests.map(r => r.propertyId))].filter(Boolean);

      const usersMap = new Map<string, User>();
      const propertiesMap = new Map<string, Property>();

      if (landlordIds.length > 0) {
        const userChunks = chunkArray(landlordIds, 30);
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
      
      const finalData = studentRequests.map(request => ({
        request,
        landlord: usersMap.get(request.landlordId) || null,
        property: propertiesMap.get(request.propertyId) || null,
      }));

      setAggregatedRequests(finalData.sort((a,b) => new Date(b.request.applicationDate).getTime() - new Date(a.request.applicationDate).getTime()));
      setIsAggregating(false);
    };

    aggregateData();
  }, [studentRequests, areRequestsLoading, firestore]);

  const getStatusVariant = (status: RentalApplication['status']) => {
    switch (status) {
      case 'approved':
        return 'secondary';
      case 'declined':
        return 'destructive';
      case 'pending':
        return 'default';
      default:
        return 'outline';
    }
  };

  if (isUserLoading || areRequestsLoading || isAggregating) {
    return <Loading />;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold">My Rental Requests</h1>
          <p className="text-muted-foreground">
            Track the status of your applications.
          </p>
        </div>
      </div>
      <Separator className="my-6" />

      <Card>
        <CardHeader>
          <CardTitle>Application History</CardTitle>
          <CardDescription>
            You have sent {aggregatedRequests.length} rental requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {aggregatedRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Landlord</TableHead>
                  <TableHead>Date Sent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aggregatedRequests.map(({request, landlord, property}) => {
                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <Link href={`/student/properties/${property?.id}`} className="font-medium hover:underline">
                          {property?.title || 'Unknown Property'}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{landlord?.name || 'Unknown Landlord'}</span>
                      </TableCell>
                      <TableCell>{new Date(request.applicationDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                         <Badge variant={getStatusVariant(request.status)} className="capitalize">
                            {request.status}
                         </Badge>
                      </TableCell>
                      <TableCell>
                        {request.status === 'approved' && (
                            <Button variant="secondary" size="sm" asChild>
                                <Link href="/student/leases">
                                    View Leases
                                </Link>
                            </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
             <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-background">
                <BellRing className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No Requests Sent</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                When you apply for a property, your requests will appear here.
              </p>
               <Button asChild className="mt-4">
                    <Link href="/student/properties">
                        <Search className="mr-2 h-4 w-4" /> Find a Property
                    </Link>
                </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
