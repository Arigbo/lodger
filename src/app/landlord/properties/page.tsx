'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { MoreHorizontal, Plus, PlusCircle, Building, Search, Filter, ArrowUpDown, Trash2, Edit3, Eye, User as UserIcon, MapPin, DollarSign, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
import type { Property, UserProfile as User } from '@/types';
import Loading from '@/app/loading';
import { useToast } from '@/hooks/use-toast';
import { sendNotification } from '@/lib/notifications';
import { formatPrice, cn } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
} from '@/components/ui/alert-dialog';

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
      const requestsQuery = query(collection(firestore, 'rentalApplications'), where('propertyId', '==', propertyToDelete));
      const requestsSnap = await getDocs(requestsQuery);

      const notificationPromises = requestsSnap.docs.map(doc => {
        const request = doc.data() as any;
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
        title: "Asset Decommissioned",
        description: "The property has been successfully removed from your active portfolio.",
      });
      setPropertyToDelete(null);
    } catch (error) {
      console.error("Error deleting property:", error);
      toast({
        variant: "destructive",
        title: "Decommissioning Failed",
        description: "Critical error encountered while removing asset. Please retry protocol.",
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
    <div className="space-y-12 pb-32 animate-in fade-in duration-1000">
      {/* Elegant Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Inventory Management</span>
          </div>
          <h1 className="font-headline text-4xl md:text-6xl font-black tracking-tighter text-foreground uppercase leading-[0.9]">
            YOUR <br /> <span className="text-primary">PROPERTIES</span>
          </h1>
        </div>
        <div className="flex flex-wrap gap-4">
          <Button asChild size="lg" className="h-16 rounded-2xl px-12 font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all bg-primary">
            <Link href="/landlord/properties/new">
              <Plus className="mr-2 h-5 w-5" /> CREATE PROPERTY
            </Link>
          </Button>
        </div>
      </div>
      {/* Premium Filter Architecture */}
      <div className="flex flex-col md:flex-row gap-6 bg-white/50 backdrop-blur-xl p-8 rounded-[2.5rem] border-2 border-foreground/5 shadow-2xl sticky top-4 z-40">
        <div className="relative flex-1 group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40 transition-colors group-focus-within:text-primary" />
          <Input
            placeholder="Search assets by title, tenant, or location..."
            className="h-14 rounded-2xl pl-16 pr-6 bg-white border-2 border-transparent focus-visible:border-primary/20 focus-visible:ring-0 transition-all font-medium text-base shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-6 h-14 bg-white rounded-2xl border-2 border-transparent shadow-inner">
            <ArrowUpDown className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Sort:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="border-none bg-transparent h-10 w-[140px] focus:ring-0 font-black text-[10px] uppercase tracking-tighter p-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-2 font-black text-[10px] uppercase">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-10">
          {displayedProperties.map((property) => {
            const isOccupied = property.status === 'occupied';
            return (
              <div key={property.id} className="group relative">
                <div className="absolute inset-0 bg-muted/20 rounded-[3rem] rotate-1 transition-transform group-hover:rotate-0 -z-10" />
                <Card className="rounded-[3rem] border-2 border-foreground/5 shadow-xl hover:shadow-3xl transition-all duration-500 bg-white overflow-hidden flex flex-col h-full">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                    {property.images?.[0] ? (
                      <img src={property.images[0]} alt={property.title} className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                    ) : (
                      <div className="h-full w-full bg-muted flex items-center justify-center">
                        <Building className="h-16 w-16 text-muted-foreground/20" />
                      </div>
                    )}
                    <div className="absolute top-6 left-6 z-20">
                      <Badge variant={isOccupied ? 'secondary' : 'default'} className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-2xl backdrop-blur-md">
                        {property.status}
                      </Badge>
                    </div>
                    <div className="absolute top-6 right-6 z-20">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white hover:text-foreground shadow-2xl transition-all">
                            <MoreHorizontal className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl border-2 p-2 shadow-2xl">
                          <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                            <Link href={`/landlord/properties/${property.id}/edit`} className="flex items-center gap-3 py-3">
                              <Edit3 className="h-4 w-4" /> Edit Asset
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
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight truncate">{property.title}</h3>
                      <div className="flex items-center gap-2 text-white/60 text-[10px] font-bold mt-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{property.location.address}, {property.location.city}</span>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-8 space-y-8 flex-grow">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-muted/20 border-2 border-transparent hover:border-primary/10 transition-colors">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">MONTHLY RENT</p>
                        <p className="text-lg font-black text-primary">{formatPrice(property.price, property.currency)}/mo</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-muted/20 border-2 border-transparent hover:border-primary/10 transition-colors">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">TENANT</p>
                        <p className="text-sm font-black truncate">{property.tenantName || 'VACANT'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#050505] text-white">
                      <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <UserIcon className="h-5 w-5 text-white/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/40">TENANT STATUS</p>
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
            <div className="relative h-40 w-40 flex items-center justify-center rounded-[3.5rem] bg-white shadow-2xl border-2 border-muted/5">
              <Building className="h-20 w-20 text-muted-foreground/30 rotate-12" />
            </div>
          </div>
          <div className="space-y-4 max-w-sm mx-auto">
            <h3 className="text-4xl font-black uppercase tracking-tighter">NO ASSETS FOUND</h3>
            <p className="text-xl text-muted-foreground font-medium leading-relaxed">
              &quot;Your digital property portfolio is currently empty. Initiate your first asset protocol to begin.&quot;
            </p>
          </div>
          <Button asChild className="h-16 rounded-3xl px-12 bg-primary text-white hover:scale-105 transition-all font-black text-xs uppercase tracking-widest shadow-2xl">
            <Link href="/landlord/properties/new">LIST NEW PROPERTY</Link>
          </Button>
        </div>
      )}

      <AlertDialog open={!!propertyToDelete} onOpenChange={(open) => !open && setPropertyToDelete(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-4 p-10 max-w-lg shadow-3xl">
          <AlertDialogHeader className="space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-8 w-8" />
            </div>
            <AlertDialogTitle className="text-3xl font-black uppercase tracking-tight text-center">DECOMMISSION ASSET?</AlertDialogTitle>
            <AlertDialogDescription className="text-lg text-center font-medium">
              This action is permanent and will remove all telemetry data associated with this holding. All pending applicants will be notified of the withdrawal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-4 mt-10">
            <AlertDialogCancel className="h-14 rounded-2xl border-2 font-black text-xs uppercase tracking-widest flex-1">ABORT PROTOCOL</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProperty} className="h-14 rounded-2xl bg-destructive hover:bg-destructive/90 transition-all font-black text-xs uppercase tracking-widest flex-1">CONFIRM DELETE</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
