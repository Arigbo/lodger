"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bath, BedDouble, Building2, ExternalLink, MoreHorizontal, Pencil, Plus, Search, Trash2, User as UserIcon } from 'lucide-react';
import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { EmptyState, PageHeader, PageSkeleton, StatusBadge } from '@/components/dashboard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { optimizedImageProps } from '@/config/images';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useAsyncResult } from '@/hooks/use-async-result';
import { useToast } from '@/hooks/use-toast';
import { fetchDocsByIds } from '@/lib/firestore-batch';
import { sendNotification } from '@/lib/notifications';
import { formatPrice } from '@/lib/utils';
import type { Property, RentalApplication, UserProfile as User } from '@/types';

type StatusFilter = 'all' | 'available' | 'occupied';

export default function LandlordPropertiesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const propertiesQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'properties'), where('landlordId', '==', user.uid)) : null),
    [user, firestore],
  );
  const { data: properties, isLoading } = useCollection<Property>(propertiesQuery);
  const { data: tenants } = useAsyncResult(
    properties,
    (items) => fetchDocsByIds<User>(firestore, 'users', items.map((p) => p.currentTenantId)),
    { keepPrevious: true },
  );

  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('title-asc');
  const [status, setStatus] = useState<StatusFilter>('all');

  const handleDeleteProperty = async () => {
    if (!propertyToDelete || !firestore) return;

    try {
      const propertyTitle = properties?.find(p => p.id === propertyToDelete)?.title || 'Property';
      const requestsQuery = query(
        collection(firestore, 'rentalApplications'),
        where('propertyId', '==', propertyToDelete),
        where('landlordId', '==', user!.uid),
      );
      const requestsSnap = await getDocs(requestsQuery);

      const notificationPromises = requestsSnap.docs.map(doc => {
        const request = doc.data() as RentalApplication;
        return sendNotification({
          toUserId: request.tenantId,
          type: 'NEW_MESSAGE',
          firestore,
          propertyName: propertyTitle,
          link: '/student/requests',
          senderName: 'System',
          customMessage: `The property "${propertyTitle}" you requested has been removed by the landlord. Please delete your request.`
        });
      });

      await Promise.all(notificationPromises);
      await deleteDoc(doc(firestore, 'properties', propertyToDelete));

      toast({
        title: "Property deleted",
        description: "The property has been removed from your listings.",
      });
      setPropertyToDelete(null);
    } catch (error) {
      console.error("Error deleting property:", error);
      toast({
        variant: "destructive",
        title: "Could not delete property",
        description: "Something went wrong while deleting the property. Please try again.",
      });
    }
  };

  if (isLoading) return <PageSkeleton variant="grid" />;

  const all = properties ?? [];
  const counts = {
    all: all.length,
    available: all.filter((p) => p.status === 'available').length,
    occupied: all.filter((p) => p.status === 'occupied').length,
  };
  const term = searchQuery.trim().toLowerCase();
  const displayed = all
    .filter((p) => status === 'all' || p.status === status)
    .filter((p) => {
      if (!term) return true;
      const tenantName = p.currentTenantId ? tenants?.get(p.currentTenantId)?.name ?? '' : '';
      return [p.title, p.location?.address, p.location?.city, tenantName].some((v) => v?.toLowerCase().includes(term));
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title-desc': return b.title.localeCompare(a.title);
        case 'price-asc': return a.price - b.price;
        case 'price-desc': return b.price - a.price;
        default: return a.title.localeCompare(b.title);
      }
    });
  const deleting = all.find((p) => p.id === propertyToDelete);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        description="Your listings, their availability and who lives there."
        actions={
          <Button asChild className="rounded-xl sm:hidden">
            <Link href="/landlord/properties/new">
              <Plus className="mr-1.5 h-4 w-4" /> Add property
            </Link>
          </Button>
        }
      />

      {all.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="List your first property"
          description="It takes about five minutes. Add photos, set the rent and choose your lease template — students can request it straight away."
          action={
            <Button asChild className="rounded-xl">
              <Link href="/landlord/properties/new">
                <Plus className="mr-1.5 h-4 w-4" /> Add property
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
              <TabsList className="h-auto rounded-xl p-1">
                {(['all', 'available', 'occupied'] as const).map((key) => (
                  <TabsTrigger key={key} value={key} className="gap-2 rounded-lg px-3 py-1.5 capitalize">
                    {key} <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{counts[key]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="flex gap-2">
              <div className="relative flex-1 lg:w-72">
                <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title, address or tenant"
                  aria-label="Search properties"
                  className="h-10 rounded-xl pl-9"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 w-40 rounded-xl" aria-label="Sort properties">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title-asc">Name A–Z</SelectItem>
                  <SelectItem value="title-desc">Name Z–A</SelectItem>
                  <SelectItem value="price-asc">Rent: low to high</SelectItem>
                  <SelectItem value="price-desc">Rent: high to low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {displayed.length === 0 ? (
            <EmptyState icon={Search} title="No matching properties" description="Try a different search or filter." />
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {displayed.map((property) => {
                const tenant = property.currentTenantId ? tenants?.get(property.currentTenantId) : undefined;
                const image = property.images?.[0];
                return (
                  <li key={property.id} className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md">
                    <Link href={`/landlord/properties/${property.id}`} className="relative aspect-[16/10] bg-muted">
                      {image ? (
                        <Image
                          {...optimizedImageProps(image)}
                          alt={property.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <Building2 aria-hidden className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                      )}
                      <StatusBadge status={property.status} className="absolute left-3 top-3 bg-background/90 backdrop-blur" />
                    </Link>
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link href={`/landlord/properties/${property.id}`} className="line-clamp-1 font-semibold hover:underline">
                            {property.title}
                          </Link>
                          <p className="line-clamp-1 text-sm text-muted-foreground">
                            {[property.location?.address, property.location?.city].filter(Boolean).join(', ')}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-lg" aria-label={`Actions for ${property.title}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl">
                            <DropdownMenuItem asChild>
                              <Link href={`/landlord/properties/${property.id}/edit`}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit listing
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/properties/${property.id}`} target="_blank">
                                <ExternalLink className="mr-2 h-4 w-4" /> View public page
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                              onSelect={() => setPropertyToDelete(property.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><BedDouble aria-hidden className="h-4 w-4" /> {property.bedrooms}</span>
                        <span className="flex items-center gap-1"><Bath aria-hidden className="h-4 w-4" /> {property.bathrooms}</span>
                        <span className="ml-auto font-semibold text-foreground">
                          {formatPrice(property.price, property.currency)}
                          <span className="font-normal text-muted-foreground">/mo</span>
                        </span>
                      </div>

                      <div className="mt-auto flex items-center gap-2 border-t pt-3 text-sm">
                        <UserIcon aria-hidden className="h-4 w-4 text-muted-foreground" />
                        {tenant ? (
                          <Link href={`/landlord/tenants/${tenant.id}`} className="truncate font-medium hover:underline">
                            {tenant.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">No tenant · accepting requests</span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <AlertDialog open={!!propertyToDelete} onOpenChange={(open) => !open && setPropertyToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{deleting?.status === 'occupied' ? "This property has a tenant" : 'Delete this property?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.status === 'occupied'
                ? 'End the current tenancy from the tenant page before deleting this listing.'
                : 'This permanently removes the listing. Students with pending requests will be notified.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">{deleting?.status === 'occupied' ? 'Close' : 'Cancel'}</AlertDialogCancel>
            {deleting?.status !== 'occupied' && (
              <AlertDialogAction onClick={handleDeleteProperty} className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete property
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
