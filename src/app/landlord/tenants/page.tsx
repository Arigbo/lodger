
'use client';

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
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User, Property, LeaseAgreement } from '@/lib/definitions';
import { MoreHorizontal, Users, Mail, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { isPast, add } from 'date-fns';

type TenantWithDetails = {
  tenant: User;
  property: Property;
  lease?: LeaseAgreement;
  isRentDue: boolean;
};

// Helper function to split an array into chunks
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export default function TenantsPage() {
  const { user: landlord, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [tenants, setTenants] = useState<TenantWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!landlord || !firestore) return;

    const fetchTenants = async () => {
      setIsLoading(true);

      // 1. Get all properties for the landlord that have a tenant.
      const propertiesQuery = query(
        collection(firestore, 'properties'),
        where('landlordId', '==', landlord.uid),
        where('currentTenantId', '!=', null)
      );
      const propertiesSnapshot = await getDocs(propertiesQuery);
      const landlordProperties = propertiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Property);
      
      const tenantIds = [...new Set(landlordProperties.map(p => p.currentTenantId!).filter(Boolean))];

      if (tenantIds.length === 0) {
        setTenants([]);
        setIsLoading(false);
        return;
      }
      
      // 2. Batch fetch all necessary data.
      const usersMap = new Map<string, User>();
      const leasesMap = new Map<string, LeaseAgreement>();

      // Fetch users (tenants)
      const userChunks = chunkArray(tenantIds, 30);
      await Promise.all(userChunks.map(async chunk => {
        const usersQuery = query(collection(firestore, 'users'), where(documentId(), 'in', chunk));
        const usersSnapshot = await getDocs(usersQuery);
        usersSnapshot.forEach(doc => usersMap.set(doc.id, { id: doc.id, ...doc.data() } as User));
      }));

      // Fetch leases
      const leaseChunks = chunkArray(tenantIds, 30);
      await Promise.all(leaseChunks.map(async chunk => {
        const leasesQuery = query(collection(firestore, 'leaseAgreements'), where('tenantId', 'in', chunk), where('landlordId', '==', landlord.uid));
        const leasesSnapshot = await getDocs(leasesQuery);
        leasesSnapshot.forEach(doc => {
            const lease = { id: doc.id, ...doc.data() } as LeaseAgreement;
            leasesMap.set(lease.tenantId, lease);
        });
      }));

      // 3. Aggregate data. The primary source is the property list.
      const tenantData = landlordProperties.map(property => {
        const tenant = usersMap.get(property.currentTenantId!);
        const lease = leasesMap.get(property.currentTenantId!);
        
        if (!tenant) return null;

        // Simplified rent due logic
        let isRentDue = false;
        if (lease && lease.status === 'active') {
             // Basic logic: if lease is active, assume rent might be due.
             // A more complex logic would check transaction history, which is too slow here.
             // For this page, we'll just show the lease status.
        }
        
        return { tenant, property, lease, isRentDue };
      }).filter((item): item is TenantWithDetails => item !== null);

      setTenants(tenantData);
      setIsLoading(false);
    };

    fetchTenants();

  }, [landlord, firestore]);
  

  if (isLoading || isUserLoading) {
      return <div>Loading tenants...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold">My Tenants</h1>
          <p className="text-muted-foreground">
            Manage all tenants currently occupying your properties.
          </p>
        </div>
      </div>
      <Separator className="my-6" />
      <Card>
        <CardHeader>
          <CardTitle>Tenant List</CardTitle>
          <CardDescription>
            You have {tenants.length} current tenants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tenants.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Lease Status</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map(({ tenant, property, lease }) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                     <Link href={`/landlord/tenants/${tenant.id}`} className="hover:underline">
                        <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={tenant.profileImageUrl} />
                            <AvatarFallback>
                                <UserIcon className="h-4 w-4" />
                            </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{tenant.name}</span>
                        </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/landlord/properties/${property.id}`}
                      className="hover:underline"
                    >
                      {property.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {lease ? (
                        <Badge variant={lease.status === 'active' ? 'secondary' : 'default'}>{lease.status}</Badge>
                    ) : (
                        <Badge variant="outline">No Lease</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{tenant.email}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-haspopup="true"
                          size="icon"
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                            <Link href={`/landlord/tenants/${tenant.id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/landlord/messages?conversationId=${tenant.id}`} className="flex items-center">
                            <Mail className="mr-2 h-4 w-4" /> Message Tenant
                          </Link>
                        </DropdownMenuItem>
                        {lease && (
                            <DropdownMenuItem asChild>
                            <Link href={`/landlord/leases/${lease.id}`}>View Lease</Link>
                            </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          ) : (
             <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-background">
                <Users className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No Tenants Found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                When a student occupies one of your properties, they will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
