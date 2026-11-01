
'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Signature, CheckCircle2, FileClock, Hourglass, DollarSign, Download, Printer, ShieldAlert, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import PaymentDialog from '@/components/payments/payment-dialog';
import type { LeaseAgreement, Property, UserProfile as User } from '@/types';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { PageSkeleton } from "@/components/dashboard/skeletons";
import { sendNotification } from '@/lib/notifications';
import { formatPrice, cn } from '@/lib/utils';




import { useState } from 'react';
import { authHeaders } from "@/lib/api-client";
import { EmptyState } from "@/components/dashboard";
import { FileX } from "lucide-react";

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

    const [isPaymentOpen, setIsPaymentOpen] = useState(false);

    if (isLoading) {
        return <PageSkeleton variant="detail" />;
    }

    if (!lease || !currentUser || (currentUser.uid !== lease.tenantId)) {
        return (
            <EmptyState
                className="mx-auto mt-10 max-w-xl"
                icon={FileX}
                title="We couldn't open this lease"
                description="It may have been removed, or it belongs to a different account."
                action={
                    <Button asChild variant="outline" className="rounded-xl">
                        <Link href="/student/leases">Back to leases</Link>
                    </Button>
                }
            />
        );
    }

    const handlePaymentSuccess = async (details: { months: number, method: string, amount: number, transactionId?: string }) => {
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
                    transactionId: details.transactionId,
                    link: `/landlord/requests` // Fallback
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

                    // Notify other applicants about the property being occupied
                    try {
                        await fetch('/api/notify-applicants', {
                            method: 'POST',
                            headers: await authHeaders(),
                            body: JSON.stringify({
                                propertyId: lease.propertyId,
                                winnerTenantId: currentUser.uid,
                                propertyTitle: property?.title
                            })
                        });
                    } catch (err) {
                        console.error("Failed to notify other applicants", err);
                    }
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
            const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

            let updatedLeaseText = lease.leaseText;

            // Replace Tenant: Nill globally (top and bottom)
            updatedLeaseText = updatedLeaseText.replace(/Tenant:\s*Nill/g, `Tenant: ${signedName}`);

            // Replace Date: Nill specifically following Tenant line
            updatedLeaseText = updatedLeaseText.replace(/(Tenant:[^\n]*\n\s*Date:\s*)Nill/g, `$1${dateStr}`);

            // Fallback: If no Nill pattern found (e.g. legacy lease), append signature
            if (!updatedLeaseText.includes(`Tenant: ${signedName}`)) {
                const signatureLine = `\n\nDigitally Signed by Tenant: ${signedName} on ${new Date().toLocaleString()}`;
                updatedLeaseText = updatedLeaseText + signatureLine;
            }

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
        <div className="max-w-5xl mx-auto space-y-8 pb-8 animate-in fade-in duration-700">
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
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b border-foreground/5">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-2 rounded-xl bg-card shadow-lg border",
                            lease.status === 'active' ? "border-green-500/20" :
                                lease.status === 'pending' ? "border-primary/20" : "border-muted/20"
                        )}>
                            {getStatusIcon(lease.status)}
                        </div>
                        <Badge variant={getStatusVariant(lease.status)} className="px-4 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                            {lease.status}
                        </Badge>
                    </div>
                    <h1 className="font-headline text-3xl md:text-3xl font-bold tracking-tight text-foreground">
                        Lease agreement
                    </h1>
                    <p className="text-lg text-muted-foreground font-medium">
                        For <Link href={`/student/properties/${property?.id}`} className="text-primary hover:underline">{property?.title}</Link>
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button variant="outline" className="h-11 rounded-2xl px-6 font-semibold text-xs uppercase tracking-wider gap-2 bg-card hover:bg-muted/50 transition-all border" onClick={handleDownloadLease}>
                        <Download className="h-4 w-4" /> Download
                    </Button>
                    <Button variant="outline" className="h-11 rounded-2xl px-6 font-semibold text-xs uppercase tracking-wider gap-2 bg-card hover:bg-muted/50 transition-all border" onClick={() => window.print()}>
                        <Printer className="h-4 w-4" /> Print
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content: The Document */}
                <div className="lg:col-span-2 space-y-10">
                    <div className="relative group">
                        {/* Decorative Background for "Paper" effect */}
                        <div className="absolute inset-0 bg-muted/20 -rotate-1 rounded-3xl -z-10 transition-transform group-hover:rotate-0" />
                        <div className="absolute inset-0 bg-primary/5 rotate-1 rounded-3xl -z-10 transition-transform group-hover:rotate-0" />

                        <div className="relative bg-card border border-foreground/5 shadow-sm rounded-3xl p-8 md:p-8 min-h-[600px] flex flex-col">
                            <div className="flex justify-between items-start mb-12">
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-muted-foreground/40 uppercase tracking-wider">Agreement type</p>
                                    <p className="font-mono text-xs opacity-60">Fixed Term Residential Lease</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-semibold text-muted-foreground/40 uppercase tracking-wider">DATE</p>
                                    <p className="font-bold text-sm">{format(new Date(lease.startDate), 'MMMM dd, yyyy')}</p>
                                </div>
                            </div>

                            <Separator className="mb-10 opacity-10" />

                            <h2 className="text-xl font-bold tracking-wider mb-8 text-center decoration-primary/20 underline underline-offset-8 decoration-4">
                                Lease terms & conditions
                            </h2>

                            <div id="lease-document" className="prose prose-sm md:prose-base max-w-none whitespace-pre-wrap leading-relaxed text-foreground/80 flex-grow">
                                {lease.leaseText}
                            </div>

                            <Separator className="my-12 opacity-10" />

                            {/* Formal Signature Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-auto pt-8 border-t-2 border-dotted border-muted/30">
                                <div className="space-y-4">
                                    <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">Landlord signature</p>
                                    <div className="h-24 bg-muted/10 rounded-3xl border border-dashed border-muted/30 flex items-center justify-center relative overflow-hidden">
                                        {lease.landlordSigned ? (
                                            <div className="text-center animate-in zoom-in duration-500">
                                                <p className="text-2xl text-primary font-bold opacity-80 -rotate-3">{landlord?.name}</p>
                                                <Badge variant="secondary" className="mt-2 text-xs font-semibold uppercase tracking-tight bg-green-500/10 text-green-600 border-none">Verified signature</Badge>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 opacity-20">
                                                <Hourglass className="h-6 w-6" />
                                                <p className="text-xs font-semibold uppercase tracking-wider">Pending approval</p>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-center text-xs font-bold text-muted-foreground/40">Executed by: {landlord?.name || 'Authorized Representative'}</p>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">Tenant signature</p>
                                    <div className="h-24 bg-muted/10 rounded-3xl border border-dashed border-muted/30 flex items-center justify-center relative overflow-hidden">
                                        {lease.tenantSigned ? (
                                            <div className="text-center animate-in zoom-in duration-500">
                                                <p className="text-2xl text-primary font-bold opacity-80 -rotate-3">{tenant?.name}</p>
                                                <Badge variant="secondary" className="mt-2 text-xs font-semibold uppercase tracking-tight bg-green-500/10 text-green-600 border-none">Verified signature</Badge>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 opacity-20">
                                                <Hourglass className="h-6 w-6" />
                                                <p className="text-xs font-semibold uppercase tracking-wider">Awaiting signature</p>
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
                    <Card className="rounded-3xl border border-foreground/5 shadow-sm bg-card overflow-hidden">
                        <CardHeader className="bg-primary/5 border-b-2 border-primary/10">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                                <FileText className="h-4 w-4" /> Lease details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="space-y-6">
                                <div className="flex justify-between items-center group">
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground/40 uppercase tracking-wider mb-1">Property</p>
                                        <p className="font-bold text-sm uppercase group-hover:text-primary transition-colors truncate max-w-[150px]">{property?.title}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-xl bg-muted/20 flex items-center justify-center">
                                        <CheckCircle2 className="h-5 w-5 opacity-20" />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center group">
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground/40 uppercase tracking-wider mb-1">Lease term</p>
                                        <p className="font-bold text-sm uppercase truncate max-w-[150px]">
                                            {format(new Date(lease.startDate), 'MMM yy')} - {format(new Date(lease.endDate), 'MMM yy')}
                                        </p>
                                    </div>
                                    <div className="h-10 w-10 rounded-xl bg-muted/20 flex items-center justify-center">
                                        <FileClock className="h-5 w-5 opacity-20" />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center group">
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground/40 uppercase tracking-wider mb-1">Monthly rate</p>
                                        <p className="font-bold text-2xl text-primary">{formatPrice(property?.price || 0, property?.currency)}</p>
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
                            <div className="relative group overflow-hidden rounded-3xl bg-foreground text-white p-8 md:p-8 shadow-sm space-y-8 animate-in slide-in-from-right duration-700">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-3xl -mr-8 -mt-8 transition-all group-hover:scale-110" />
                                <div className="relative z-10 space-y-4">
                                    <h3 className="text-2xl font-bold tracking-tight">Sign agreement</h3>
                                    <p className="text-white/60 text-sm leading-relaxed">
                                        &quot;Your signature acknowledges full acceptance of the terms outlined in this agreement.&quot;
                                    </p>
                                    <Button className="w-full h-16 rounded-2xl bg-card text-foreground hover:bg-white/90 font-bold text-sm uppercase tracking-wider gap-3 shadow-sm transition-all hover:scale-105 active:scale-95" onClick={handleSignLease}>
                                        <Signature className="h-5 w-5" /> Sign digitally
                                    </Button>
                                </div>
                            </div>
                        ) : null}

                        {lease.tenantSigned && lease.status === 'pending' && !lease.paymentMethod && (
                            <div className="relative group overflow-hidden rounded-3xl bg-green-600 text-white p-8 md:p-8 shadow-sm space-y-8 animate-in slide-in-from-right duration-700">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-3xl -mr-8 -mt-8 transition-all group-hover:scale-110" />
                                <div className="relative z-10 space-y-6">
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-bold tracking-tight">Initial payment</h3>
                                        <p className="text-white/60 text-sm leading-relaxed">
                                            &quot;Finalize your status by securing the property through an initial payment.&quot;
                                        </p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-bold tracking-tight">Activate Tenancy</h3>
                                            <p className="text-white/60 text-sm leading-relaxed">
                                                &quot;Complete your payment to activate the lease agreement and receive your move-in instructions.&quot;
                                            </p>
                                        </div>

                                        <Button className="w-full h-16 rounded-2xl bg-card text-primary hover:bg-white/90 font-bold text-lg gap-3 shadow-sm transition-all hover:scale-[1.02]" onClick={() => setIsPaymentOpen(true)}>
                                            <DollarSign className="h-6 w-6" /> Pay
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {lease.paymentMethod === 'offline' && !lease.paymentConfirmed && (
                            <div className="relative group overflow-hidden rounded-3xl bg-blue-600 text-white p-8 md:p-8 shadow-sm space-y-8 animate-in slide-in-from-right duration-700">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-3xl -mr-8 -mt-8 transition-all group-hover:scale-110" />
                                <div className="relative z-10 space-y-6 text-center">
                                    <div className="relative inline-block mx-auto">
                                        <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full scale-150 animate-pulse" />
                                        <Hourglass className="h-14 w-14 text-white relative animate-bounce" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-bold tracking-tight">Manual verification</h3>
                                        <p className="text-white/60 text-sm leading-relaxed">
                                            &quot;We are verifying your payment. Your lease will be activated shortly.&quot;
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {lease.status === 'active' && (
                            <div className="relative group overflow-hidden rounded-3xl bg-card border border-foreground/5 p-8 md:p-8 shadow-lg space-y-8 animate-in slide-in-from-right duration-700">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                                            <DollarSign className="h-5 w-5 text-green-600" /> Pay Rent
                                        </h3>
                                        <p className="text-muted-foreground text-sm leading-relaxed">
                                            Manage your monthly rental payments securely.
                                        </p>
                                    </div>
                                    <Button className="w-full h-16 rounded-2xl bg-foreground text-white hover:bg-foreground/90 font-bold text-lg gap-3 shadow-sm transition-all hover:scale-[1.02]" onClick={() => setIsPaymentOpen(true)}>
                                        Pay
                                    </Button>
                                    <p className="text-xs text-center font-bold text-muted-foreground/40 uppercase tracking-wider">
                                        Next Due Date: {format(new Date(), 'MMM dd, yyyy')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <Link href="/student/leases" className="block text-center">
                        <Button variant="ghost" className="font-semibold text-xs uppercase tracking-wider hover:tracking-wider transition-all opacity-40 hover:opacity-100">
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

