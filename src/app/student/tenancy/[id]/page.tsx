
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
    // 2. OR User has a valid lease for this property (fetched above)
    // 3. OR User is just a viewer? No, tenancy page implies tenancy.
    const isTenant = user?.uid === property?.currentTenantId || (lease && lease.tenantId === user?.uid);

    if (!property || !isTenant) {
        if (!isLoading) notFound();
        return null;
    }

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

    const handleMessageLandlord = () => {
        if (landlord) {
            router.push(`/student/messages?contact=${landlord.id}`);
        }
    };

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
                            Pay {formatPrice(property.price)} Now
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
                                    <Button onClick={() => setIsPaymentDialogOpen(true)}>Pay Now {formatPrice(tenancyState.paymentAmount)}</Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions && transactions.length > 0 ? transactions.map(t => (
                                        <TableRow key={t.id}>
                                            <TableCell>{format(new Date(t.date), 'MMM dd, yyyy')}</TableCell>
                                            <TableCell>{t.type}</TableCell>
                                            <TableCell className="text-right">{formatPrice(t.amount)}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={
                                                    t.status === 'Completed' ? 'secondary'
                                                        : t.status === 'Pending' ? 'default'
                                                            : 'destructive'
                                                }>
                                                    {t.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24">No transactions found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
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
                                        <DialogContent className="max-w-3xl">
                                            <DialogHeader>
                                                <DialogTitle>Lease Agreement</DialogTitle>
                                                <DialogDescription>
                                                    This is the lease agreement for {property.title}.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <ScrollArea className="max-h-[60vh] rounded-md border p-4">
                                                <div className="prose prose-sm whitespace-pre-wrap">{lease.leaseText}</div>
                                            </ScrollArea>
                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button>Close</Button>
                                                </DialogClose>
                                            </DialogFooter>
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
                />
            )}
        </div>
    );
}
