
'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import { MoreHorizontal, PlusCircle, Building } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, getDoc } from 'firebase/firestore';
import type { Property, User } from '@/lib/definitions';
import { useEffect, useState } from 'react';
import Loading from '@/app/loading';

type PropertyWithTenant = Property & { tenantName?: string };

export default function LandlordPropertiesPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const propertiesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'properties'), where('landlordId', '==', user.uid));
  }, [user, firestore]);
  
  const { data: properties, isLoading } = useCollection<Property>(propertiesQuery);

  const [propertiesWithTenants, setPropertiesWithTenants] = useState<PropertyWithTenant[]>([]);

  useEffect(() => {
    if (!properties || !firestore) return;

    const fetchTenantNames = async () => {
      const enhancedProperties = await Promise.all(
        properties.map(async (property) => {
          if (property.currentTenantId) {
            const tenantRef = doc(firestore, 'users', property.currentTenantId);
            const tenantSnap = await getDoc(tenantRef);
            if (tenantSnap.exists()) {
              const tenantData = tenantSnap.data() as User;
              return { ...property, tenantName: tenantData.name };
            }
          }
          return property;
        })
      );
      setPropertiesWithTenants(enhancedProperties);
    };

    fetchTenantNames();
  }, [properties, firestore]);


  if (isLoading) {
    return <Loading />;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold">My Properties</h1>
          <p className="text-muted-foreground">
            View and manage all your listings.
          </p>
        </div>
        <Button asChild>
            <Link href="/landlord/properties/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Property
            </Link>
        </Button>
      </div>
      <Separator className="my-6" />
      <Card>
        <CardHeader>
          <CardTitle>Property List</CardTitle>
          <CardDescription>
            You have {properties?.length || 0} properties.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {propertiesWithTenants && propertiesWithTenants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {propertiesWithTenants.map((property) => {
                  const isOccupied = property.status === 'occupied';
                  return (
                  <TableRow key={property.id}>
                    <TableCell className="font-medium">
                      <Link href={`/landlord/properties/${property.id}`} className="hover:underline">
                          {property.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isOccupied ? 'secondary' : 'default'}>
                        {property.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatPrice(property.price)}/mo</TableCell>
                    <TableCell>{property.tenantName || 'N/A'}</TableCell>
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
                          <DropdownMenuItem asChild>
                              <Link href={`/landlord/properties/edit/${property.id}`}>Edit</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                              <Link href={`/landlord/properties/${property.id}`}>View Requests</Link>
                          </DropdownMenuItem>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                  <div className="relative w-full">
                                    <DropdownMenuItem 
                                        className="text-destructive" 
                                        disabled={isOccupied}
                                        onSelect={(e) => {
                                          if (isOccupied) e.preventDefault();
                                        }}
                                    >
                                      Delete
                                    </DropdownMenuItem>
                                  </div>
                              </TooltipTrigger>
                              {isOccupied && (
                                <TooltipContent>
                                  <p>Cannot delete a property with an active tenant.</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          ) : (
             <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-background">
                    <Building className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No Properties Found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    Get started by listing your first property.
                </p>
                <Button asChild className="mt-4">
                    <Link href="/landlord/properties/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        List a Property
                    </Link>
                </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
