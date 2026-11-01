'use client';

import * as React from 'react';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { collection, query, where } from 'firebase/firestore';
import { EmptyState, PageHeader, PageSkeleton } from '@/components/dashboard';
import { LeaseList } from '@/components/leases/lease-list';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useAsyncResult } from '@/hooks/use-async-result';
import { fetchDocsByIds } from '@/lib/firestore-batch';
import type { LeaseAgreement, Property, UserProfile as User } from '@/types';

type AggregatedLease = {
  lease: LeaseAgreement;
  tenant: User | null;
  property: Property | null;
};



export default function LandlordLeasesPage() {
  const { user: landlord, isUserLoading } = useUser();
  const firestore = useFirestore();

  const leasesQuery = useMemoFirebase(() => {
    if (!landlord) return null;
    return query(collection(firestore, 'leaseAgreements'), where('landlordId', '==', landlord.uid));
  }, [landlord, firestore]);

  const { data: landlordLeases, isLoading: areLeasesLoading } = useCollection<LeaseAgreement>(leasesQuery);

  const { data: aggregatedLeases = [], isLoading: isAggregating } = useAsyncResult(
    landlordLeases,
    async (leases): Promise<AggregatedLease[]> => {
      const [tenants, properties] = await Promise.all([
        fetchDocsByIds<User>(firestore, 'users', leases.map((l) => l.tenantId)),
        fetchDocsByIds<Property>(firestore, 'properties', leases.map((l) => l.propertyId)),
      ]);
      return leases
        .map((lease) => ({
          lease,
          tenant: tenants.get(lease.tenantId) ?? null,
          property: properties.get(lease.propertyId) ?? null,
        }))
        .sort((x, y) => new Date(y.lease.startDate).getTime() - new Date(x.lease.startDate).getTime());
    }, { keepPrevious: true });

  if (isUserLoading || areLeasesLoading || isAggregating) {
    return <PageSkeleton variant="list" />;
  }

  const needsAction = aggregatedLeases.filter(({ lease }) => lease.status === 'pending').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lease agreements"
        description={
          needsAction
            ? `${needsAction} lease${needsAction === 1 ? '' : 's'} still in progress.`
            : 'Agreements with your tenants.'
        }
      />
      {aggregatedLeases.length ? (
        <LeaseList viewer="landlord" items={aggregatedLeases.map(({ lease, tenant, property }) => ({ lease, person: tenant, property }))} />
      ) : (
        <EmptyState
          icon={FileText}
          title="No lease agreements yet"
          description="When you accept a rental request, the lease you send will appear here."
          action={
            <Button asChild className="rounded-xl">
              <Link href="/landlord/requests">View requests</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
