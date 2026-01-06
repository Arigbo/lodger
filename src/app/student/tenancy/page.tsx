
'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import type { LeaseAgreement, Property } from '@/types';
import { Building } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PropertyCard from '@/components/property-card';
import React from 'react';
import Loading from '@/app/loading';
import { Badge } from '@/components/ui/badge';

// Helper function to split an array into chunks
function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}


export default function TenancyDashboardPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [properties, setProperties] = React.useState<Property[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    const leasesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
            collection(firestore, 'leaseAgreements'),
            where('tenantId', '==', user.uid),
            where('status', 'in', ['active', 'pending', 'terminating'])
        );
    }, [user, firestore]);

    const { data: leases, isLoading: areLeasesLoading } = useCollection<LeaseAgreement>(leasesQuery);

    React.useEffect(() => {
        if (areLeasesLoading) return;
        if (!leases || !firestore) {
            setIsLoading(false);
            return;
        };

        const fetchProperties = async () => {
            if (leases.length === 0) {
                setProperties([]);
                setIsLoading(false);
                return;
            }

            const propertyIds = leases.map(lease => lease.propertyId);

            if (propertyIds.length === 0) {
                setProperties([]);
                setIsLoading(false);
                return;
            }

            const propertyChunks = chunkArray(propertyIds, 30);
            const fetchedProperties: Property[] = [];
            for (const chunk of propertyChunks) {
                const propertiesQuery = query(collection(firestore, 'properties'), where(documentId(), 'in', chunk));
                const propertySnapshots = await getDocs(propertiesQuery);
                propertySnapshots.forEach((doc: any) => {
                    fetchedProperties.push(doc.data() as Property);
                });
            }

            setProperties(fetchedProperties);
            setIsLoading(false);
        }
        fetchProperties();
    }, [leases, areLeasesLoading, firestore]);


    if (isUserLoading || isLoading) {
        return <Loading />;
    }

    return (
        <div className="space-y-12">
            {/* Header Section */}
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
                <div className="space-y-1">
                    <h1 className="font-headline text-4xl font-extrabold tracking-tight text-foreground">
                        My Tenancies <Building className="inline h-8 w-8 text-primary/40 ml-2" />
                    </h1>
                    <p className="text-lg font-medium text-muted-foreground/80">
                        Manage your active rental agreements and track your home details.
                    </p>
                </div>
            </div>

            {properties && properties.length > 0 ? (
                <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
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
                                    <Badge className="bg-white/90 backdrop-blur-md text-primary font-black px-4 py-1.5 rounded-full shadow-xl border-none tracking-tighter uppercase text-[10px]">
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
                <Card className="overflow-hidden border-none bg-white shadow-xl shadow-black/[0.02]">
                    <CardContent className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="relative mb-10">
                            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150 animate-pulse" />
                            <div className="relative flex h-32 w-32 items-center justify-center rounded-[2.5rem] bg-muted/30 transition-transform hover:scale-110 hover:rotate-3">
                                <Building className="h-16 w-16 text-primary opacity-20" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-black tracking-tight">No Active Tenancies</h2>
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


