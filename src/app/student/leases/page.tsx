
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
import { FileText, Signature } from 'lucide-react';
import Link from 'next/link';
import { cn } from "@/utils";
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import Loading from '@/app/loading';


type AggregatedLease = {
  lease: LeaseAgreement;
  landlord: User | null;
  property: Property | null;
};

// Helper function to split an array into chunks
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}


export default function StudentLeasesPage() {
  const { user: student, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [aggregatedLeases, setAggregatedLeases] = React.useState<AggregatedLease[]>([]);
  const [isAggregating, setIsAggregating] = React.useState(true);

  const leasesQuery = useMemoFirebase(() => {
    if (!student) return null;
    return query(collection(firestore, 'leaseAgreements'), where('tenantId', '==', student.uid));
  }, [student, firestore]);

  const { data: studentLeases, isLoading: areLeasesLoading } = useCollection<LeaseAgreement>(leasesQuery);

  React.useEffect(() => {
    if (areLeasesLoading) return;
    if (!studentLeases || !firestore) {
      setAggregatedLeases([]);
      setIsAggregating(false);
      return;
    };

    const aggregateData = async () => {
      setIsAggregating(true);
      if (studentLeases.length === 0) {
        setAggregatedLeases([]);
        setIsAggregating(false);
        return;
      }

      const landlordIds = [...new Set(studentLeases.map(l => l.landlordId))].filter(Boolean);
      const propertyIds = [...new Set(studentLeases.map(l => l.propertyId))].filter(Boolean);

      const usersMap = new Map<string, User>();
      const propertiesMap = new Map<string, Property>();

      if (landlordIds.length > 0) {
        const userChunks = chunkArray(landlordIds, 30);
        for (const chunk of userChunks) {
          const usersQuery = query(collection(firestore, 'users'), where(documentId(), 'in', chunk));
          const usersSnapshot = await getDocs(usersQuery);
          usersSnapshot.forEach((doc: any) => usersMap.set(doc.id, { id: doc.id, ...doc.data() } as User));
        }
      }

      if (propertyIds.length > 0) {
        const propertyChunks = chunkArray(propertyIds, 30);
        for (const chunk of propertyChunks) {
          const propertiesQuery = query(collection(firestore, 'properties'), where(documentId(), 'in', chunk));
          const propertiesSnapshot = await getDocs(propertiesQuery);
          propertiesSnapshot.forEach((doc: any) => propertiesMap.set(doc.id, { id: doc.id, ...doc.data() } as Property));
        }
      }

      const finalData = studentLeases.map(lease => ({
        lease,
        landlord: usersMap.get(lease.landlordId) || null,
        property: propertiesMap.get(lease.propertyId) || null,
      }));

      setAggregatedLeases(finalData.sort((a, b) => new Date(b.lease.startDate).getTime() - new Date(a.lease.startDate).getTime()));
      setIsAggregating(false);
    };

    aggregateData();
  }, [studentLeases, areLeasesLoading, firestore]);


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
    <div className="space-y-12 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="font-headline text-4xl md:text-5xl font-black tracking-tight text-foreground underline decoration-primary/20 underline-offset-8">
            LEASES
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            View and manage your lease agreements.
          </p>
        </div>
        <div className="px-6 py-3 bg-primary/5 rounded-2xl border-2 border-primary/10 flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <span className="font-black text-sm uppercase tracking-widest">{aggregatedLeases.length} AGREEMENTS</span>
        </div>
      </div>

      {aggregatedLeases.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {aggregatedLeases.map(({ lease, landlord, property }) => (
            <div key={lease.id} className="group relative overflow-hidden rounded-[2.5rem] bg-white border-2 border-muted/10 shadow-xl shadow-black/[0.02] hover:shadow-2xl hover:border-primary/20 transition-all p-8 md:p-10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[5rem] -mr-8 -mt-8 transition-all group-hover:scale-110" />

              <div className="relative z-10 space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div className="space-y-1">
                    <Badge variant={getStatusVariant(lease.status)} className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3">
                      {lease.status}
                    </Badge>
                    <h3 className="text-2xl font-black tracking-tight group-hover:text-primary transition-colors">
                      {property?.title || 'Unknown Property'}
                    </h3>
                    <p className="text-muted-foreground font-medium text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4 opacity-40" />
                      ID: {lease.id.slice(0, 8).toUpperCase()}...
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-1">LANDLORD</p>
                    <p className="font-bold text-lg">{landlord?.name || 'Anonymous'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 p-6 rounded-3xl bg-muted/20 border-2 border-white">
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">TERM START</p>
                    <p className="font-black text-lg">{new Date(lease.startDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">TERM END</p>
                    <p className="font-black text-lg">{new Date(lease.endDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-6 pt-4">
                  <div className="flex items-center gap-4">
                    <div className={cn("h-3 w-3 rounded-full animate-pulse", lease.status === 'active' ? "bg-green-500" : "bg-muted/40")} />
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">
                      {lease.status === 'active' ? 'ACTIVE LEASE' : 'EXPIRED LEASE'}
                    </span>
                  </div>

                  <Link href={`/student/leases/${lease.id}`} className="w-full sm:w-auto">
                    <Button variant={lease.status === 'pending' ? "default" : "outline"} className="w-full h-14 rounded-2xl px-10 font-black text-sm uppercase tracking-widest gap-3 shadow-lg shadow-primary/5 hover:scale-105 active:scale-95 transition-all">
                      {lease.status === 'pending' ? (
                        <>
                          <Signature className="h-4 w-4" /> REVIEW & SIGN
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4" /> VIEW DOCUMENTS
                        </>
                      )}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-[3rem] border-4 border-dotted border-muted/30 p-24 text-center space-y-8 animate-in zoom-in duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
            <div className="relative h-28 w-28 flex items-center justify-center rounded-[2.5rem] bg-white shadow-2xl border-2 border-muted/10">
              <FileText className="h-12 w-12 text-muted-foreground/40" />
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-3xl font-black">No Leases Found</h3>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              You don&apos;t have any lease agreements yet.
            </p>
          </div>
          <Link href="/student/properties">
            <Button className="h-16 rounded-2xl px-12 font-black text-sm shadow-2xl hover:scale-105 transition-all">
              EXPLORE PROPERTIES
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}


