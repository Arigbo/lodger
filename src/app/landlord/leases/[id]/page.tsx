
'use client';

import { notFound, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from "date-fns";
import { CheckCircle2, FileClock, Hourglass, Check, Signature } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import type { LeaseAgreement, UserProfile as User, Property } from '@/types';
import Loading from '@/app/loading';


export default function ViewLandlordLeasePage() {
    const params = useParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const { user: currentUser, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const leaseRef = useMemoFirebase(() => id ? doc(firestore, 'leaseAgreements', id) : null, [firestore, id]);
    const { data: lease, isLoading: isLeaseLoading } = useDoc<LeaseAgreement>(leaseRef);

    const landlordRef = useMemoFirebase(() => lease ? doc(firestore, 'users', lease.landlordId) : null, [firestore, lease]);
    const { data: landlord, isLoading: isLandlordLoading } = useDoc<User>(landlordRef);

    const tenantRef = useMemoFirebase(() => lease ? doc(firestore, 'users', lease.tenantId) : null, [firestore, lease]);
    const { data: tenant, isLoading: isTenantLoading } = useDoc<User>(tenantRef);

    const propertyRef = useMemoFirebase(() => lease ? doc(firestore, 'properties', lease.propertyId) : null, [firestore, lease]);
    const { data: property, isLoading: isPropertyLoading } = useDoc<Property>(propertyRef);

    // Unified loading state
    const isLoading = isUserLoading || isLeaseLoading;
    const isSupportingDataLoading = isLandlordLoading || isTenantLoading || isPropertyLoading;

    const handleSignLease = async () => {
        if (!leaseRef) return;
        try {
            const signedName = landlord?.legalName || landlord?.name || "Landlord";
            const signatureLine = `\n\nDigitally Signed by Landlord: ${signedName} on ${new Date().toLocaleString()}`;
            const updatedLeaseText = lease.leaseText + signatureLine;

            await updateDoc(leaseRef, {
                landlordSigned: true,
                leaseText: updatedLeaseText
            });

            toast({
                title: "Lease Signed Successfully!",
                description: "Your signature has been recorded."
            });
        } catch (error: unknown) {
            console.error("Error signing lease:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not sign the lease. Please try again."
            })
        }
    };

    console.log('Lease Detail Debug:', {
        id,
        isUserLoading,
        isLeaseLoading,
        currentUserUid: currentUser?.uid,
        leaseExists: !!lease,
        leaseLandlordId: lease?.landlordId,
        match: currentUser && lease ? currentUser.uid === lease.landlordId : 'N/A'
    });

    if (isLoading) {
        return <Loading />;
    }

    // After main lease and user are loaded, check if they exist or if match fails
    if (!lease || !currentUser || currentUser.uid !== lease.landlordId) {
        console.warn("Landlord Lease not found or access denied", {
            leaseId: id,
            leaseExists: !!lease,
            currentUserId: currentUser?.uid,
            leaseLandlordId: lease?.landlordId
        });

        return (
            <div className="container mx-auto max-w-2xl py-20 px-4 text-center">
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8">
                    <h1 className="text-2xl font-bold text-destructive mb-4">Unable to Load Lease</h1>
                    <p className="mb-6 text-muted-foreground">
                        We couldn't display this lease agreement. Here is the diagnostic info to help us fix it:
                    </p>
                    <div className="text-left bg-black/80 text-green-400 p-4 rounded-md font-mono text-xs overflow-auto mb-6">
                        <p>Lease ID in URL: {id}</p>
                        <p>Lease Document Found: {lease ? "YES" : "NO"}</p>
                        <p>User Logged In: {currentUser ? "YES" : "NO"}</p>
                        {currentUser && lease && (
                            <>
                                <p>Your User ID: {currentUser.uid}</p>
                                <p>Lease Landlord ID: {lease.landlordId || "MISSING"}</p>
                                <p>Match: {currentUser.uid === lease.landlordId ? "YES" : "FAIL"}</p>
                            </>
                        )}
                        {lease && !lease.landlordId && <p className="mt-2 text-red-500 font-bold">CRITICAL: This lease agreement document has no landlordId field!</p>}
                        {!lease && <p className="mt-2 text-amber-400">Note: If Found is NO, the ID might be wrong or the document was deleted. Database collection checked: 'leaseAgreements'</p>}
                        {lease && currentUser && lease.landlordId && currentUser.uid !== lease.landlordId && (
                            <p className="mt-2 text-amber-400">Note: Match is FAIL, which means you are logged in but don't own this lease.</p>
                        )}
                    </div>
                    <div className="flex justify-center gap-4">
                        <Button asChild variant="outline">
                            <Link href="/landlord/leases">Return to Leases</Link>
                        </Button>
                        <Button variant="ghost" onClick={() => window.location.reload()}>
                            Retry
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Wait for supporting data if we have the main lease
    if (isSupportingDataLoading) {
        return <Loading />;
    }

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
                Review the details of the lease for <Link href={`/landlord/properties/${property?.id}`} className="font-medium text-primary hover:underline">{property?.title}</Link>.
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
                    <Separator className="my-6" />
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
                                    <span className="font-serif italic text-green-600 flex items-center gap-1"><Check className="h-4 w-4" /> Digitally Signed</span>
                                ) : (
                                    <span className="font-serif italic text-amber-600 flex items-center gap-1"><Hourglass className="h-4 w-4" /> Pending Signature</span>
                                )}
                                <span className="text-xs text-muted-foreground">{landlord?.name}</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <span className="font-semibold">Tenant</span>
                                {lease.tenantSigned ? (
                                    <span className="font-serif italic text-green-600 flex items-center gap-1"><Check className="h-4 w-4" /> Digitally Signed</span>
                                ) : (
                                    <span className="font-serif italic text-amber-600 flex items-center gap-1"><Hourglass className="h-4 w-4" /> Pending Signature</span>
                                )}
                                <span className="text-xs text-muted-foreground">{tenant?.name}</span>
                            </div>
                        </div>
                    </div>

                    {lease.status === 'pending' && !lease.landlordSigned ? (
                        <div className="mt-6 flex flex-col items-center gap-4 rounded-lg border border-primary/50 bg-primary/5 p-6">
                            <h3 className="font-bold">Action Required: Sign Lease</h3>
                            <p className="text-center text-sm text-muted-foreground">Confirm that the lease terms reflect the latest property updates. By clicking "Sign Lease", you acknowledge the agreement.</p>
                            <Button onClick={handleSignLease}>
                                <Signature className="mr-2 h-4 w-4" />
                                Sign Lease Agreement
                            </Button>
                        </div>
                    ) : lease.status === 'pending' && (
                        <div className="mt-6 text-center text-sm text-muted-foreground italic rounded-lg border p-4">
                            This lease has been sent to {tenant?.name} for their signature and is awaiting action.
                        </div>
                    )}
                </CardContent>
            </Card>
            <div className="mt-4 text-center">
                <Button variant="outline" asChild>
                    <Link href="/landlord/leases">
                        Back to All Leases
                    </Link>
                </Button>
            </div>
        </div>
    );
}
