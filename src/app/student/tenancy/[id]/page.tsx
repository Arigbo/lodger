
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
import { AlertTriangle, FileText, User as UserIcon, MessageSquare } from "lucide-react";
import { FaFileSignature as Signature } from "react-icons/fa";

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
    } | null>(null);
    const { toast } = useToast();

    const handlePaymentSuccess = async () => {
        console.log("Payment successful!");
        if (!lease || !property || !user) return;

        try {
            // 1. Activate Lease
            const leaseRef = doc(firestore, 'leaseAgreements', lease.id);
            await updateDoc(leaseRef, { status: 'active' });

            // 2. Update Property to Occupied
            const propertyRef = doc(firestore, 'properties', property.id);
            await updateDoc(propertyRef, {
                status: 'occupied',
                currentTenantId: user.uid,
                leaseStartDate: new Date().toISOString(),
            });

            // 3. Notify Landlord
            await import('@/lib/notifications').then(({ sendNotification }) => {
                sendNotification({
                    toUserId: lease.landlordId,
                    type: 'LEASE_SIGNED',
                    firestore: firestore,
                    propertyName: property.title,
                    link: `/landlord/leases/${lease.id}`,
                    customMessage: `${user.displayName || 'Tenant'} has signed the lease and paid the first month's rent.`
                });
            });

            // Refresh state
            window.location.reload();

        } catch (error) {
            console.error("Error finalizing tenancy:", error);
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
        const today = new Date();
        const leaseStartDate = property?.leaseStartDate ? new Date(property.leaseStartDate) : new Date();
        const leaseEndDate = add(leaseStartDate, { years: 1 });
        const lastRentPayment = tenantTransactions
            .filter(t => t.type === 'Rent' && t.status === 'Completed')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        const isLeaseActive = lease?.status === 'active';
        const isLeaseExpired = isPast(leaseEndDate);

        let nextRentDueDate: Date;
        let isRentDue = false;
        let rentDueDateText = "N/A";
        let rentStatusText: string;

        if (isLeaseActive) {
            if (lastRentPayment) {
                nextRentDueDate = add(new Date(lastRentPayment.date), { months: 1 });
                isRentDue = isPast(nextRentDueDate);
            } else {
                nextRentDueDate = leaseStartDate;
                isRentDue = isPast(leaseStartDate);
            }
            rentDueDateText = format(nextRentDueDate, 'MMMM do, yyyy');
            rentStatusText = isRentDue ? 'Rent is due on' : 'Rent will be due on';
        } else {
            rentStatusText = lease?.status === 'pending' ? 'Lease Pending Signature' : 'Lease Inactive';
        }

        const hasPendingPayments = tenantTransactions.some(t => t.status === 'Pending');
        const showPayButton = isLeaseActive && (isRentDue || hasPendingPayments);
        let paymentAmount = 0;
        if (isRentDue) {
            paymentAmount = property?.price || 0;
        }

        setTenancyState({
            showPayButton,
            paymentAmount,
            leaseEndDate,
            leaseStartDate,
            isLeaseActive,
            isLeaseExpired,
            isRentDue,
            rentStatusText,
            rentDueDateText,
        });
    }, [transactions, lease, property, areTransactionsLoading, isLeaseLoading]);

    const isLoading = isUserLoading || isPropertyLoading || isLandlordLoading || !tenancyState;

    if (isLoading) {
        return <TenancySkeleton />;
    }

    // Allow access if:
    // 1. User is the current tenant (property.currentTenantId)
    // 2. AND the lease is NOT expired (as per user feedback)
    const isTenant = user?.uid === property?.currentTenantId && lease?.status !== 'expired';

    if (!property || !isTenant) {
        if (!isLoading) notFound();
        return null;
    }



    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-headline text-3xl font-bold">My Tenancy</h1>
                <p className="text-muted-foreground">Manage your current rental agreement and payments for {property.title}.</p>
            </div>
            <Separator />

            {lease?.status === 'pending' && !tenancyState?.isLeaseActive && (
                <Card className="border-green-500/50 bg-green-50 mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-700">
                            Please Complete Payment
                        </CardTitle>
                        <CardDescription>
                            Your lease is signed! Please pay the first month's rent to finalize your tenancy.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button size="lg" onClick={() => setIsPaymentDialogOpen(true)}>
                            Pay {formatPrice(property.price, property.currency)} Now
                        </Button>
                    </CardContent>
                </Card>
            )}

            {lease?.status === 'terminating' && (
                <Card className="border-destructive/50 bg-destructive/5 mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" /> Tenancy Termination Initiated
                        </CardTitle>
                        <CardDescription>
                            The landlord has requested to end your tenancy. You are entitled to a pro-rated refund.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-lg bg-background border gap-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Calculated Refund</p>
                                <p className="text-2xl font-bold text-primary">{formatPrice(lease.calculatedRefund || 0, property.currency)}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Grace Period Ends</p>
                                <p className="text-md font-semibold text-amber-600">
                                    {lease.terminationGracePeriodEnd ? format(new Date(lease.terminationGracePeriodEnd), 'MMMM do, p') : 'N/A'}
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground italic">
                            By clicking below, you confirm that you have received the compensation mentioned above or have agreed to alternative terms with the landlord. If no action is taken by the deadline, you will be automatically removed.
                        </p>
                        <Button variant="destructive" className="w-full" onClick={handleConfirmCompensation}>
                            Confirm Compensation Received
                        </Button>
                    </CardContent>
                </Card>
            )}

            {lease?.status === 'pending' && !lease.tenantSigned && (
                <Card className="border-amber-500/50 bg-amber-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-700">
                            <AlertTriangle /> Action Required
                        </CardTitle>
                        <CardDescription>
                            Your lease agreement is ready for review. Please sign the lease to activate your tenancy and enable payments.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href={`/student/leases/${lease.id}`}>
                                <Signature className="mr-2 h-4 w-4" /> Review & Sign Lease
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            )}

            <Tabs defaultValue="payments" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="payments">Payments</TabsTrigger>
                    <TabsTrigger value="lease">Lease Info</TabsTrigger>
                    <TabsTrigger value="contact">Contact</TabsTrigger>
                </TabsList>
                <TabsContent value="payments">
                    <Card className="mt-2">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Payment History</CardTitle>
                                    <CardDescription>Review your past transactions.</CardDescription>
                                </div>
                                {tenancyState?.showPayButton && tenancyState.paymentAmount > 0 && (
                                    <Button onClick={() => setIsPaymentDialogOpen(true)}>Pay Now {formatPrice(tenancyState.paymentAmount, property.currency)}</Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-2 sm:p-6">
                            <div className="overflow-x-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-xs sm:text-sm whitespace-nowrap">Date</TableHead>
                                            <TableHead className="text-xs sm:text-sm whitespace-nowrap">Type</TableHead>
                                            <TableHead className="text-xs sm:text-sm whitespace-nowrap text-right">Amount</TableHead>
                                            <TableHead className="text-xs sm:text-sm whitespace-nowrap text-center">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions && transactions.length > 0 ? transactions.map(t => (
                                            <TableRow key={t.id}>
                                                <TableCell className="text-xs sm:text-sm py-2 sm:py-4 whitespace-nowrap">{format(new Date(t.date), 'MMM dd, yyyy')}</TableCell>
                                                <TableCell className="text-xs sm:text-sm py-2 sm:py-4">{t.type}</TableCell>
                                                <TableCell className="text-xs sm:text-sm py-2 sm:py-4 text-right whitespace-nowrap">{formatPrice(t.amount, t.currency)}</TableCell>
                                                <TableCell className="text-xs sm:text-sm py-2 sm:py-4 text-center">
                                                    <Badge variant={
                                                        t.status === 'Completed' ? 'secondary'
                                                            : t.status === 'Pending' ? 'default'
                                                                : 'destructive'
                                                    } className="text-xs">
                                                        {t.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center h-16 sm:h-24 text-xs sm:text-sm">No transactions found.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="lease">
                    <Card className="mt-2">
                        <CardHeader>
                            <CardTitle>Lease Information</CardTitle>
                            <CardDescription>Key dates and details about your tenancy.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className={cn("text-xl font-bold", tenancyState?.isRentDue && tenancyState.isLeaseActive ? "text-destructive" : "text-primary")}>
                                            {tenancyState?.rentDueDateText || "N/A"}
                                        </CardTitle>
                                        <CardDescription>{tenancyState?.rentStatusText || "N/A"}</CardDescription>
                                    </CardHeader>
                                </Card>
                                <Card className={cn(tenancyState?.isLeaseExpired ? "border-destructive/50 bg-destructive/5" : "")}>
                                    <CardHeader>
                                        <CardTitle className={cn("text-xl font-bold", tenancyState?.isLeaseExpired && "text-destructive")}>
                                            {tenancyState?.leaseEndDate ? format(tenancyState.leaseEndDate, 'MMMM do, yyyy') : "N/A"}
                                        </CardTitle>
                                        <CardDescription>{tenancyState?.isLeaseExpired ? "Lease Expired On" : "Lease End Date"}</CardDescription>
                                    </CardHeader>
                                </Card>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <h4 className="font-semibold">Lease Started</h4>
                                    <p className="text-sm text-muted-foreground">{tenancyState?.leaseStartDate ? format(tenancyState.leaseStartDate, 'MMMM do, yyyy') : "N/A"}</p>
                                </div>

                                {lease && (
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline"><FileText className="mr-2 h-4 w-4" /> View Lease Agreement</Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-2xl w-full h-[100dvh] sm:h-auto overflow-y-auto flex flex-col p-0 sm:p-6 gap-0 sm:gap-4">
                                            <div className="p-6 sm:p-0">
                                                <DialogHeader>
                                                    <DialogTitle>Lease Agreement</DialogTitle>
                                                    <DialogDescription>
                                                        This is the lease agreement for {property.title}.
                                                    </DialogDescription>
                                                </DialogHeader>
                                            </div>
                                            <div className="flex-1 overflow-hidden px-6 sm:px-0 pb-6 sm:pb-0">
                                                <ScrollArea className="h-full sm:h-[60vh] rounded-md border p-4 bg-muted/50">
                                                    <div className="prose prose-sm whitespace-pre-wrap max-w-none">{lease.leaseText}</div>
                                                </ScrollArea>
                                            </div>
                                            <div className="p-6 sm:p-0 border-t sm:border-none mt-auto">
                                                <DialogFooter>
                                                    <DialogClose asChild>
                                                        <Button className="w-full sm:w-auto text-lg py-6 sm:py-2">Close</Button>
                                                    </DialogClose>
                                                </DialogFooter>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="contact">
                    {landlord && (
                        <Card className="mt-2">
                            <CardHeader>
                                <CardTitle>Contact Your Landlord</CardTitle>
                                <CardDescription>Get in touch with {landlord.name} regarding your tenancy.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center text-center">
                                <Avatar className="h-24 w-24 mx-auto mb-4">
                                    <AvatarImage src={landlord.profileImageUrl} />
                                    <AvatarFallback>
                                        <UserIcon className="h-12 w-12 text-muted-foreground" />
                                    </AvatarFallback>
                                </Avatar>
                                <p className="font-semibold">{landlord.name}</p>
                                <p className="text-sm text-muted-foreground">{landlord.email}</p>
                                <Separator className="my-6" />
                                <Button onClick={handleMessageLandlord} className="w-full max-w-sm">
                                    <MessageSquare className="mr-2 h-4 w-4" /> Start Conversation
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {tenancyState && user && (
                <PaymentDialog
                    isOpen={isPaymentDialogOpen}
                    onClose={() => setIsPaymentDialogOpen(false)}
                    onPaymentSuccess={handlePaymentSuccess}
                    amount={tenancyState.paymentAmount}
                    tenantName={user.displayName || user.email || ''}
                    tenantId={user.uid}
                    landlordId={property.landlordId}
                    propertyId={property.id}
                    currency={property.currency}
                    destinationAccountId={landlord?.stripeAccountId}
                />
            )}
        </div>
    );
}
