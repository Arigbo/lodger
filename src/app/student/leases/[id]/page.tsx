
'use client';

import { notFound, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Signature, CheckCircle2, FileClock, Hourglass, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import type { LeaseAgreement, Property, User } from '@/lib/definitions';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function ViewStudentLeasePage() {
    const params = useParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const { user: currentUser, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const leaseRef = useMemoFirebase(() => doc(firestore, 'leaseAgreements', id), [firestore, id]);
    const { data: lease, isLoading: isLeaseLoading } = useDoc<LeaseAgreement>(leaseRef);
    
    const landlordRef = useMemoFirebase(() => lease ? doc(firestore, 'users', lease.landlordId) : null, [firestore, lease]);
    const { data: landlord } = useDoc<User>(landlordRef);

    const tenantRef = useMemoFirebase(() => lease ? doc(firestore, 'users', lease.tenantId) : null, [firestore, lease]);
    const { data: tenant } = useDoc<User>(tenantRef);

    const propertyRef = useMemoFirebase(() => lease ? doc(firestore, 'properties', lease.propertyId) : null, [firestore, lease]);
    const { data: property } = useDoc<Property>(propertyRef);
    
    if (isUserLoading || isLeaseLoading) {
        return <div>Loading...</div>;
    }
    
    if (!lease || !currentUser || (currentUser.uid !== lease.tenantId)) {
        notFound();
    }
    
    const handleSignLease = async () => {
        try {
            await updateDoc(leaseRef, {
                tenantSigned: true,
                status: 'active'
            });
            toast({
                title: "Lease Signed!",
                description: "Your tenancy is now active."
            });
            // After signing, redirect the student to their new tenancy page
            router.push(`/student/properties/${lease.propertyId}`);
        } catch (error) {
            console.error("Error signing lease:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not sign the lease. Please try again."
            })
        }
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
        <div>
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
                        <Badge variant={getStatusVariant(lease.status)} className="text-base capitalize">{lease.status}</Badge>
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
                            <div className="prose prose-sm max-w-none whitespace-pre-wrap">{lease.leaseText}</div>
                    </ScrollArea>

                    {/* Signature Section */}
                    <div className="mt-6 rounded-lg border p-4">
                        <h3 className="font-semibold mb-4 text-center">Signatures</h3>
                        <div className="flex justify-around text-sm">
                            <div className="flex flex-col items-center gap-2">
                                <span className="font-semibold">Landlord</span>
                                {lease.landlordSigned ? (
                                    <span className="font-serif italic text-green-600 flex items-center gap-1"><Check className="h-4 w-4"/> Digitally Signed</span>
                                ) : (
                                        <span className="font-serif italic text-amber-600 flex items-center gap-1"><Hourglass className="h-4 w-4"/> Pending Signature</span>
                                )}
                                <span className="text-xs text-muted-foreground">{landlord?.name}</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <span className="font-semibold">Tenant</span>
                                {lease.tenantSigned ? (
                                    <span className="font-serif italic text-green-600 flex items-center gap-1"><Check className="h-4 w-4"/> Digitally Signed</span>
                                ) : (
                                        <span className="font-serif italic text-amber-600 flex items-center gap-1"><Hourglass className="h-4 w-4"/> Pending Signature</span>
                                )}
                                <span className="text-xs text-muted-foreground">{tenant?.name}</span>
                            </div>
                        </div>
                    </div>

                    {lease.status === 'pending' && (
                        <div className="mt-6 flex flex-col items-center gap-4 rounded-lg border border-primary/50 bg-primary/5 p-6">
                            <h3 className="font-bold">Action Required</h3>
                            <p className="text-center text-sm text-muted-foreground">Review the lease agreement above. By clicking "Sign Lease", you are digitally signing and agreeing to all terms and conditions.</p>
                            <Button onClick={handleSignLease}>
                                <Signature className="mr-2 h-4 w-4"/>
                                Sign Lease Agreement
                            </Button>
                        </div>
                    )}
                    
                </CardContent>
            </Card>
                <div className="mt-4 text-center">
                <Button variant="outline" asChild>
                    <Link href={"/student/leases"}>
                        Back to All Leases
                    </Link>
                </Button>
            </div>
        </div>
    );
}
