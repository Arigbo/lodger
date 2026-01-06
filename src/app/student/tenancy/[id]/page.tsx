
'use client';

import { notFound, useParams, useRouter } from "next/navigation";
import { formatPrice, cn } from "@/utils";
import { add } from "date-fns/add";
import { format, isPast } from "date-fns";
import PaymentDialog from '@/components/payment-dialog';
import { ScrollArea } from "@/components/ui/scroll-area";
import TenancySkeleton from "@/components/tenancy-skeleton";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where, updateDoc } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Property, UserProfile as User, Transaction, LeaseAgreement } from "@/types";
import { Separator } from "@/components/ui/separator";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AlertTriangle, FileText, User as UserIcon, MessageSquare, Clock, DollarSign, Signature } from "lucide-react";


export default function TenancyDetailPage() {
    const params = useParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const propertyRef = useMemoFirebase(() => id ? doc(firestore, 'properties', id) : null, [firestore, id]);
    const { data: property, isLoading: isPropertyLoading } = useDoc<Property>(propertyRef);

    const landlordRef = useMemoFirebase(() => property ? doc(firestore, 'users', property.landlordId) : null, [firestore, property]);
    const { data: landlord, isLoading: isLandlordLoading } = useDoc<User>(landlordRef);

    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

    const transactionsQuery = useMemoFirebase(() => (user && id) ? query(collection(firestore, 'transactions'), where('tenantId', '==', user.uid), where('propertyId', '==', id)) : null, [firestore, user, id]);
    const { data: transactions, isLoading: areTransactionsLoading } = useCollection<Transaction>(transactionsQuery);

    const leaseQuery = useMemoFirebase(() => (user && id) ? query(collection(firestore, 'leaseAgreements'), where('propertyId', '==', id), where('tenantId', '==', user.uid)) : null, [firestore, user, id]);
    const { data: leases, isLoading: isLeaseLoading } = useCollection<LeaseAgreement>(leaseQuery);
    const lease = leases?.[0];

    const [tenancyState, setTenancyState] = useState<{
        showPayButton: boolean;
        paymentAmount: number;
        leaseEndDate: Date;
        leaseStartDate: Date;
        isLeaseActive: boolean;
        isLeaseExpired: boolean;
        isRentDue: boolean;
        rentStatusText: string;
        rentDueDateText: string;
        hasPendingPayments: boolean;
    } | null>(null);
    const { toast } = useToast();

    const handlePaymentSuccess = async (details: { months: number, method: string, amount: number }) => {
        if (!lease || !property || !user) return;

        try {
            // If it's a Stripe payment, we might want to record it here if the dialog didn't
            // But based on the current architecture, the dialog handles the record creation for offline.
            // For Stripe, we'll assume the dialog also handles record creation or we do it here.
            // Let's ensure consistency.

            // Only execute activation logic if the lease is currently pending
            if (lease.status === 'pending') {
                // 1. Activate Lease
                const leaseRef = doc(firestore, 'leaseAgreements', lease.id);
                await updateDoc(leaseRef, {
                    status: 'active',
                    paymentMethod: details.method.toLowerCase(),
                    paymentConfirmed: details.method === 'Stripe'
                });

                // 2. Update Property to Occupied
                const propertyRef = doc(firestore, 'properties', property.id);
                await updateDoc(propertyRef, {
                    status: 'occupied',
                    currentTenantId: user.uid,
                    leaseStartDate: new Date().toISOString(),
                });

                // 3. Notify Landlord
                const { sendNotification } = await import('@/lib/notifications');
                await sendNotification({
                    toUserId: lease.landlordId,
                    type: 'LEASE_SIGNED',
                    firestore: firestore,
                    propertyName: property.title,
                    link: `/landlord/leases/${lease.id}`,
                    customMessage: `${user.displayName || 'Tenant'} has signed the lease and paid the first month's rent.`
                });

                toast({
                    title: "Tenancy Activated",
                    description: details.method === 'Stripe'
                        ? "Your lease is now active and your payment has been confirmed."
                        : "Your lease is being activated. Documentation has been sent to your landlord for verification."
                });
            } else {
                // Regular rent payment for an active lease
                toast({
                    title: "Payment Received",
                    description: `Your payment of ${formatPrice(details.amount, property.currency)} for ${details.months} month(s) has been recorded.`
                });
            }

            setIsPaymentDialogOpen(false);
            // We'll use window.location.reload() for a hard refresh to ensure all Firestore listeners update
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error("Error finalizing payment flow:", error);
            toast({
                variant: 'destructive',
                title: "Error",
                description: "Transaction completed, but failed to update status. Please contact support."
            });
        }
    };

    const handleConfirmCompensation = async () => {
        if (!lease || !property || !user) return;
        try {
            // Update lease to expired
            const leaseRef = doc(firestore, 'leaseAgreements', lease.id);
            await updateDoc(leaseRef, {
                status: 'expired',
                endDate: new Date().toISOString()
            });

            // Clean up property - mark as available and remove tenant
            const propertyRef = doc(firestore, 'properties', property.id);
            await updateDoc(propertyRef, {
                status: 'available',
                currentTenantId: null,
                leaseStartDate: null
            });

            toast({
                title: "Tenancy Finalized",
                description: "You have confirmed receipt of compensation. The tenancy is now officially ended.",
            });
            window.location.reload();
        } catch (error) {
            console.error("Error confirming compensation:", error);
            toast({
                title: "Error",
                description: "Failed to finalize tenancy. Please try again.",
                variant: "destructive",
            });
        }
    };

    // Auto-cleanup logic
    useEffect(() => {
        if (lease?.status === 'terminating' && lease.terminationGracePeriodEnd) {
            if (isPast(new Date(lease.terminationGracePeriodEnd))) {
                handleConfirmCompensation();
            }
        }
    }, [lease]);

    const handleMessageLandlord = () => {
        if (landlord) {
            router.push(`/student/messages?contact=${landlord.id}`);
        }
    };

    useEffect(() => {
        if (areTransactionsLoading || isLeaseLoading || !property) return;

        const tenantTransactions = transactions || [];
        const leaseStartDate = property?.leaseStartDate ? new Date(property.leaseStartDate) : (lease?.createdAt ? (typeof lease.createdAt.toDate === 'function' ? lease.createdAt.toDate() : new Date(lease.createdAt)) : new Date());
        const leaseEndDate = add(leaseStartDate, { years: 1 });

        // Calculate total months paid from completed rent transactions
        const rentTransactions = tenantTransactions
            .filter(t => (t.type === 'Rent' || t.type === 'Lease Activation') && t.status === 'Completed');

        const totalMonthsPaid = rentTransactions.reduce((acc, t) => acc + (t.months || 1), 0);
        const nextRentDueDate = add(leaseStartDate, { months: totalMonthsPaid });

        const isLeaseActive = lease?.status === 'active';
        const isRentDue = isPast(nextRentDueDate);
        const isLeaseExpired = lease?.status === 'expired' || isPast(leaseEndDate);

        // Check for pending payments
        const hasPendingPayments = tenantTransactions.some(t =>
            (t.type === 'Rent' || t.type === 'Lease Activation') &&
            (t.status === 'Pending' || t.status === 'Pending Verification')
        );

        setTenancyState({
            isLeaseActive,
            isLeaseExpired,
            isRentDue,
            rentDueDateText: format(nextRentDueDate, 'MMMM do, yyyy'),
            rentStatusText: isRentDue ? 'Rent is currently overdue' : 'Next rent payment scheduled',
            leaseEndDate,
            leaseStartDate,
            paymentAmount: property.price,
            hasPendingPayments,
            showPayButton: isLeaseActive && isRentDue && !hasPendingPayments
        });
    }, [transactions, areTransactionsLoading, lease, isLeaseLoading, property]);

    const isLoading = isUserLoading || isPropertyLoading || isLandlordLoading || !tenancyState;

    if (isLoading) {
        return <TenancySkeleton />;
    }

    // Allow access if:
    // User is the tenant on this specific lease (regardless of current property status)
    const isTenant = user?.uid === lease?.tenantId;

    if (!property || !isTenant) {
        if (!isLoading) notFound();
        return null;
    }



    return (
        <div className="max-w-full overflow-x-hidden space-y-8 md:space-y-12 px-4 md:px-0 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-2xl md:rounded-[2.5rem] bg-primary/5 p-4 sm:p-6 md:p-12 max-w-full">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8 max-w-full">
                    <div className="space-y-3 md:space-y-4 min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                            <Badge className="bg-primary text-primary-foreground font-black px-4 py-1.5 rounded-full border-none tracking-widest uppercase text-[10px] shadow-lg shadow-primary/20">
                                Active Tenancy
                            </Badge>
                        </div>
                        <h1 className="font-headline text-xl sm:text-2xl md:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-tight uppercase break-words overflow-wrap-anywhere">
                            {property.title}
                        </h1>
                        <p className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-muted-foreground/80 leading-relaxed break-words overflow-wrap-anywhere">
                            {property.location.address}, {property.location.city}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto max-w-full">
                        {tenancyState?.hasPendingPayments ? (
                            <div className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-amber-500/10 text-amber-600 rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[10px] md:text-xs uppercase tracking-widest border border-amber-500/20">
                                <Clock className="h-3 w-3" /> <span className="whitespace-nowrap">Pending</span>
                            </div>
                        ) : tenancyState?.isRentDue && tenancyState.isLeaseActive && (
                            <Button onClick={() => setIsPaymentDialogOpen(true)} size="lg" className="w-full sm:w-auto h-11 sm:h-12 md:h-14 rounded-xl sm:rounded-2xl px-4 sm:px-6 md:px-12 font-black text-[9px] sm:text-[10px] md:text-xs uppercase tracking-widest shadow-2xl shadow-primary/20 transition-all hover:shadow-primary/40 hover:-translate-y-1">
                                <DollarSign className="mr-1 sm:mr-2 h-3 w-3" /> <span className="whitespace-nowrap">Pay Rent</span>
                            </Button>
                        )}
                        <Button variant="outline" className="w-full sm:w-auto h-11 sm:h-12 md:h-14 rounded-xl sm:rounded-2xl px-4 sm:px-6 md:px-12 font-black text-[9px] sm:text-[10px] md:text-xs uppercase tracking-widest border-2" onClick={handleMessageLandlord}>
                            <MessageSquare className="mr-1 sm:mr-2 h-3 w-3" /> <span className="whitespace-nowrap">Contact</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Critical Action Alerts */}
            <div className="space-y-4 md:space-y-6 max-w-full">
                {lease?.status === 'pending' && !lease.tenantSigned && (
                    <Card className="overflow-hidden border-none bg-amber-500/10 shadow-xl shadow-amber-500/5 backdrop-blur-md text-amber-900 animate-in slide-in-from-top duration-500">
                        <CardHeader className="flex flex-row items-center gap-6 p-8">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-xl">
                                <Signature className="h-8 w-8 text-amber-600" />
                            </div>
                            <div className="space-y-2">
                                <CardTitle className="text-2xl font-black tracking-tight text-amber-900">Lease Signature Required</CardTitle>
                                <CardDescription className="text-lg font-medium text-amber-700/80 leading-relaxed">
                                    Your lease agreement for <span className="font-bold">{property.title}</span> is ready. Review and sign to activate your full tenancy.
                                </CardDescription>
                                <Button size="lg" className="mt-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-bold px-8" asChild>
                                    <Link href={`/student/leases/${lease.id}`}>Review & Sign Now</Link>
                                </Button>
                            </div>
                        </CardHeader>
                    </Card>
                )}

                {lease?.status === 'terminating' && (
                    <Card className="overflow-hidden border-none bg-destructive/10 shadow-xl shadow-destructive/5 backdrop-blur-md text-destructive animate-in slide-in-from-top duration-500">
                        <CardHeader className="flex flex-row items-center gap-6 p-8">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-xl">
                                <AlertTriangle className="h-8 w-8 text-destructive" />
                            </div>
                            <div className="space-y-2 flex-1">
                                <CardTitle className="text-2xl font-black tracking-tight">Tenancy Ending Soon</CardTitle>
                                <CardDescription className="text-lg font-medium text-destructive/80 leading-relaxed">
                                    A termination process has been initiated. You are entitled to a pro-rated refund of <span className="font-bold">{formatPrice(lease.calculatedRefund || 0, property.currency)}</span>.
                                </CardDescription>
                                <Button
                                    size="lg"
                                    className="mt-4 bg-destructive hover:bg-destructive/90 text-white rounded-2xl font-bold px-8"
                                    onClick={handleConfirmCompensation}
                                >
                                    Confirm Refund Received & Vacate
                                </Button>
                            </div>
                        </CardHeader>
                    </Card>
                )}
            </div>

            <Tabs defaultValue="payments" className="w-full max-w-full space-y-6 md:space-y-10">
                <div className="w-full max-w-full overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                    <TabsList className="flex h-12 sm:h-14 md:h-16 w-full md:w-max md:min-w-[700px] gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl md:rounded-[2rem] bg-muted/30 p-1.5 sm:p-2 backdrop-blur-md mx-auto">
                        <TabsTrigger value="payments" className="flex-1 px-2 sm:px-3 md:px-8 rounded-lg sm:rounded-xl md:rounded-[1.5rem] text-[10px] sm:text-xs md:text-sm font-bold tracking-tight transition-all data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary whitespace-nowrap">
                            Pay
                        </TabsTrigger>
                        <TabsTrigger value="lease" className="flex-1 px-2 sm:px-3 md:px-8 rounded-lg sm:rounded-xl md:rounded-[1.5rem] text-[10px] sm:text-xs md:text-sm font-bold tracking-tight transition-all data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary whitespace-nowrap">
                            Lease
                        </TabsTrigger>
                        <TabsTrigger value="contact" className="flex-1 px-2 sm:px-3 md:px-8 rounded-lg sm:rounded-xl md:rounded-[1.5rem] text-[10px] sm:text-xs md:text-sm font-bold tracking-tight transition-all data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary whitespace-nowrap">
                            Info
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="payments" className="space-y-6 md:space-y-10">
                    {/* Payment Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                        <Card className="group relative overflow-hidden border-none bg-white p-4 sm:p-6 md:p-8 shadow-xl shadow-black/[0.02] transition-all hover:shadow-2xl hover:shadow-primary/5">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                            <div className="relative space-y-4">
                                <p className="text-xs font-black uppercase tracking-widest text-primary/60">Next Payment Due</p>
                                <h3 className={cn(
                                    "text-2xl sm:text-3xl font-black tracking-tight break-words",
                                    tenancyState?.isRentDue && tenancyState.isLeaseActive ? "text-destructive" : "text-primary"
                                )}>
                                    {tenancyState?.rentDueDateText || "N/A"}
                                </h3>
                                <p className="text-sm sm:text-base md:text-lg font-bold text-muted-foreground/80">{tenancyState?.rentStatusText || "N/A"}</p>
                            </div>
                        </Card>

                        <Card className="group relative overflow-hidden border-none bg-white p-4 sm:p-6 md:p-8 shadow-xl shadow-black/[0.02] transition-all hover:shadow-2xl hover:shadow-primary/5">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                            <div className="relative space-y-4">
                                <p className="text-xs font-black uppercase tracking-widest text-primary/60">Lease Overview</p>
                                <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground break-words">
                                    {tenancyState?.leaseEndDate ? format(tenancyState.leaseEndDate, 'MMMM do, yyyy') : "N/A"}
                                </h3>
                                <p className="text-sm sm:text-base md:text-lg font-bold text-muted-foreground/80">Scheduled end of tenancy</p>
                            </div>
                        </Card>
                    </div>

                    <Card className="overflow-hidden border-none bg-white shadow-xl shadow-black/[0.02]">
                        <CardHeader className="p-4 sm:p-6 md:p-8 pb-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-2xl font-black tracking-tight">Financial History</CardTitle>
                                    <CardDescription className="text-base font-medium">Detailed log of all your rental payments and deposits.</CardDescription>
                                </div>
                                <Button variant="outline" className="w-full sm:w-auto rounded-2xl font-bold border-muted/50 hover:bg-muted/10 h-12">
                                    Export PDF
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30 border-none">
                                            <TableHead className="px-4 lg:px-8 font-bold text-foreground">Date</TableHead>
                                            <TableHead className="font-bold text-foreground">Type</TableHead>
                                            <TableHead className="text-right font-bold text-foreground">Amount</TableHead>
                                            <TableHead className="text-center font-bold text-foreground px-4 lg:px-8">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions && transactions.length > 0 ? transactions.map((t, idx) => (
                                            <TableRow key={t.id} className="border-muted/10 hover:bg-muted/5 transition-colors">
                                                <TableCell className="px-4 lg:px-8 font-bold text-muted-foreground/80">{format(new Date(t.date), 'MMM dd, yyyy')}</TableCell>
                                                <TableCell className="font-bold">{t.type}</TableCell>
                                                <TableCell className="text-right font-black text-foreground">{formatPrice(t.amount, t.currency)}</TableCell>
                                                <TableCell className="text-center px-4 lg:px-8">
                                                    <Badge className={cn(
                                                        "rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest border-none",
                                                        t.status === 'Completed' ? "bg-green-500/10 text-green-600"
                                                            : t.status === 'Pending' ? "bg-amber-500/10 text-amber-600"
                                                                : "bg-destructive/10 text-destructive"
                                                    )}>
                                                        {t.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-20 text-muted-foreground font-medium">No transactions found.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden divide-y divide-muted/10">
                                {transactions && transactions.length > 0 ? transactions.map((t, idx) => (
                                    <div key={t.id} className="p-4 hover:bg-muted/5 transition-colors">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Date</p>
                                                <p className="font-bold text-sm">{format(new Date(t.date), 'MMM dd, yyyy')}</p>
                                            </div>
                                            <Badge className={cn(
                                                "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border-none",
                                                t.status === 'Completed' ? "bg-green-500/10 text-green-600"
                                                    : t.status === 'Pending' ? "bg-amber-500/10 text-amber-600"
                                                        : "bg-destructive/10 text-destructive"
                                            )}>
                                                {t.status}
                                            </Badge>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Type</p>
                                                <p className="font-bold text-sm">{t.type}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Amount</p>
                                                <p className="font-black text-sm text-foreground">{formatPrice(t.amount, t.currency)}</p>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-20 text-muted-foreground font-medium">No transactions found.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="lease" className="space-y-10">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <Card className="lg:col-span-2 overflow-hidden border-none bg-white shadow-xl shadow-black/[0.02]">
                            <CardHeader className="p-8 border-b border-muted/20 bg-muted/5 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <CardTitle className="text-2xl font-black tracking-tight">Lease Agreement</CardTitle>
                                        <CardDescription className="font-medium">Legally binding terms of your tenancy.</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-green-500/10 text-green-600 border-none font-bold">
                                            Authenticated
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 bg-[#fdfdfd]">
                                <ScrollArea className="h-[600px] w-full p-8 font-serif leading-relaxed text-lg">
                                    <div className="prose prose-lg max-w-none prose-slate whitespace-pre-wrap selection:bg-primary/20">
                                        {lease?.leaseText}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                            <div className="p-8 border-t border-muted/20 bg-muted/5 flex items-center justify-between">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Last updated: {(() => {
                                        const dateValue = lease?.createdAt;
                                        if (!dateValue) return 'N/A';

                                        const d = (dateValue && typeof dateValue.toDate === 'function')
                                            ? dateValue.toDate()
                                            : new Date(dateValue);

                                        return isNaN(d.getTime()) ? 'N/A' : format(d, 'PPP');
                                    })()}
                                </p>
                                <Button variant="outline" className="rounded-2xl font-bold">Download Signed Copy (PDF)</Button>
                            </div>
                        </Card>

                        <div className="space-y-10">
                            <Card className="overflow-hidden border-none bg-white shadow-xl shadow-black/[0.02]">
                                <CardHeader className="p-8">
                                    <CardTitle className="text-xl font-bold tracking-tight">Signatories</CardTitle>
                                </CardHeader>
                                <CardContent className="px-8 pb-8 space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", lease?.tenantSigned ? "bg-green-500/10 text-green-600" : "bg-muted/50 text-muted-foreground")}>
                                            <Signature className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold">Tenant (You)</p>
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{lease?.tenantSigned ? "Signed & Verified" : "Pending Signature"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", lease?.landlordSigned ? "bg-green-500/10 text-green-600" : "bg-muted/50 text-muted-foreground")}>
                                            <Signature className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold">Landlord</p>
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{lease?.landlordSigned ? "Signed & Verified" : "Pending Signature"}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="overflow-hidden border-none bg-primary/5 shadow-xl shadow-primary/5">
                                <CardContent className="p-8 text-center space-y-6">
                                    <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-3xl bg-white shadow-xl">
                                        <FileText className="h-8 w-8 text-primary" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-black text-xl tracking-tight">Need a Change?</h4>
                                        <p className="text-sm font-medium text-muted-foreground/80 leading-relaxed">
                                            &quot;If you need to discuss lease terms or request an amendment, please contact your landlord directly.&quot;
                                        </p>
                                    </div>
                                    <Button variant="outline" className="w-full h-12 rounded-2xl font-bold border-primary/20 text-primary hover:bg-primary/5 transition-all" onClick={handleMessageLandlord}>
                                        Message Landlord
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="contact">
                    {landlord && (
                        <Card className="overflow-hidden border-none bg-white shadow-xl shadow-black/[0.02] max-w-4xl mx-auto">
                            <div className="relative h-48 bg-primary overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-transparent" />
                                <div className="absolute -bottom-12 left-12">
                                    <Avatar className="h-32 w-32 border-8 border-white shadow-2xl">
                                        <AvatarImage src={landlord.profileImageUrl} className="object-cover" />
                                        <AvatarFallback className="bg-muted">
                                            <UserIcon className="h-12 w-12 text-muted-foreground" />
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                            </div>
                            <CardContent className="pt-20 px-6 sm:px-12 pb-12">
                                <div className="space-y-8">
                                    <div className="space-y-2">
                                        <h2 className="text-3xl sm:text-4xl font-black tracking-tight">{landlord.name}</h2>
                                        <div className="text-lg sm:text-xl font-medium text-muted-foreground flex flex-wrap items-center gap-2">
                                            <Badge variant="secondary" className="rounded-full px-4 py-1 font-bold">Property Landlord</Badge>
                                            Verified Account
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                                        <div className="space-y-4">
                                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Contact Email</p>
                                            <p className="text-lg font-bold text-foreground">{landlord.email}</p>
                                        </div>
                                        <div className="space-y-4">
                                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Communication Policy</p>
                                            <p className="text-lg font-bold text-foreground">Standard 24h Response</p>
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t border-muted/20">
                                        <Button size="lg" onClick={handleMessageLandlord} className="w-full sm:w-auto h-16 rounded-2xl px-12 font-black text-xl shadow-2xl shadow-primary/20 transition-all hover:shadow-primary/40 hover:-translate-y-1">
                                            <MessageSquare className="mr-3 h-6 w-6" /> Send Message
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {
                tenancyState && user && lease && (
                    <PaymentDialog
                        isOpen={isPaymentDialogOpen}
                        onClose={() => setIsPaymentDialogOpen(false)}
                        onPaymentSuccess={handlePaymentSuccess}
                        amount={tenancyState.paymentAmount || property.price}
                        tenantName={user.displayName || user.email || ''}
                        tenantId={user.uid}
                        landlordId={property.landlordId}
                        propertyId={property.id}
                        currency={property.currency}
                        destinationAccountId={landlord?.stripeAccountId}
                        metadata={{ type: lease.status === 'pending' ? 'Lease Activation' : 'Rent', leaseId: lease.id }}
                    />
                )
            }
        </div >
    );
}
