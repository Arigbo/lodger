
'use client';

import { notFound, useParams } from 'next/navigation';
import { getLeaseAgreementById, getUserById, getPropertyById, signAndActivateLease } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Signature, CheckCircle2, FileClock, Hourglass } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Mock current user
const useUser = () => {
    // Switch between user-1 (landlord) and user-5 (student with pending lease) to test
    const user = getUserById('user-5');
    return { user };
};

export default function ViewLeasePage() {
    const params = useParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const { user: currentUser } = useUser();
    const router = useRouter();

    const lease = getLeaseAgreementById(id);

    if (!lease || !currentUser || (currentUser.id !== lease.landlordId && currentUser.id !== lease.tenantId)) {
        notFound();
    }
    
    const landlord = getUserById(lease.landlordId);
    const tenant = getUserById(lease.tenantId);
    const property = getPropertyById(lease.propertyId);
    
    const isCurrentUserLandlord = currentUser.id === lease.landlordId;
    const isCurrentUserTenant = currentUser.id === lease.tenantId;

    const handleSignLease = () => {
        signAndActivateLease(lease.id, currentUser.id);
        router.push(`/student/properties/${lease.propertyId}`);
    };

    const getStatusVariant = (status: 'active' | 'expired' | 'pending') => {
        switch (status) {
            case 'active': return 'secondary';
            case 'expired': return 'outline';
            case 'pending': return 'default';
        }
    };
     const getStatusIcon = (status: 'active' | 'expired' | 'pending') => {
        switch (status) {
            case 'active': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
            case 'expired': return <FileClock className="h-5 w-5 text-muted-foreground" />;
            case 'pending': return <Hourglass className="h-5 w-5 text-primary" />;
        }
    };

    return (
        <main className="flex min-h-screen flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
            <div className="mx-auto grid w-full max-w-4xl gap-2">
                <div className="flex items-center gap-4">
                    {getStatusIcon(lease.status)}
                    <h1 className="font-headline text-3xl font-bold">Lease Agreement</h1>
                </div>
                 <p className="text-muted-foreground">
                    Review the details of the lease for <Link href={`/student/properties/${property?.id}`} className="font-medium text-primary hover:underline">{property?.title}</Link>.
                </p>
                <Separator className="my-4" />
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>{property?.title}</CardTitle>
                                <CardDescription>{property?.location.address}, {property?.location.city}, {property?.location.state}</CardDescription>
                            </div>
                            <Badge variant={getStatusVariant(lease.status)} className="text-base">{lease.status}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                            <div>
                                <h3 className="font-semibold text-muted-foreground">Landlord</h3>
                                <p>{landlord?.name}</p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-muted-foreground">Tenant</h3>
                                <p>{tenant?.name}</p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-muted-foreground">Term</h3>
                                <p>{format(new Date(lease.startDate), 'MMM dd, yyyy')} - {format(new Date(lease.endDate), 'MMM dd, yyyy')}</p>
                            </div>
                        </div>
                        <Separator className="my-6"/>
                        <h3 className="font-semibold mb-2">Lease Document</h3>
                        <ScrollArea className="h-96 rounded-md border bg-secondary/30 p-4">
                             <div className="prose prose-sm whitespace-pre-wrap">{lease.leaseText}</div>
                        </ScrollArea>

                        {/* Signature Section */}
                        {lease.status === 'pending' && isCurrentUserTenant && (
                            <div className="mt-6 flex flex-col items-center gap-4 rounded-lg border border-primary/50 bg-primary/5 p-6">
                                <h3 className="font-bold">Action Required</h3>
                                <p className="text-center text-sm text-muted-foreground">Review the lease agreement above. By clicking "Sign Lease", you are digitally signing and agreeing to all terms and conditions.</p>
                                <Button onClick={handleSignLease}>
                                    <Signature className="mr-2 h-4 w-4"/>
                                    Sign Lease Agreement
                                </Button>
                            </div>
                        )}

                        {lease.status === 'pending' && isCurrentUserLandlord && (
                            <div className="mt-6 text-center text-sm text-muted-foreground italic rounded-lg border p-4">
                                This lease has been sent to {tenant?.name} for their signature.
                            </div>
                        )}
                    </CardContent>
                </Card>
                 <div className="mt-4 text-center">
                    <Button variant="outline" asChild>
                        <Link href={isCurrentUserLandlord ? "/landlord/leases" : "/student/leases"}>
                            Back to All Leases
                        </Link>
                    </Button>
                </div>
            </div>
        </main>
    );
}

