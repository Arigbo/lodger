
'use client';
import React from 'react';
import { notFound, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Signature, CheckCircle2, FileClock, Hourglass, Check, DollarSign, Download, Printer, ShieldAlert, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import PaymentDialog from '@/components/payment-dialog';
import type { LeaseAgreement, Property, UserProfile as User } from '@/types';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Loading from '@/app/loading';
import { sendNotification } from '@/lib/notifications';
import { formatPrice, cn } from '@/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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

    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [monthsToPay, setMonthsToPay] = useState(1);

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

    const handlePaymentSuccess = async (details: { months: number, method: string, amount: number }) => {
        try {
            if (!leaseRef) return;

            const isOffline = details.method === 'Offline';

            if (isOffline) {
                // For offline, we don't activate yet, just record the selection
                await updateDoc(leaseRef, {
                    paymentMethod: 'offline',
                    paymentConfirmed: false,
                    offlinePaymentAmount: details.amount,
                    offlinePaymentMonths: details.months
                });

                // Send notification for offline verification
                await sendNotification({
                    toUserId: lease.landlordId,
                    type: 'OFFLINE_PAYMENT_PENDING',
                    firestore: firestore,
                    propertyName: property?.title || 'Property',
                    link: `/landlord/requests`
                });

                toast({
                    title: "Offline Payment Recorded",
                    description: "Waiting for landlord to confirm payment receipt. Your lease will be activated once verified."
                });
            } else {
                // For Stripe (once implemented), we activate immediately
                await updateDoc(leaseRef, {
                    status: 'active',
                    paymentMethod: 'stripe',
                    paymentConfirmed: true
                });

                if (propertyRef) {
                    await updateDoc(propertyRef, {
                        status: 'occupied',
                        currentTenantId: currentUser.uid,
                        leaseStartDate: lease.startDate
                    });
                }

                toast({
                    title: "Payment Successful!",
                    description: "Your lease is now ACTIVE. Welcome to your new home!"
                });
            }

            setIsPaymentOpen(false);
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
            const signedName = tenant?.legalName || tenant?.name || "Tenant";
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


    const getStatusVariant = (status: 'active' | 'expired' | 'pending' | 'terminating') => {
        switch (status) {
            case 'active': return 'secondary';
            case 'expired': return 'outline';
            case 'pending': return 'default';
            case 'terminating': return 'destructive';
        }
    };
    const getStatusIcon = (status: 'active' | 'expired' | 'pending' | 'terminating') => {
        switch (status) {
            case 'active': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
            case 'expired': return <FileClock className="h-5 w-5 text-muted-foreground" />;
            case 'pending': return <Hourglass className="h-5 w-5 text-primary" />;
            case 'terminating': return <ShieldAlert className="h-5 w-5 text-destructive" />;
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-12 pb-32 animate-in fade-in duration-700">
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

            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b-4 border-foreground/5">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-2 rounded-xl bg-white shadow-lg border-2",
                            lease.status === 'active' ? "border-green-500/20" :
                                lease.status === 'pending' ? "border-primary/20" : "border-muted/20"
                        )}>
                            {getStatusIcon(lease.status)}
                        </div>
                        <Badge variant={getStatusVariant(lease.status)} className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                            {lease.status}
                        </Badge>
                    </div>
                    <h1 className="font-headline text-4xl md:text-5xl font-black tracking-tight text-foreground uppercase">
                        LEASE AGREEMENT
                    </h1>
                    <p className="text-lg text-muted-foreground font-medium">
                        Lease Agreement for <Link href={`/student/properties/${property?.id}`} className="text-primary hover:underline">#{property?.title}</Link>
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button variant="outline" className="h-14 rounded-2xl px-6 font-black text-xs uppercase tracking-widest gap-2 bg-white hover:bg-muted/50 transition-all border-2" onClick={handleDownloadLease}>
                        <Download className="h-4 w-4" /> DOWNLOAD
                    </Button>
                    <Button variant="outline" className="h-14 rounded-2xl px-6 font-black text-xs uppercase tracking-widest gap-2 bg-white hover:bg-muted/50 transition-all border-2" onClick={() => window.print()}>
                        <Printer className="h-4 w-4" /> PRINT
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Main Content: The Document */}
                <div className="lg:col-span-2 space-y-10">
                    <div className="relative group">
                        {/* Decorative Background for "Paper" effect */}
                        <div className="absolute inset-0 bg-muted/20 -rotate-1 rounded-[3rem] -z-10 transition-transform group-hover:rotate-0" />
                        <div className="absolute inset-0 bg-primary/5 rotate-1 rounded-[3rem] -z-10 transition-transform group-hover:rotate-0" />

                        <div className="relative bg-white border-2 border-foreground/5 shadow-2xl rounded-[3rem] p-8 md:p-12 min-h-[600px] flex flex-col">
                            <div className="flex justify-between items-start mb-12">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">LEASE ID</p>
                                    <p className="font-mono text-xs opacity-60">#{lease.id.toUpperCase()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">DATE</p>
                                    <p className="font-bold text-sm">{format(new Date(lease.startDate), 'MMMM dd, yyyy')}</p>
                                </div>
                            </div>

                            <Separator className="mb-10 opacity-10" />

                            <h2 className="text-xl font-black uppercase tracking-widest mb-8 text-center decoration-primary/20 underline underline-offset-8 decoration-4">
                                LEASE TERMS & CONDITIONS
                            </h2>

                            <div id="lease-document" className="prose prose-sm md:prose-base max-w-none whitespace-pre-wrap leading-relaxed text-foreground/80 flex-grow">
                                {lease.leaseText}
                            </div>

                            <Separator className="my-12 opacity-10" />

                            {/* Formal Signature Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-auto pt-8 border-t-2 border-dotted border-muted/30">
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">LANDLORD SIGNATURE</p>
                                    <div className="h-24 bg-muted/10 rounded-3xl border-2 border-dashed border-muted/30 flex items-center justify-center relative overflow-hidden">
                                        {lease.landlordSigned ? (
                                            <div className="text-center animate-in zoom-in duration-500">
                                                <p className="text-2xl text-primary font-bold opacity-80 -rotate-3">{landlord?.name}</p>
                                                <Badge variant="secondary" className="mt-2 text-[9px] font-black uppercase tracking-tighter bg-green-500/10 text-green-600 border-none">VERIFIED SIGNATURE</Badge>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 opacity-20">
                                                <Hourglass className="h-6 w-6" />
                                                <p className="text-[8px] font-black uppercase tracking-widest">PENDING APPROVAL</p>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-center text-xs font-bold text-muted-foreground/40">Executed by: {landlord?.name || 'Authorized Representative'}</p>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">TENANT SIGNATURE</p>
                                    <div className="h-24 bg-muted/10 rounded-3xl border-2 border-dashed border-muted/30 flex items-center justify-center relative overflow-hidden">
                                        {lease.tenantSigned ? (
                                            <div className="text-center animate-in zoom-in duration-500">
                                                <p className="text-2xl text-primary font-bold opacity-80 -rotate-3">{tenant?.name}</p>
                                                <Badge variant="secondary" className="mt-2 text-[9px] font-black uppercase tracking-tighter bg-green-500/10 text-green-600 border-none">VERIFIED SIGNATURE</Badge>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 opacity-20">
                                                <Hourglass className="h-6 w-6" />
                                                <p className="text-[8px] font-black uppercase tracking-widest">AWAITING EXECUTION</p>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-center text-xs font-bold text-muted-foreground/40">Executed by: {tenant?.name || 'Prospective Tenant'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar: Metadata & Actions */}
                <div className="space-y-10">
                    {/* Metadata Card */}
                    <Card className="rounded-[2.5rem] border-2 border-foreground/5 shadow-xl bg-white overflow-hidden">
                        <CardHeader className="bg-primary/5 border-b-2 border-primary/10">
                            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <FileText className="h-4 w-4" /> LEASE DETAILS
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="space-y-6">
                                <div className="flex justify-between items-center group">
                                    <div>
                                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">PROPERTY</p>
                                        <p className="font-black text-sm uppercase group-hover:text-primary transition-colors truncate max-w-[150px]">{property?.title}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-xl bg-muted/20 flex items-center justify-center">
                                        <CheckCircle2 className="h-5 w-5 opacity-20" />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center group">
                                    <div>
                                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">LEASE TERM</p>
                                        <p className="font-black text-sm uppercase truncate max-w-[150px]">
                                            {format(new Date(lease.startDate), 'MMM yy')} - {format(new Date(lease.endDate), 'MMM yy')}
                                        </p>
                                    </div>
                                    <div className="h-10 w-10 rounded-xl bg-muted/20 flex items-center justify-center">
                                        <FileClock className="h-5 w-5 opacity-20" />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center group">
                                    <div>
                                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">MONTHLY RATE</p>
                                        <p className="font-black text-2xl text-primary">{formatPrice(property?.price || 0, property?.currency)}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                                        <DollarSign className="h-5 w-5 text-green-600" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Card: Sign/Pay */}
                    <div className="space-y-6">
                        {lease.status === 'pending' && !lease.tenantSigned ? (
                            <div className="relative group overflow-hidden rounded-[2.5rem] bg-foreground text-white p-8 md:p-10 shadow-2xl space-y-8 animate-in slide-in-from-right duration-700">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[5rem] -mr-8 -mt-8 transition-all group-hover:scale-110" />
                                <div className="relative z-10 space-y-4">
                                    <h3 className="text-2xl font-black uppercase tracking-tight">SIGN AGREEMENT</h3>
                                    <p className="text-white/60 text-sm leading-relaxed">
                                        &quot;Your signature acknowledges full acceptance of the terms outlined in this agreement.&quot;
                                    </p>
                                    <Button className="w-full h-16 rounded-2xl bg-white text-foreground hover:bg-white/90 font-black text-sm uppercase tracking-widest gap-3 shadow-2xl transition-all hover:scale-105 active:scale-95" onClick={handleSignLease}>
                                        <Signature className="h-5 w-5" /> SIGN DIGITALLY
                                    </Button>
                                </div>
                            </div>
                        ) : null}

                        {lease.tenantSigned && lease.status === 'pending' && !lease.paymentMethod && (
                            <div className="relative group overflow-hidden rounded-[2.5rem] bg-green-600 text-white p-8 md:p-10 shadow-2xl space-y-8 animate-in slide-in-from-right duration-700">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[5rem] -mr-8 -mt-8 transition-all group-hover:scale-110" />
                                <div className="relative z-10 space-y-6">
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black uppercase tracking-tight">INITIAL PAYMENT</h3>
                                        <p className="text-white/60 text-sm leading-relaxed">
                                            &quot;Finalize your status by securing the property through an initial payment.&quot;
                                        </p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-black uppercase tracking-tight">Activate Tenancy</h3>
                                            <p className="text-white/60 text-sm leading-relaxed">
                                                &quot;Complete your payment to activate the lease agreement and receive your move-in instructions.&quot;
                                            </p>
                                        </div>

                                        <Button className="w-full h-16 rounded-2xl bg-white text-primary hover:bg-white/90 font-black text-lg gap-3 shadow-2xl transition-all hover:scale-[1.02]" onClick={() => setIsPaymentOpen(true)}>
                                            <CheckCircle2 className="h-6 w-6" /> PROCEED TO PAYMENT
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {lease.paymentMethod === 'offline' && !lease.paymentConfirmed && (
                            <div className="relative group overflow-hidden rounded-[2.5rem] bg-blue-600 text-white p-8 md:p-10 shadow-2xl space-y-8 animate-in slide-in-from-right duration-700">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[5rem] -mr-8 -mt-8 transition-all group-hover:scale-110" />
                                <div className="relative z-10 space-y-6 text-center">
                                    <div className="relative inline-block mx-auto">
                                        <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full scale-150 animate-pulse" />
                                        <Hourglass className="h-14 w-14 text-white relative animate-bounce" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-black uppercase tracking-tight">MANUAL VERIFICATION</h3>
                                        <p className="text-white/60 text-sm leading-relaxed">
                                            &quot;We are verifying your payment. Your lease will be activated shortly.&quot;
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <Link href="/student/leases" className="block text-center">
                        <Button variant="ghost" className="font-black text-[10px] uppercase tracking-[0.3em] hover:tracking-[0.4em] transition-all opacity-40 hover:opacity-100">
                            ← BACK TO LEASES
                        </Button>
                    </Link>
                </div>
            </div>

            {property && currentUser && (
                <PaymentDialog
                    isOpen={isPaymentOpen}
                    onClose={() => setIsPaymentOpen(false)}
                    onPaymentSuccess={handlePaymentSuccess}
                    amount={property.price}
                    tenantName={currentUser.displayName || currentUser.email || ''}
                    tenantId={currentUser.uid}
                    landlordId={lease.landlordId}
                    propertyId={lease.propertyId}
                    currency={property.currency}
                    destinationAccountId={landlord?.stripeAccountId}
                    metadata={{ type: 'Lease Activation', leaseId: lease.id }}
                />
            )}
        </div >
    );
}

