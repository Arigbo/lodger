
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { CheckCircle2, FileClock, Hourglass, Signature, AlertTriangle, Printer, DollarSign, Building, Loader2 } from 'lucide-react';
import { cn, formatPrice } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import type { LeaseAgreement, UserProfile as User, Property } from '@/types';
import Loading from '@/app/loading';
import { EmptyState } from "@/components/dashboard";
import { FileX } from "lucide-react";


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

    const [isSigning, setIsSigning] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);

    // Unified loading state
    const isLoading = isUserLoading || isLeaseLoading;
    const isSupportingDataLoading = isLandlordLoading || isTenantLoading || isPropertyLoading;

    const handleSignLease = async () => {
        if (!leaseRef || !lease) return;

        setIsSigning(true);
        try {
            const signedName = landlord?.legalName || landlord?.name || "Landlord";
            const signatureLine = `\n\nDigitally Signed by Landlord: ${signedName} on ${new Date().toLocaleString()}`;
            const updatedLeaseText = lease.leaseText + signatureLine;

            await updateDoc(leaseRef, {
                landlordSigned: true,
                leaseText: updatedLeaseText
            });

            // Show success logic
            setIsSigning(false);
            setShowSuccessDialog(true);

            // Note: We don't rely only on toast anymore as per UX feedback
            toast({
                title: "Lease Signed Successfully!",
                description: "Your signature has been recorded."
            });
        } catch (error: unknown) {
            console.error("Error signing lease:", error);
            setIsSigning(false);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not sign the lease. Please try again."
            })
        }
    };


    if (isLoading) {
        return <Loading />;
    }

    // After main lease and user are loaded, check if they exist or if match fails
    if (!lease || !currentUser || currentUser.uid !== lease.landlordId) {
        return (
            <EmptyState
                className="mx-auto mt-10 max-w-xl"
                icon={FileX}
                title="We couldn't open this lease"
                description="It may have been removed, or it belongs to a different account."
                action={
                    <Button asChild variant="outline" className="rounded-xl">
                        <Link href="/landlord/leases">Back to leases</Link>
                    </Button>
                }
            />
        );
    }

    // Wait for supporting data if we have the main lease
    if (isSupportingDataLoading) {
        return <Loading />;
    }

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
            case 'terminating': return <AlertTriangle className="h-5 w-5 text-destructive" />;
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
                    <h1 className="font-headline text-4xl md:text-3xl font-bold tracking-tight text-foreground">
                        Lease agreement
                    </h1>
                    <p className="text-lg text-muted-foreground font-medium">
                        For <Link href={`/landlord/properties/${property?.id}`} className="text-primary hover:underline">{property?.title}</Link>
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
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
                                    <p className="text-xs font-semibold text-muted-foreground/40 uppercase tracking-wider">Document ID</p>
                                    <p className="font-mono text-xs opacity-60">#{lease.id.toUpperCase()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-semibold text-muted-foreground/40 uppercase tracking-wider">Issue date</p>
                                    <p className="font-bold text-sm">{format(new Date(lease.startDate), 'MMMM dd, yyyy')}</p>
                                </div>
                            </div>

                            <Separator className="mb-10 opacity-10" />

                            <h2 className="text-xl font-bold tracking-wider mb-8 text-center decoration-primary/20 underline underline-offset-8 decoration-4">
                                Contractual terms & conditions
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
                                                <p className="text-xs font-semibold uppercase tracking-wider">Awaiting signature</p>
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
                                                <p className="text-xs font-semibold uppercase tracking-wider">Pending approval</p>
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
                                <CheckCircle2 className="h-4 w-4" /> Lease details
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
                                        <Building className="h-5 w-5 opacity-20" />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center group">
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground/40 uppercase tracking-wider mb-1">Term duration</p>
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

                    {/* Action Card: Sign */}
                    {lease.status === 'pending' && !lease.landlordSigned && (
                        <div className="relative group overflow-hidden rounded-3xl bg-foreground text-white p-8 md:p-8 shadow-sm space-y-8 animate-in slide-in-from-right duration-700">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-3xl -mr-8 -mt-8 transition-all group-hover:scale-110" />
                            <div className="relative z-10 space-y-4 text-center">
                                <h3 className="text-2xl font-bold tracking-tight">Sign agreement</h3>
                                <p className="text-white/60 font-serif text-sm leading-relaxed">
                                    &quot;Your signature confirm that terms reflect the latest property updates.&quot;
                                </p>
                                <Button
                                    className="w-full h-16 rounded-2xl bg-card text-foreground hover:bg-white/90 font-bold text-sm uppercase tracking-wider gap-3 shadow-sm transition-all hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-70"
                                    onClick={handleSignLease}
                                    disabled={isSigning}
                                >
                                    {isSigning ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" /> Signing...
                                        </>
                                    ) : (
                                        <>
                                            <Signature className="h-5 w-5" /> Sign digitally
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {lease.status === 'pending' && lease.landlordSigned && (
                        <div className="relative group overflow-hidden rounded-3xl bg-blue-600 text-white p-8 md:p-8 shadow-sm space-y-8 animate-in slide-in-from-right duration-700 text-center">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-3xl -mr-8 -mt-8 transition-all group-hover:scale-110" />
                            <div className="relative z-10 space-y-4">
                                <h3 className="text-xl font-bold tracking-tight">Awaiting tenant</h3>
                                <p className="text-white/60 font-serif text-sm leading-relaxed">
                                    This lease has been sent to {tenant?.name} for their signature.
                                </p>
                            </div>
                        </div>
                    )}

                    <Link
                        href="/landlord/leases"
                        className={cn(
                            buttonVariants({ variant: "ghost" }),
                            "font-semibold text-xs uppercase tracking-wider hover:tracking-wider transition-all opacity-40 hover:opacity-100"
                        )}
                    >
                        ← BACK TO ALL LEASES
                    </Link>
                </div>
            </div>

            <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="h-6 w-6" />
                            Lease Signed Successfully
                        </DialogTitle>
                        <DialogDescription>
                            Your digital signature has been recorded. The lease is now pending tenant signature.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center py-6">
                        <Signature className="h-16 w-16 text-primary/20" />
                    </div>
                    <DialogFooter className="sm:justify-between gap-2">
                        <Button
                            className="w-full"
                            onClick={() => setShowSuccessDialog(false)}
                        >
                            Okay, Got it
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
