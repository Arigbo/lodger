
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
import type { UserProfile as User, Property } from '@/types';
import { MoreHorizontal, Users, Mail, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import Loading from '@/app/loading';

type TenantWithProperty = {
  tenant: User;
  property: Property;
};

// Helper function to split an array into chunks for 'in' queries.
function chunkArray<T>(array: T[], size: number): T[][] {
  if (array.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export default function TenantsPage() {
  const { user: landlord, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [tenantsWithProperties, setTenantsWithProperties] = useState<TenantWithProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!landlord || !firestore) return;

    const fetchTenants = async () => {
      setIsLoading(true);

      // 1. Get all properties for the current landlord.
      const propertiesQuery = query(
        collection(firestore, 'properties'),
        where('landlordId', '==', landlord.uid)
      );
      const propertiesSnapshot = await getDocs(propertiesQuery);
      const landlordProperties: Property[] = propertiesSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Property));

      // 2. Filter for occupied properties and get unique tenant IDs.
      const occupiedProperties = landlordProperties.filter(p => p.currentTenantId);
      const tenantIds = [...new Set(occupiedProperties.map(p => p.currentTenantId!))];

      if (tenantIds.length === 0) {
        setTenantsWithProperties([]);
        setIsLoading(false);
        return;
      }

      // 3. Fetch user data for all unique tenants.
      const usersMap = new Map<string, User>();
      const userChunks = chunkArray(tenantIds, 30);
      await Promise.all(userChunks.map(async chunk => {
        const usersQuery = query(collection(firestore, 'users'), where(documentId(), 'in', chunk));
        const usersSnapshot = await getDocs(usersQuery);
        usersSnapshot.forEach((doc: any) => usersMap.set(doc.id, { id: doc.id, ...doc.data() } as User));
      }));

      // 4. Combine the data.
      const combinedData = occupiedProperties.map(property => {
        const tenant = usersMap.get(property.currentTenantId!);
        if (!tenant) return null;
        return { tenant, property };
      }).filter((item): item is TenantWithProperty => item !== null);

      setTenantsWithProperties(combinedData);
      setIsLoading(false);
    };

    fetchTenants();

  }, [landlord, firestore]);


  if (isLoading || isUserLoading) {
    return <Loading />;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold">My Tenants</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage all tenants currently occupying your properties.
          </p>
        </div>
      </div>
      <Separator className="my-4 sm:my-6" />
      <Card>
        <CardHeader>
          <CardTitle>Tenant List</CardTitle>
          <CardDescription>
            You have {tenantsWithProperties.length} current tenants.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          {tenantsWithProperties.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <div className="inline-block min-w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Tenant</TableHead>
                      <TableHead className="hidden md:table-cell text-xs sm:text-sm whitespace-nowrap">Property</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Status</TableHead>
                      <TableHead className="hidden lg:table-cell text-xs sm:text-sm whitespace-nowrap">Email</TableHead>
                      <TableHead className="text-xs sm:text-sm"><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenantsWithProperties.map(({ tenant, property }) => (
                      <TableRow key={`${tenant.id}-${property.id}`}>
                        <TableCell className="text-xs sm:text-sm py-2 sm:py-4">
                          <Link href={`/landlord/tenants/${tenant.id}`} className="hover:underline">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                                <AvatarImage src={tenant.profileImageUrl} />
                                <AvatarFallback>
                                  <UserIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium line-clamp-1">{tenant.name}</span>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs sm:text-sm py-2 sm:py-4">
                          <Link
                            href={`/landlord/properties/${property.id}`}
                            className="hover:underline line-clamp-2"
                          >
                            {property.title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm py-2 sm:py-4">
                          <Badge variant={'secondary'} className="text-xs">{property.status}</Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs sm:text-sm py-2 sm:py-4 text-muted-foreground whitespace-nowrap">{tenant.email}</TableCell>
                        <TableCell className="text-xs sm:text-sm py-2 sm:py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                aria-haspopup="true"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
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
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
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


