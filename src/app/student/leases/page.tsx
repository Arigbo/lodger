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
  landlord: User | null;
  property: Property | null;
};



export default function StudentLeasesPage() {
  const { user: student, isUserLoading } = useUser();
  const firestore = useFirestore();

  const leasesQuery = useMemoFirebase(() => {
    if (!student) return null;
    return query(collection(firestore, 'leaseAgreements'), where('tenantId', '==', student.uid));
  }, [student, firestore]);

  const { data: studentLeases, isLoading: areLeasesLoading } = useCollection<LeaseAgreement>(leasesQuery);

  const { data: aggregatedLeases = [], isLoading: isAggregating } = useAsyncResult(
    studentLeases,
    async (items): Promise<AggregatedLease[]> => {
      const [people, properties] = await Promise.all([
        fetchDocsByIds<User>(firestore, 'users', items.map((x) => x.landlordId)),
        fetchDocsByIds<Property>(firestore, 'properties', items.map((x) => x.propertyId)),
      ]);
      return items
        .map((lease) => ({
          lease,
          landlord: people.get(lease.landlordId) ?? null,
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
            : 'Your signed tenancy agreements.'
        }
      />
      {aggregatedLeases.length ? (
        <LeaseList viewer="student" items={aggregatedLeases.map(({ lease, landlord, property }) => ({ lease, person: landlord, property }))} />
      ) : (
        <EmptyState
          icon={FileText}
          title="No lease agreements yet"
          description="When a landlord accepts your request, your lease will appear here to review and sign."
          action={
            <Button asChild className="rounded-xl">
              <Link href="/student/properties">Browse homes</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
