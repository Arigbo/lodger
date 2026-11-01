'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { collection, query, where } from 'firebase/firestore';
import { EmptyState, PageHeader, PageSkeleton } from '@/components/dashboard';
import PropertyCard from '@/components/properties/property-card';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useAsyncResult } from '@/hooks/use-async-result';
import { fetchDocsByIds } from '@/lib/firestore-batch';
import type { LeaseAgreement, Property } from '@/types';

export default function TenancyDashboardPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const leasesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
            collection(firestore, 'leaseAgreements'),
            where('tenantId', '==', user.uid),
            where('status', 'in', ['active', 'pending', 'terminating'])
        );
    }, [user, firestore]);

    const { data: leases, isLoading: areLeasesLoading } = useCollection<LeaseAgreement>(leasesQuery);

    const { data: properties = [], isLoading: arePropertiesLoading } = useAsyncResult(leases, async (items) => {
        const byId = await fetchDocsByIds<Property>(firestore, 'properties', items.map((lease) => lease.propertyId));
        return [...byId.values()];
    }, { keepPrevious: true });
    const isLoading = areLeasesLoading || arePropertiesLoading;


    // Most students have exactly one home: take them straight to it.
    const onlyPropertyId = !isLoading && properties.length === 1 ? properties[0].id : null;
    useEffect(() => {
        if (onlyPropertyId) router.replace(`/student/tenancy/${onlyPropertyId}`);
    }, [onlyPropertyId, router]);

    if (isUserLoading || isLoading || onlyPropertyId) {
        return <PageSkeleton variant={onlyPropertyId ? 'detail' : 'grid'} />;
    }

    return (
        <div className="space-y-6">
            <PageHeader title="My tenancy" description="Your homes, rent schedule and lease details." />

            {properties.length > 0 ? (
                <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {properties.map((property) => (
                        <li key={property.id}>
                            <Link href={`/student/tenancy/${property.id}`} className="block">
                                <PropertyCard property={property} as="div" />
                            </Link>
                        </li>
                    ))}
                </ul>
            ) : (
                <EmptyState
                    icon={Building2}
                    title="You don't have a tenancy yet"
                    description="Once a landlord accepts your request and you've signed the lease and paid, your home will appear here."
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
