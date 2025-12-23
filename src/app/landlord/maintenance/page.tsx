
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { MaintenanceRequest, UserProfile as User, Property } from '@/types';
import { MoreHorizontal, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import Loading from '@/app/loading';


type AggregatedRequest = MaintenanceRequest & {
  tenantName: string;
  propertyName: string;
};

// Helper function to split an array into chunks
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}


export default function MaintenancePage() {
  const { user: landlord, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [requests, setRequests] = React.useState<AggregatedRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!landlord || !firestore) return;

    const fetchMaintenanceRequests = async () => {
      setIsLoading(true);

      const requestsQuery = query(collection(firestore, 'maintenanceRequests'), where('landlordId', '==', landlord.uid));
      const requestsSnapshot = await getDocs(requestsQuery);
      const landlordRequests: MaintenanceRequest[] = requestsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as MaintenanceRequest));

      if (landlordRequests.length === 0) {
        setRequests([]);
        setIsLoading(false);
        return;
      }

      const tenantIds = [...new Set(landlordRequests.map(r => r.tenantId))];
      const propertyIds = [...new Set(landlordRequests.map(r => r.propertyId))];

      const usersMap = new Map<string, User>();
      const propertiesMap = new Map<string, Property>();

      if (tenantIds.length > 0) {
        const userChunks = chunkArray(tenantIds, 30);
        for (const chunk of userChunks) {
          const usersQuery = query(collection(firestore, 'users'), where(documentId(), 'in', chunk));
          const usersSnapshot = await getDocs(usersQuery);
          usersSnapshot.forEach((doc: any) => usersMap.set(doc.id, { id: doc.id, ...doc.data() } as User));
        }
      }

      if (propertyIds.length > 0) {
        const propertyChunks = chunkArray(propertyIds, 30);
        for (const chunk of propertyChunks) {
          const propertiesQuery = query(collection(firestore, 'properties'), where(documentId(), 'in', chunk));
          const propertiesSnapshot = await getDocs(propertiesQuery);
          propertiesSnapshot.forEach((doc: any) => propertiesMap.set(doc.id, { id: doc.id, ...doc.data() } as Property));
        }
      }

      const aggregatedData = landlordRequests.map(request => ({
        ...request,
        tenantName: usersMap.get(request.tenantId)?.name || 'Unknown Tenant',
        propertyName: propertiesMap.get(request.propertyId)?.title || 'Unknown Property',
      }));

      setRequests(aggregatedData);
      setIsLoading(false);
    };

    fetchMaintenanceRequests();
  }, [landlord, firestore]);

  const getPriorityVariant = (priority: MaintenanceRequest['priority']) => {
    switch (priority) {
      case 'High':
        return 'destructive';
      case 'Medium':
        return 'default';
      case 'Low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusVariant = (status: MaintenanceRequest['status']) => {
    switch (status) {
      case 'Completed':
        return 'secondary';
      case 'In Progress':
        return 'default';
      case 'Pending':
        return 'outline';
      case 'Cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (isUserLoading || isLoading) {
    return <Loading />;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold">Maintenance</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Track and manage maintenance requests from tenants.
          </p>
        </div>
      </div>
      <Separator className="my-4 sm:my-6" />

      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
          <CardDescription>
            You have {requests.length} total maintenance requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          {requests.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <div className="inline-block min-w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Property</TableHead>
                      <TableHead className="hidden sm:table-cell text-xs sm:text-sm whitespace-nowrap">Tenant</TableHead>
                      <TableHead className="hidden md:table-cell text-xs sm:text-sm whitespace-nowrap">Request</TableHead>
                      <TableHead className="hidden lg:table-cell text-xs sm:text-sm whitespace-nowrap">Category</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Priority</TableHead>
                      <TableHead className="hidden sm:table-cell text-xs sm:text-sm whitespace-nowrap">Date</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-xs sm:text-sm"><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => {
                      return (
                        <TableRow key={request.id}>
                          <TableCell className="text-xs sm:text-sm py-2 sm:py-4">
                            <Link href={`/landlord/properties/${request.propertyId}`} className="font-medium hover:underline line-clamp-2">
                              {request.propertyName}
                            </Link>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs sm:text-sm py-2 sm:py-4">
                            <Link href={`/landlord/tenants/${request.tenantId}`} className="text-muted-foreground hover:underline line-clamp-1">
                              {request.tenantName}
                            </Link>
                          </TableCell>
                          <TableCell className="hidden md:table-cell font-medium text-xs sm:text-sm py-2 sm:py-4 max-w-xs">
                            <span className="line-clamp-2">{request.title}</span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs sm:text-sm py-2 sm:py-4 whitespace-nowrap">{request.category}</TableCell>
                          <TableCell className="text-xs sm:text-sm py-2 sm:py-4">
                            <Badge variant={getPriorityVariant(request.priority)} className="text-xs">{request.priority}</Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs sm:text-sm py-2 sm:py-4 whitespace-nowrap">{new Date(request.requestDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-xs sm:text-sm py-2 sm:py-4">
                            <Badge variant={getStatusVariant(request.status)} className="text-xs">{request.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Toggle menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem>Mark as In Progress</DropdownMenuItem>
                                <DropdownMenuItem>Mark as Completed</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  Cancel Request
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                <Wrench className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No Maintenance Requests</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                When tenants submit maintenance requests, they will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}




