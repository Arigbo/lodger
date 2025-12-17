
'use client';
import React from 'react';
import { notFound, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Signature, CheckCircle2, FileClock, Hourglass, Check, DollarSign, Download, Printer, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import StripeCheckoutForm from "@/components/stripe-checkout-form";

// Make sure to add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your .env.local
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
import type { LeaseAgreement, Property, UserProfile as User } from '@/types';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Loading from '@/app/loading';
import { sendNotification } from '@/lib/notifications';
import { formatPrice } from '@/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function ViewStudentLeasePage() {
    const params = useParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const { user: currentUser, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const leaseRef = useMemoFirebase(() => id ? doc(firestore, 'leaseAgreements', id) : null, [firestore, id]);
    const { data: lease, isLoading: isLeaseLoading } = useDoc<LeaseAgreement>(leaseRef);

    const landlordRef = useMemoFirebase(() => lease ? doc(firestore, 'users', lease.landlordId) : null, [firestore, lease]);
    const { data: landlord, isLoading: isLandlordLoading } = useDoc<User>(landlordRef);

    const tenantRef = useMemoFirebase(() => lease ? doc(firestore, 'users', lease.tenantId) : null, [firestore, lease]);
    const { data: tenant, isLoading: isTenantLoading } = useDoc<User>(tenantRef);

    const propertyRef = useMemoFirebase(() => lease ? doc(firestore, 'properties', lease.propertyId) : null, [firestore, lease]);
    const { data: property, isLoading: isPropertyLoading } = useDoc<Property>(propertyRef);

    const isLoading = isUserLoading || isLeaseLoading || isLandlordLoading || isTenantLoading || isPropertyLoading;

    React.useEffect(() => {
        console.log('Lease Page Debug:', {
            id,
            leaseExists: !!lease,
            currentUserUid: currentUser?.uid,
            leaseTenantId: lease?.tenantId,
            match: currentUser?.uid === lease?.tenantId
        });
    }, [id, lease, currentUser]);

    if (isLoading) {
        return <Loading />;
    }

    if (!lease || !currentUser || (currentUser.uid !== lease.tenantId)) {
        console.warn("Lease not found or access denied", {
            leaseId: id,
            leaseExists: !!lease,
            currentUserId: currentUser?.uid,
            leaseTenantId: lease?.tenantId
        });

        // Debug UI to help user identify the issue
        return (
            <div className="container mx-auto max-w-2xl py-20 px-4 text-center">
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8">
                    <h1 className="text-2xl font-bold text-destructive mb-4">Unable to Load Lease</h1>
                    <p className="mb-6 text-muted-foreground">
                        We couldn't display this lease. Here is the diagnostic info:
                    </p>
                    <div className="text-left bg-black/80 text-green-400 p-4 rounded-md font-mono text-xs overflow-auto mb-6">
                        <p>Lease ID in URL: {id}</p>
                        <p>Lease Document Found: {lease ? "YES" : "NO"}</p>
                        <p>User Logged In: {currentUser ? "YES" : "NO"}</p>
                        {currentUser && lease && (
                            <>
                                <p>Your User ID: {currentUser.uid}</p>
                                <p>Lease Tenant ID: {lease.tenantId}</p>
                                <p>Match: {currentUser.uid === lease.tenantId ? "YES" : "FAIL"}</p>
                            </>
                        )}
                    </div>
                    <Button asChild variant="outline">
                        <Link href="/student">Return to Dashboard</Link>
                    </Button>
                </div>
            </div>
        );
    }

    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [clientSecret, setClientSecret] = useState("");

    React.useEffect(() => {
        if (isPaymentOpen && property?.price) {
            fetch("/api/create-payment-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: property.price,
                    destinationAccountId: landlord?.stripeAccountId
                }),
            })
                .then((res) => res.json())
                .then((data) => setClientSecret(data.clientSecret));
        }
    }, [isPaymentOpen, property?.price, landlord?.stripeAccountId]);

    const handlePaymentSuccess = async () => {
        try {
            if (!leaseRef) return;
            await updateDoc(leaseRef, { status: 'active' });

            if (propertyRef) {
                await updateDoc(propertyRef, {
                    status: 'occupied',
                    currentTenantId: currentUser.uid,
                    leaseStartDate: lease.startDate
                });
            }

            await addDoc(collection(firestore, 'transactions'), {
                landlordId: lease.landlordId,
                tenantId: currentUser.uid,
                propertyId: lease.propertyId,
                amount: property?.price || 0,
                date: new Date().toISOString(),
                type: 'Rent',
                status: 'Completed'
            });

            setIsPaymentOpen(false);
            toast({
                title: "Payment Successful!",
                description: "Your lease is now ACTIVE. Welcome to your new home!"
            });
            router.refresh();
        } catch (error) {
            console.error("Post-payment update failed:", error);
            toast({ variant: "destructive", title: "Error", description: "Payment succeeded but status update failed. Contact support." });
        }
    };

    const handleSignLease = async () => {
        if (!leaseRef) return;
        try {
            // Inject Tenant Name into Lease
            const signedName = currentUser.legalName || currentUser.name || "Tenant";
            const signatureLine = `\n\nDigitally Signed by Tenant: ${signedName} on ${new Date().toLocaleString()}`;
            const updatedLeaseText = lease.leaseText + signatureLine;

            await updateDoc(leaseRef, {
                tenantSigned: true,
                leaseText: updatedLeaseText
                // Do NOT set status 'active' yet. Wait for payment.
            });

            toast({
                title: "Lease Signed Successfully!",
                description: "Signature recorded. Please proceed to payment."
            });
            // Open payment modal immediately
            setIsPaymentOpen(true);
        } catch (error: unknown) {
            console.error("Error signing lease:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not sign the lease. Please try again."
            })
        }
    };

    const handleDownloadLease = () => {
        if (!lease) return;
        // Create a blob from the lease text
        const element = document.createElement("a");
        const file = new Blob([lease.leaseText], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `Lease_Agreement_${property?.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.txt`;
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();
        document.body.removeChild(element);
    };

    const processPayment = async () => {
        if (!cardNumber || !expiry || !cvc) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please fill in all payment details." });
            return;
        }

        setIsProcessingPayment(true);

        // SIMULATED PAYMENT PROCESSING
        // In a real app, you would send this to your backend (Stripe/Paystack)
        // See 'payment_integration_guide.md' for details.
        setTimeout(async () => {
            try {
                if (!leaseRef) return;

                // 1. Activate Lease
                await updateDoc(leaseRef, {
                    status: 'active'
                });

                // 2. Update Property Status to Occupied & Set Current Tenant
                if (propertyRef) {
                    await updateDoc(propertyRef, {
                        status: 'occupied',
                        currentTenantId: currentUser.uid,
                        leaseStartDate: lease.startDate
                    });
                }

                // 3. Record Transaction
                await addDoc(collection(firestore, 'transactions'), {
                    landlordId: lease.landlordId,
                    tenantId: currentUser.uid,
                    propertyId: lease.propertyId,
                    amount: property?.price || 0,
                    date: new Date().toISOString(),
                    type: 'Rent',
                    status: 'Completed'
                });

                setIsPaymentOpen(false);
                toast({
                    title: "Payment Successful!",
                    description: "Your lease is now ACTIVE. Welcome to your new home!"
                });

                router.refresh();

            } catch (error) {
                console.error("Payment failed:", error);
                toast({ variant: "destructive", title: "Payment Failed", description: "Something went wrong. Please try again." });
            } finally {
                setIsProcessingPayment(false);
            }
        }, 2000); // 2 second delay to simulate network request
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
            <style jsx global>{`
                @media print {
                    @page { margin: 2cm; }
                    body * {
                        visibility: hidden;
                    }
                    #lease-document, #lease-document * {
                        visibility: visible;
                    }
                    #lease-document {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                }
            `}</style>
            <div className="flex items-center gap-4 print:hidden">
                {getStatusIcon(lease.status)}
                <h1 className="font-headline text-3xl font-bold">Lease Agreement</h1>
            </div>
            <p className="text-muted-foreground print:hidden">
                Review the details of the lease for <Link href={`/student/properties/${property?.id}`} className="font-medium text-primary hover:underline">{property?.title}</Link>.
            </p>
            <Separator className="my-4 print:hidden" />
            <Card className="print:border-0 print:shadow-none">
                <CardHeader className="print:hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>{property?.title}</CardTitle>
                            <CardDescription>{property?.location.address}, {property?.location.city}, {property?.location.state}</CardDescription>
                        </div>
                        <Badge variant={getStatusVariant(lease.status)} className="text-base capitalize hidden print:block border-2 p-1 px-4">{lease.status}</Badge>
                        <div className="flex gap-2 print:hidden">
                            <Button variant="outline" size="sm" onClick={handleDownloadLease}>
                                <Download className="h-4 w-4 mr-2" />
                                Download Lease
                            </Button>
                            <Badge variant={getStatusVariant(lease.status)} className="text-base capitalize">{lease.status}</Badge>
                        </div>
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
                    <h3 className="font-semibold mb-2 print:hidden">Lease Document</h3>
                    <ScrollArea className="h-96 rounded-md border bg-secondary/30 p-4 print:h-auto print:bg-white print:border-0 print:p-0">
                        <div id="lease-document" className="prose prose-sm max-w-none whitespace-pre-wrap">{lease.leaseText}</div>
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

                    {lease.status === 'pending' && !lease.tenantSigned ? (
                        <div className="mt-6 flex flex-col items-center gap-4 rounded-lg border border-primary/50 bg-primary/5 p-6">
                            <h3 className="font-bold">Action Required: Sign Lease</h3>
                            <p className="text-center text-sm text-muted-foreground">Review the lease agreement above. By clicking "Sign Lease", you are digitally signing and agreeing to all terms and conditions.</p>
                            <Button onClick={handleSignLease}>
                                <Signature className="mr-2 h-4 w-4" />
                                Sign Lease Agreement
                            </Button>
                        </div>
                    ) : null}

                    {/* Show Payment Button if signed but not active (pending payment) */}
                    {/* Note: In our new flow, we might want a distinct 'signed_pending_payment' status, 
                    but sticking to 'pending' with tenantSigned=true works if we check flags. */}
                    {lease.tenantSigned && lease.status === 'pending' && (
                        <div className="mt-6 flex flex-col items-center gap-4 rounded-lg border border-green-600/50 bg-green-50 p-6 dark:bg-green-950/20">
                            <h3 className="font-bold text-green-700 dark:text-green-400">Lease Signed! Next Step: Payment</h3>
                            <p className="text-center text-sm text-muted-foreground">
                                Please make your first month's rent payment to finalize the tenancy and receive your keys.
                            </p>
                            <div className="flex gap-4">
                                <Button className="w-full mt-4" size="lg" onClick={() => setIsPaymentOpen(true)}>
                                    <DollarSign className="h-4 w-4 mr-2" />
                                    Pay First Month's Rent
                                </Button>
                            </div>
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

            <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Complete Payment</DialogTitle>
                        <DialogDescription>
                            Securely pay your first month's rent via Stripe.
                        </DialogDescription>
                    </DialogHeader>
                    {clientSecret && (
                        <Elements options={{ clientSecret, appearance: { theme: 'stripe' } }} stripe={stripePromise}>
                            <StripeCheckoutForm amount={property?.price || 0} onSuccess={handlePaymentSuccess} />
                        </Elements>
                    )}
                </DialogContent>
            </Dialog>
        </div >
    );
}

