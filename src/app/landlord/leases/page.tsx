
'use client';

import * as React from 'react';


import {
  Card,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { LeaseAgreement, UserProfile as User, Property } from '@/types';
import { FileText, FileStack, ArrowRight, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import Loading from '@/app/loading';
import { PageHeader } from "@/components/dashboard";

type AggregatedLease = {
  lease: LeaseAgreement;
  tenant: User | null;
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


export default function LandlordLeasesPage() {
  const { user: landlord, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [aggregatedLeases, setAggregatedLeases] = React.useState<AggregatedLease[]>([]);
  const [isAggregating, setIsAggregating] = React.useState(true);

  const leasesQuery = useMemoFirebase(() => {
    if (!landlord) return null;
    return query(collection(firestore, 'leaseAgreements'), where('landlordId', '==', landlord.uid));
  }, [landlord, firestore]);

  const { data: landlordLeases, isLoading: areLeasesLoading } = useCollection<LeaseAgreement>(leasesQuery);

  React.useEffect(() => {
    if (areLeasesLoading) return;
    if (!landlordLeases || !firestore) {
      setAggregatedLeases([]);
      setIsAggregating(false);
      return;
    }

    const aggregateData = async () => {
      setIsAggregating(true);
      if (landlordLeases.length === 0) {
        setAggregatedLeases([]);
        setIsAggregating(false);
        return;
      }

      const tenantIds = [...new Set(landlordLeases.map(l => l.tenantId))].filter(Boolean);
      const propertyIds = [...new Set(landlordLeases.map(l => l.propertyId))].filter(Boolean);

      const usersMap = new Map<string, User>();
      const propertiesMap = new Map<string, Property>();

      if (tenantIds.length > 0) {
        const userChunks = chunkArray(tenantIds, 30);
        for (const chunk of userChunks) {
          const usersQuery = query(collection(firestore, 'users'), where(documentId(), 'in', chunk));
          const userSnapshots = await getDocs(usersQuery);
          userSnapshots.forEach((doc) => usersMap.set(doc.id, { id: doc.id, ...doc.data() } as User));
        }
      }

      if (propertyIds.length > 0) {
        const propertyChunks = chunkArray(propertyIds, 30);
        for (const chunk of propertyChunks) {
          const propertyPromises = query(collection(firestore, 'properties'), where(documentId(), 'in', chunk));
          const propertySnapshots = await getDocs(propertyPromises);
          propertySnapshots.forEach((doc) => propertiesMap.set(doc.id, { id: doc.id, ...doc.data() } as Property));
        }
      }

      const finalData = landlordLeases.map(lease => ({
        lease,
        tenant: usersMap.get(lease.tenantId) || null,
        property: propertiesMap.get(lease.propertyId) || null,
      }));

      setAggregatedLeases(finalData.sort((a, b) => new Date(b.lease.startDate).getTime() - new Date(a.lease.startDate).getTime()));
      setIsAggregating(false);
    };

    aggregateData();
  }, [landlordLeases, areLeasesLoading, firestore]);

  const getStatusVariant = (status: LeaseAgreement['status']) => {
    switch (status) {
      case 'active':
        return 'secondary';
      case 'expired':
        return 'outline';
      case 'pending':
        return 'default';
      default:
        return 'default';
    }
  };

  if (isUserLoading || areLeasesLoading || isAggregating) {
    return <Loading />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-8 animate-in fade-in duration-1000">
      <PageHeader
        title="Lease agreements"
        description={`${aggregatedLeases.length} agreement${aggregatedLeases.length === 1 ? "" : "s"} with your tenants.`}
      />

      {aggregatedLeases.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {aggregatedLeases.map(({ lease, tenant, property }) => (
            <Card key={lease.id} className="group relative overflow-hidden rounded-3xl bg-card border border-muted/10 shadow-sm hover:shadow-md hover:border-primary/20 transition-all p-8 md:p-8 flex flex-col justify-between">
              {/* Decorative Accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[5rem] -mr-8 -mt-8 transition-all group-hover:scale-110" />

              <div className="relative z-10 space-y-8">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <Badge variant={getStatusVariant(lease.status)} className="px-4 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                      {lease.status}
                    </Badge>
                    <h3 className="text-2xl font-bold tracking-tight group-hover:text-primary transition-colors">
                      {property?.title || 'Unknown property'}
                    </h3>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-muted/20 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <FileText className="h-7 w-7 opacity-20 group-hover:opacity-100 group-hover:text-primary transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground/40 uppercase tracking-wider mb-1">Tenant</p>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 border border-white shadow-sm">
                        <AvatarImage src={tenant?.profileImageUrl} />
                        <AvatarFallback className="text-xs font-semibold">{tenant?.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <p className="font-semibold text-xs truncate max-w-[120px]">{tenant?.name || 'Unknown'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground/40 uppercase tracking-wider mb-1">Monthly rate</p>
                    <p className="font-bold text-sm text-primary">{formatPrice(property?.price || 0, property?.currency)}</p>
                  </div>
                </div>

                <div className="pt-8 border-t-2 border-dotted border-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-muted-foreground/60">
                    <div className="flex flex-col">
                      <p className="text-xs font-semibold uppercase tracking-tight">Effective</p>
                      <p className="text-xs font-bold text-foreground">{format(new Date(lease.startDate), 'MMM dd, yyyy')}</p>
                    </div>
                    <ArrowRight className="h-3 w-3 opacity-20" />
                    <div className="flex flex-col">
                      <p className="text-xs font-semibold uppercase tracking-tight">Expires</p>
                      <p className="text-xs font-bold text-foreground">{format(new Date(lease.endDate), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>
                  <Link href={`/landlord/leases/${lease.id}`}>
                    <Button variant="ghost" className="h-12 rounded-xl font-semibold text-xs uppercase tracking-wider gap-2 bg-muted/20 hover:bg-primary hover:text-white transition-all">
                      Review File <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 space-y-8 animate-in zoom-in duration-700">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
            <div className="relative h-24 w-24 rounded-3xl bg-card border border-muted-foreground/10 shadow-sm flex items-center justify-center">
              <FileStack className="h-10 w-10 text-muted-foreground opacity-20" />
            </div>
          </div>
          <div className="space-y-2 text-center">
            <h3 className="text-2xl font-bold tracking-tight">No lease agreements yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto opacity-60 leading-relaxed">
              Leases you create for accepted requests will appear here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}


