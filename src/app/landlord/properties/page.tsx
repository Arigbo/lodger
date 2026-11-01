'use client';

import Image from "next/image";
import { optimizedImageProps } from "@/config/images";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { MoreHorizontal, Plus, Building, Search, ArrowUpDown, Trash2, Edit3, Eye, User as UserIcon, MapPin, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
import type { Property, RentalApplication, UserProfile as User } from '@/types';
import Loading from '@/app/loading';
import { useToast } from '@/hooks/use-toast';
import { sendNotification } from '@/lib/notifications';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
} from '@/components/ui/alert-dialog';
import { PageHeader } from "@/components/dashboard";

type PropertyWithTenant = Property & { tenantName?: string };

export default function LandlordPropertiesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const propertiesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'properties'), where('landlordId', '==', user.uid));
  }, [user, firestore]);

  const { data: properties, isLoading } = useCollection<Property>(propertiesQuery);

  const [enhancedProperties, setEnhancedProperties] = useState<PropertyWithTenant[]>([]);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('title-asc');

  useEffect(() => {
    if (!properties || !firestore) return;

    const fetchTenantNames = async () => {
      const enhanced = await Promise.all(
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
      setEnhancedProperties(enhanced);
    };

    fetchTenantNames();
  }, [properties, firestore]);

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

  const displayedProperties = enhancedProperties.filter(property => {
    const queryStr = searchQuery.toLowerCase();
    return (
      property.title.toLowerCase().includes(queryStr) ||
      (property.tenantName && property.tenantName.toLowerCase().includes(queryStr)) ||
      (property.location.address && property.location.address.toLowerCase().includes(queryStr))
    );
  }).sort((a, b) => {
    switch (sortBy) {
      case 'title-asc': return a.title.localeCompare(b.title);
      case 'title-desc': return b.title.localeCompare(a.title);
      case 'price-asc': return a.price - b.price;
      case 'price-desc': return b.price - a.price;
      case 'status-asc': return a.status.localeCompare(b.status);
      case 'status-desc': return b.status.localeCompare(a.status);
      default: return 0;
    }
  });

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-1000">
      <PageHeader
        title="Properties"
        description="Manage your listings, availability and current tenants."
        actions={
          <Button asChild className="rounded-xl">
            <Link href="/landlord/properties/new">
              <Plus className="mr-2 h-4 w-4" /> Add property
            </Link>
          </Button>
        }
      />
      {/* Premium Filter Architecture */}
      <div className="flex flex-col md:flex-row gap-6 bg-white/50 backdrop-blur-xl p-8 rounded-3xl border border-foreground/5 shadow-sm sticky top-4 z-40">
        <div className="relative flex-1 group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40 transition-colors group-focus-within:text-primary" />
          <Input
            placeholder="Search by title, tenant or location…"
            className="h-14 rounded-2xl pl-16 pr-6 bg-card border border-transparent focus-visible:border-primary/20 focus-visible:ring-0 transition-all font-medium text-base shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-6 h-11 bg-card rounded-2xl border border-transparent shadow-inner">
            <ArrowUpDown className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider opacity-40">Sort:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="border-none bg-transparent h-10 w-[140px] focus:ring-0 font-semibold text-xs uppercase tracking-tight p-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border font-semibold text-xs uppercase">
                <SelectItem value="title-asc">Title: A-Z</SelectItem>
                <SelectItem value="title-desc">Title: Z-A</SelectItem>
                <SelectItem value="price-asc">Price: Lo-Hi</SelectItem>
                <SelectItem value="price-desc">Price: Hi-Lo</SelectItem>
                <SelectItem value="status-asc">Status: Available</SelectItem>
                <SelectItem value="status-desc">Status: Occupied</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Asset Grid */}
      {displayedProperties && displayedProperties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {displayedProperties.map((property) => {
            const isOccupied = property.status === 'occupied';
            return (
              <div key={property.id} className="group relative">
                <div className="absolute inset-0 bg-muted/20 rounded-3xl rotate-1 transition-transform group-hover:rotate-0 -z-10" />
                <Card className="rounded-3xl border border-foreground/5 shadow-sm hover:shadow-md transition-all duration-500 bg-card overflow-hidden flex flex-col h-full">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                    {property.images?.[0] ? (
                      <Image {...optimizedImageProps(property.images[0])} alt={property.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-1000 group-hover:scale-110" />
                    ) : (
                      <div className="h-full w-full bg-muted flex items-center justify-center">
                        <Building className="h-16 w-16 text-muted-foreground/20" />
                      </div>
                    )}
                    <div className="absolute top-6 left-6 z-20">
                      <Badge variant={isOccupied ? 'secondary' : 'default'} className="px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider shadow-sm backdrop-blur-md">
                        {property.status}
                      </Badge>
                    </div>
                    <div className="absolute top-6 right-6 z-20">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-card hover:text-foreground shadow-sm transition-all">
                            <MoreHorizontal className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl border p-2 shadow-sm">
                          <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                            <Link href={`/landlord/properties/${property.id}/edit`} className="flex items-center gap-3 py-3">
                              <Edit3 className="h-4 w-4" /> Edit property
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                            <Link href={`/landlord/properties/${property.id}`} className="flex items-center gap-3 py-3">
                              <Eye className="h-4 w-4" /> Management View
                            </Link>
                          </DropdownMenuItem>
                          <Separator className="my-2" />
                          <DropdownMenuItem
                            disabled={isOccupied}
                            onSelect={() => setPropertyToDelete(property.id)}
                            className="text-destructive rounded-xl hover:bg-destructive/5 cursor-pointer py-3"
                          >
                            <Trash2 className="h-4 w-4 mr-3" /> Decommission
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="absolute bottom-6 left-6 right-6 z-20">
                      <h3 className="text-2xl font-bold text-white tracking-tight truncate">{property.title}</h3>
                      <div className="flex items-center gap-2 text-white/60 text-xs font-bold mt-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{property.location.address}, {property.location.city}</span>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-8 space-y-8 flex-grow">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-muted/20 border border-transparent hover:border-primary/10 transition-colors">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">Monthly rent</p>
                        <p className="text-lg font-bold text-primary">{formatPrice(property.price, property.currency)}/mo</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-muted/20 border border-transparent hover:border-primary/10 transition-colors">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">Tenant</p>
                        <p className="text-sm font-bold truncate">{property.tenantName || 'VACANT'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#050505] text-white">
                      <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <UserIcon className="h-5 w-5 text-white/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Tenant status</p>
                        <p className="text-xs font-bold truncate">{property.tenantName ? `Active Lease: ${property.tenantName}` : 'Awaiting New Tenant'}</p>
                      </div>
                      <Link href={`/landlord/properties/${property.id}`}>
                        <Button size="icon" variant="ghost" className="rounded-xl hover:bg-white/10 text-white">
                          <ArrowRight className="h-5 w-5" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-32 flex flex-col items-center justify-center text-center space-y-10 animate-in zoom-in duration-700">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
            <div className="relative h-40 w-40 flex items-center justify-center rounded-3xl bg-card shadow-sm border border-muted/5">
              <Building className="h-20 w-20 text-muted-foreground/30 rotate-12" />
            </div>
          </div>
          <div className="space-y-4 max-w-sm mx-auto">
            <h3 className="text-4xl font-bold tracking-tight">No properties yet</h3>
            <p className="text-xl text-muted-foreground font-medium leading-relaxed">
              Add your first property to start receiving requests from students.
            </p>
          </div>
          <Button asChild className="h-11 rounded-3xl px-6 bg-primary text-white hover:scale-105 transition-all font-semibold text-xs uppercase tracking-wider shadow-sm">
            <Link href="/landlord/properties/new">Add a property</Link>
          </Button>
        </div>
      )}

      <AlertDialog open={!!propertyToDelete} onOpenChange={(open) => !open && setPropertyToDelete(null)}>
        <AlertDialogContent className="rounded-3xl border p-6 max-w-lg shadow-sm">
          <AlertDialogHeader className="space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-8 w-8" />
            </div>
            <AlertDialogTitle className="text-3xl font-bold tracking-tight text-center">Delete this property?</AlertDialogTitle>
            <AlertDialogDescription className="text-lg text-center font-medium">
              This permanently removes the listing. Students with pending requests will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-4 mt-10">
            <AlertDialogCancel className="h-14 rounded-2xl border font-semibold text-xs uppercase tracking-wider flex-1">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProperty} className="h-14 rounded-2xl bg-destructive hover:bg-destructive/90 transition-all font-semibold text-xs uppercase tracking-wider flex-1">Confirm delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
