
'use client';

import { notFound, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from "date-fns";
import { CheckCircle2, FileClock, Hourglass, Check, Signature, AlertTriangle, Printer, DollarSign, Building } from 'lucide-react';
import { cn, formatPrice } from "@/utils";
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
        if (!leaseRef || !lease) return;
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
                        Digital Contract for <Link href={`/landlord/properties/${property?.id}`} className="text-primary hover:underline">#{property?.title}</Link>
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
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
                                    <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] sr-only text-transparent">DOCUMENT ID</p>
                                    <p className="font-mono text-xs opacity-60 sr-only text-transparent">#{lease.id.toUpperCase()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">ISSUE DATE</p>
                                    <p className="font-bold text-sm">{format(new Date(lease.startDate), 'MMMM dd, yyyy')}</p>
                                </div>
                            </div>

                            <Separator className="mb-10 opacity-10" />

                            <h2 className="text-xl font-black uppercase tracking-widest mb-8 text-center decoration-primary/20 underline underline-offset-8 decoration-4">
                                CONTRACTUAL TERMS & CONDITIONS
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
                                                <p className="text-[8px] font-black uppercase tracking-widest">AWAITING EXECUTION</p>
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
                                                <p className="text-[8px] font-black uppercase tracking-widest">PENDING APPROVAL</p>
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
                                <CheckCircle2 className="h-4 w-4" /> CONTRACT METRICS
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="space-y-6">
                                <div className="flex justify-between items-center group">
                                    <div>
                                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">RENTAL ASSET</p>
                                        <p className="font-black text-sm uppercase group-hover:text-primary transition-colors truncate max-w-[150px]">{property?.title}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-xl bg-muted/20 flex items-center justify-center">
                                        <Building className="h-5 w-5 opacity-20" />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center group">
                                    <div>
                                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">TERM DURATION</p>
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

                    {/* Action Card: Sign */}
                    {lease.status === 'pending' && !lease.landlordSigned && (
                        <div className="relative group overflow-hidden rounded-[2.5rem] bg-foreground text-white p-8 md:p-10 shadow-2xl space-y-8 animate-in slide-in-from-right duration-700">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[5rem] -mr-8 -mt-8 transition-all group-hover:scale-110" />
                            <div className="relative z-10 space-y-4 text-center">
                                <h3 className="text-2xl font-black uppercase tracking-tight">EXECUTE AGREEMENT</h3>
                                <p className="text-white/60 font-serif text-sm leading-relaxed">
                                    &quot;Your signature confirm that terms reflect the latest property updates.&quot;
                                </p>
                                <Button className="w-full h-16 rounded-2xl bg-white text-foreground hover:bg-white/90 font-black text-sm uppercase tracking-widest gap-3 shadow-2xl transition-all hover:scale-105 active:scale-95" onClick={handleSignLease}>
                                    <Signature className="h-5 w-5" /> SIGN DIGITALLY
                                </Button>
                            </div>
                        </div>
                    )}

                    {lease.status === 'pending' && lease.landlordSigned && (
                        <div className="relative group overflow-hidden rounded-[2.5rem] bg-blue-600 text-white p-8 md:p-10 shadow-2xl space-y-8 animate-in slide-in-from-right duration-700 text-center">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[5rem] -mr-8 -mt-8 transition-all group-hover:scale-110" />
                            <div className="relative z-10 space-y-4">
                                <h3 className="text-xl font-black uppercase tracking-tight">AWAITING TENANT</h3>
                                <p className="text-white/60 font-serif text-sm leading-relaxed">
                                    This lease has been sent to {tenant?.name} for their signature.
                                </p>
                            </div>
                        </div>
                    )}

                    <Link href="/landlord/leases" className="block text-center">
                        <Button variant="ghost" className="font-black text-[10px] uppercase tracking-[0.3em] hover:tracking-[0.4em] transition-all opacity-40 hover:opacity-100">
                            ← BACK TO ALL LEASES
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
