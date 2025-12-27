'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
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
import { MoreHorizontal, Users, Mail, User as UserIcon, Building, ShieldCheck, MapPin, ExternalLink, Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
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
      const propertiesQuery = query(
        collection(firestore, 'properties'),
        where('landlordId', '==', landlord.uid)
      );
      const propertiesSnapshot = await getDocs(propertiesQuery);
      const landlordProperties: Property[] = propertiesSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Property));

      const occupiedProperties = landlordProperties.filter(p => p.currentTenantId);
      const tenantIds = [...new Set(occupiedProperties.map(p => p.currentTenantId!))];

      if (tenantIds.length === 0) {
        setTenantsWithProperties([]);
        setIsLoading(false);
        return;
      }

      const usersMap = new Map<string, User>();
      const userChunks = chunkArray(tenantIds, 30);
      await Promise.all(userChunks.map(async chunk => {
        const usersQuery = query(collection(firestore, 'users'), where(documentId(), 'in', chunk));
        const usersSnapshot = await getDocs(usersQuery);
        usersSnapshot.forEach((doc: any) => usersMap.set(doc.id, { id: doc.id, ...doc.data() } as User));
      }));

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
    <div className="space-y-16 pb-32 animate-in fade-in duration-1000">
      {/* Cinematic Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b-4 border-foreground/5">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">TENANT ARCHIVES</p>
          </div>
          <h1 className="font-headline text-5xl md:text-6xl font-black tracking-tight text-foreground uppercase">
            TENANT <span className="text-primary">PORTFOLIO</span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            &quot;Managing the community of tenants inhabiting your curated spaces.&quot;
          </p>
        </div>
        <div className="bg-primary/5 px-8 py-4 rounded-[2rem] border-2 border-primary/10">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Active Tenants</p>
          <p className="text-3xl font-black text-primary">{tenantsWithProperties.length}</p>
        </div>
      </div>

      {tenantsWithProperties.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {tenantsWithProperties.map(({ tenant, property }) => (
            <Card key={`${tenant.id}-${property.id}`} className="group relative overflow-hidden rounded-[3.5rem] bg-white border-2 border-muted/10 shadow-xl hover:shadow-3xl hover:border-primary/20 transition-all duration-500 p-8 md:p-10 flex flex-col justify-between min-h-[400px]">
              {/* Decorative Background Element */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-bl-[6rem] -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-700" />

              <div className="relative z-10 space-y-8">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <Avatar className="h-24 w-24 rounded-[2rem] ring-4 ring-primary/5 ring-offset-4 ring-offset-white shadow-xl">
                        <AvatarImage src={tenant.profileImageUrl} className="object-cover" />
                        <AvatarFallback className="bg-muted text-2xl font-black uppercase">
                          {tenant.name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl bg-white border-2 border-primary/10 flex items-center justify-center shadow-lg">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black uppercase tracking-tight group-hover:text-primary transition-colors">{tenant.name}</h3>
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground/60">
                        <Mail className="h-3 w-3" /> {tenant.email}
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-12 w-12 rounded-2xl bg-muted/20 hover:bg-primary hover:text-white transition-all">
                        <MoreHorizontal className="h-6 w-6" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-[1.5rem] p-2 border-2 border-foreground/5 shadow-2xl">
                      <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest px-4 py-2 border-b border-muted/30 mb-1">Tenant Actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild className="rounded-xl focus:bg-primary focus:text-white cursor-pointer py-3 px-4 font-black text-[10px] uppercase tracking-widest gap-2">
                        <Link href={`/landlord/tenants/${tenant.id}`}>
                          <UserIcon className="h-4 w-4" /> View Full Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="rounded-xl focus:bg-primary focus:text-white cursor-pointer py-3 px-4 font-black text-[10px] uppercase tracking-widest gap-2">
                        <Link href={`/landlord/messages?conversationId=${tenant.id}`}>
                          <Mail className="h-4 w-4" /> Initiate Correspondence
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Separator className="bg-muted/30" />

                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Assigned Asset</p>
                    <Link href={`/landlord/properties/${property.id}`} className="group/property flex flex-col gap-1">
                      <span className="text-xl font-black uppercase tracking-tight group-hover/property:text-primary transition-colors flex items-center gap-2">
                        <Building className="h-5 w-5 opacity-40" /> {property.title}
                      </span>
                      <span className="text-xs font-bold text-muted-foreground/60 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {property.location.address}, {property.location.city}
                      </span>
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Tenancy Status</p>
                      <Badge variant="outline" className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2 border-primary/20 text-primary">
                        {property.status}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Occupancy Date</p>
                      <p className="font-black text-sm uppercase tracking-tight">Active Protocol</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 pt-10 mt-auto">
                <Link href={`/landlord/tenants/${tenant.id}`}>
                  <Button className="w-full h-16 rounded-2xl bg-foreground text-white hover:bg-primary transition-all duration-500 font-black text-xs uppercase tracking-[0.2em] gap-3 shadow-xl">
                    ANALYZE TENANCY <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 space-y-10 animate-in zoom-in duration-700">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
            <div className="relative h-40 w-40 rounded-[3rem] bg-white border-4 border-muted/10 shadow-3xl flex items-center justify-center overflow-hidden">
              <Users className="h-16 w-16 text-muted-foreground/20" />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            </div>
          </div>
          <div className="space-y-4 text-center">
            <h3 className="text-3xl font-black uppercase tracking-tight">Portfolio Vacant</h3>
            <p className="text-xl text-muted-foreground font-medium max-w-sm mx-auto opacity-60 leading-relaxed">
              &quot;The tenant archives are currently dormant. Occupancy data will manifest as agreements are finalized.&quot;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}


