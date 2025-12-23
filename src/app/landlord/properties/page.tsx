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
import { formatPrice } from '@/utils';
import { MoreHorizontal, PlusCircle, Building, Search } from 'lucide-react';
import Link from 'next/link';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, getDoc, deleteDoc } from 'firebase/firestore';
import type { Property, UserProfile as User } from '@/types';
import { useEffect, useState } from 'react';
import Loading from '@/app/loading';
import { useToast } from '@/hooks/use-toast';
import { sendNotification } from '@/lib/notifications';
import { getDocs } from 'firebase/firestore';

type PropertyWithTenant = Property & { tenantName?: string };

export default function LandlordPropertiesPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const propertiesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'properties'), where('landlordId', '==', user.uid));
  }, [user, firestore]);

  const { data: properties, isLoading } = useCollection<Property>(propertiesQuery);
  const { toast } = useToast();

  const [propertiesWithTenants, setPropertiesWithTenants] = useState<PropertyWithTenant[]>([]);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('title-asc');

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

  const handleDeleteProperty = async () => {
    if (!propertyToDelete || !firestore) return;

    try {
      // 1. Notify all applicants
      const propertyTitle = properties?.find(p => p.id === propertyToDelete)?.title || 'Property';

      const requestsQuery = query(
        collection(firestore, 'rentalApplications'),
        where('propertyId', '==', propertyToDelete)
      );
      const requestsSnap = await getDocs(requestsQuery);

      const notificationPromises = requestsSnap.docs.map(doc => {
        const request = doc.data() as any; // Type assertion if needed, or use RentalApplication
        return sendNotification({
          toUserId: request.tenantId,
          type: 'NEW_MESSAGE', // Fallback to NEW_MESSAGE as it supports customMessage and link
          firestore,
          propertyName: propertyTitle,
          link: '/student/requests',
          senderName: 'System', // Sender name for context
          customMessage: `The property "${propertyTitle}" you requested has been removed by the landlord. Please delete your request.`
        });
      });

      await Promise.all(notificationPromises);

      // 2. Delete the property
      await deleteDoc(doc(firestore, 'properties', propertyToDelete));

      toast({
        title: "Property Deleted",
        description: "The property has been successfully removed and applicants notified.",
      });
      setPropertyToDelete(null);
    } catch (error) {
      console.error("Error deleting property:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete property. Please try again.",
      });
    }
  };

  const displayedProperties = propertiesWithTenants.filter(property => {
    const query = searchQuery.toLowerCase();
    return (
      property.title.toLowerCase().includes(query) ||
      (property.tenantName && property.tenantName.toLowerCase().includes(query))
    );
  }).sort((a, b) => {
    switch (sortBy) {
      case 'title-asc':
        return a.title.localeCompare(b.title);
      case 'title-desc':
        return b.title.localeCompare(a.title);
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'status-asc':
        return a.status.localeCompare(b.status);
      case 'status-desc':
        return b.status.localeCompare(a.status);
      default:
        return 0;
    }
  });

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold">My Properties</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            View and manage all your listings.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/landlord/properties/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Property
          </Link>
        </Button>
      </div>
      <Separator className="my-4 sm:my-6" />

      <div className="flex flex-col gap-3 sm:gap-4 mb-6">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search properties or tenants..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full">
          <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline-block">Sort by:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title-asc">Title: A-Z</SelectItem>
              <SelectItem value="title-desc">Title: Z-A</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
              <SelectItem value="status-asc">Status: Available First</SelectItem>
              <SelectItem value="status-desc">Status: Occupied First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Property List</CardTitle>
          <CardDescription>
            You have {properties?.length || 0} properties.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {displayedProperties && displayedProperties.length > 0 ? (
            <div className="overflow-x-auto">
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
                  {displayedProperties.map((property) => {
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
                        <TableCell>{formatPrice(property.price, property.currency)}/mo</TableCell>
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
                                          if (isOccupied) {
                                            e.preventDefault();
                                          } else {
                                            setPropertyToDelete(property.id);
                                          }
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
                    )
                  })}
                </TableBody>
              </Table>
            </div>
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

      <AlertDialog open={!!propertyToDelete} onOpenChange={(open) => !open && setPropertyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the property
              and remove its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProperty} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
