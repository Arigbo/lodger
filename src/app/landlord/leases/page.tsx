
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { LeaseAgreement, UserProfile as User, Property } from '@/types';
import { FileText, FileStack, ArrowRight, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatPrice } from '@/utils';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import Loading from '@/app/loading';

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
          userSnapshots.forEach((doc: any) => usersMap.set(doc.id, { id: doc.id, ...doc.data() } as User));
        }
      }

      if (propertyIds.length > 0) {
        const propertyChunks = chunkArray(propertyIds, 30);
        for (const chunk of propertyChunks) {
          const propertyPromises = query(collection(firestore, 'properties'), where(documentId(), 'in', chunk));
          const propertySnapshots = await getDocs(propertyPromises);
          propertySnapshots.forEach((doc: any) => propertiesMap.set(doc.id, { id: doc.id, ...doc.data() } as Property));
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
    <div className="max-w-7xl mx-auto space-y-12 pb-32 animate-in fade-in duration-1000">
      {/* Cinematic Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b-4 border-foreground/5">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white shadow-lg border-2 border-primary/10">
              <FileStack className="h-5 w-5 text-primary" />
            </div>
            <Badge variant="outline" className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2">
              Management Portal
            </Badge>
          </div>
          <h1 className="font-headline text-4xl md:text-5xl font-black tracking-tight text-foreground uppercase">
            LEGAL ARCHIVES
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            Maintain your portfolio&apos;s contractual integrity
          </p>
        </div>
        <div className="bg-primary/5 px-8 py-4 rounded-[2rem] border-2 border-primary/10">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Total Agreements</p>
          <p className="text-3xl font-black">{aggregatedLeases.length}</p>
        </div>
      </div>

      {aggregatedLeases.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {aggregatedLeases.map(({ lease, tenant, property }) => (
            <Card key={lease.id} className="group relative overflow-hidden rounded-[2.5rem] bg-white border-2 border-muted/10 shadow-xl shadow-black/[0.02] hover:shadow-2xl hover:border-primary/20 transition-all p-8 md:p-10 flex flex-col justify-between">
              {/* Decorative Accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[5rem] -mr-8 -mt-8 transition-all group-hover:scale-110" />

              <div className="relative z-10 space-y-8">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <Badge variant={getStatusVariant(lease.status)} className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {lease.status}
                    </Badge>
                    <h3 className="text-2xl font-black uppercase tracking-tight group-hover:text-primary transition-colors">
                      {property?.title || 'Unknown Asset'}
                    </h3>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-muted/20 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <FileText className="h-7 w-7 opacity-20 group-hover:opacity-100 group-hover:text-primary transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">TENANT</p>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 border-2 border-white shadow-sm">
                        <AvatarImage src={tenant?.profileImageUrl} />
                        <AvatarFallback className="text-[8px] font-black">{tenant?.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <p className="font-black text-xs truncate max-w-[120px]">{tenant?.name || 'Unknown'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">MONTHLY RATE</p>
                    <p className="font-black text-sm text-primary">{formatPrice(property?.price || 0, property?.currency)}</p>
                  </div>
                </div>

                <div className="pt-8 border-t-2 border-dotted border-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-muted-foreground/60">
                    <div className="flex flex-col">
                      <p className="text-[9px] font-black uppercase tracking-tighter">EFFECTIVE</p>
                      <p className="text-xs font-bold text-foreground">{format(new Date(lease.startDate), 'MMM dd, yyyy')}</p>
                    </div>
                    <ArrowRight className="h-3 w-3 opacity-20" />
                    <div className="flex flex-col">
                      <p className="text-[9px] font-black uppercase tracking-tighter">EXPIRES</p>
                      <p className="text-xs font-bold text-foreground">{format(new Date(lease.endDate), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>
                  <Link href={`/landlord/leases/${lease.id}`}>
                    <Button variant="ghost" className="h-12 rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 bg-muted/20 hover:bg-primary hover:text-white transition-all">
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
            <div className="relative h-24 w-24 rounded-[2.5rem] bg-white border-2 border-muted-foreground/10 shadow-2xl flex items-center justify-center">
              <FileStack className="h-10 w-10 text-muted-foreground opacity-20" />
            </div>
          </div>
          <div className="space-y-2 text-center">
            <h3 className="text-2xl font-black uppercase tracking-tight">Archives Vacant</h3>
            <p className="text-muted-foreground max-w-sm mx-auto opacity-60 leading-relaxed">
              When you formalize agreements with prospective tenants, their contractual records will be archived here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}


