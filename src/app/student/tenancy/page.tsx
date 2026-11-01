
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { LeaseAgreement, Property } from '@/types';
import { Building } from 'lucide-react';
import PropertyCard from '@/components/properties/property-card';
import React from 'react';
import Loading from '@/app/loading';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from "@/components/dashboard";
import { useAsyncResult } from "@/hooks/use-async-result";
import { fetchDocsByIds } from "@/lib/firestore-batch";



export default function TenancyDashboardPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

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


    if (isUserLoading || isLoading) {
        return <Loading />;
    }

    return (
        <div className="space-y-8">
            <PageHeader title="My tenancy" description="Your current home, rent schedule and lease details." />

            {properties && properties.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                    {properties.map((property, idx) => (
                        <Link
                            key={property.id}
                            href={`/student/tenancy/${property.id}`}
                            className="group block animate-in fade-in slide-in-from-bottom-6 duration-700 hover:-translate-y-2 transition-all"
                            style={{ animationDelay: `${idx * 100}ms` }}
                        >
                            <div className="relative">
                                <PropertyCard property={property} as="div" />
                                <div className="absolute top-4 right-4 z-10">
                                    <Badge className="bg-white/90 backdrop-blur-md text-primary font-semibold px-4 py-1.5 rounded-full shadow-sm border-none tracking-tight uppercase text-xs">
                                        Active Tenancy
                                    </Badge>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between px-2">
                                <span className="text-sm font-bold text-primary group-hover:underline underline-offset-4 decoration-2">Manage Tenancy →</span>
                                <span className="text-xs font-bold text-muted-foreground/60">{property.type} • {property.bedrooms} Bed</span>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <Card className="overflow-hidden border-none bg-card shadow-sm">
                    <CardContent className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="relative mb-10">
                            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150 animate-pulse" />
                            <div className="relative flex h-32 w-32 items-center justify-center rounded-3xl bg-muted/30 transition-transform hover:scale-110 hover:rotate-3">
                                <Building className="h-16 w-16 text-primary opacity-20" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight">No Active Tenancies</h2>
                        <p className="mx-auto mt-4 max-w-sm text-lg font-medium text-muted-foreground/80 leading-relaxed">
                            Once your rental application is approved and the lease is signed, your home details will appear here.
                        </p>
                        <Button size="lg" className="mt-10 rounded-2xl px-10 font-bold" asChild>
                            <Link href="/student/properties">Start Searching</Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}


