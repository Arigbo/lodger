
'use client';

import { notFound, useParams } from 'next/navigation';
import type { UserProfile as User, Property, Transaction, LeaseAgreement } from '@/types';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Phone, Mail, AlertTriangle, Coins, Pencil, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { format, differenceInDays, isPast, addMonths, differenceInMonths } from "date-fns";
import { cn, formatPrice } from '@/utils';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import React, { useEffect, useState } from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import Loading from '@/app/loading';


export default function TenantDetailPage() {
    const params = useParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;

    const { user: currentUser, isUserLoading } = useUser();
    const firestore = useFirestore();

    const tenantRef = useMemoFirebase(() => id ? doc(firestore, 'users', id) : null, [firestore, id]);
    const { data: tenant, isLoading: isTenantLoading } = useDoc<User>(tenantRef);

    const leaseQuery = useMemoFirebase(() => {
        if (!id || !currentUser) return null;
        return query(
            collection(firestore, 'leaseAgreements'),
            where('tenantId', '==', id),
            where('landlordId', '==', currentUser.uid),
            where('status', '==', 'active')
        );
    }, [id, currentUser, firestore]);
    const { data: leases, isLoading: areLeasesLoading } = useCollection<LeaseAgreement>(leaseQuery);
    const lease = leases?.[0];

    const propertyRef = useMemoFirebase(() => lease ? doc(firestore, 'properties', lease.propertyId) : null, [lease, firestore]);
    const { data: property, isLoading: isPropertyLoading } = useDoc<Property>(propertyRef);

    const transactionsQuery = useMemoFirebase(() => tenant ? query(collection(firestore, 'transactions'), where('tenantId', '==', tenant.id)) : null, [tenant, firestore]);
    const { data: tenantTransactions, isLoading: areTransactionsLoading } = useCollection<Transaction>(transactionsQuery);
    const { toast } = useToast();

    const [rentStatus, setRentStatus] = useState<{
        status: 'Paid' | 'Due' | 'Inactive';
        text: string;
        isLeaseActive: boolean;
        isLeaseEndingSoon: boolean;
        leaseEndDate: Date | null;
        leaseDaysRemaining: number;
        compassionFee: number;
    } | null>(null);

    const handleEndTenancy = async () => {
        if (!lease || !property || !tenant || !rentStatus) return;

        try {
            const leaseRef = doc(firestore, 'leaseAgreements', lease.id);

            if (rentStatus.status === 'Paid') {
                // Initiating termination with refund and grace period
                const gracePeriodEnd = new Date();
                gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);

                await updateDocumentNonBlocking(leaseRef, {
                    status: 'terminating',
                    terminationGracePeriodEnd: gracePeriodEnd.toISOString(),
                    calculatedRefund: rentStatus.calculatedRefund
                });

                // Notify tenant
                await import('@/lib/notifications').then(({ sendNotification }) => {
                    sendNotification({
                        toUserId: tenant.id,
                        type: 'TENANCY_TERMINATING',
                        firestore: firestore,
                        propertyName: property.title,
                        link: `/student/tenancy/${property.id}`,
                        customMessage: `Landlord has requested to end the tenancy. A refund of ${formatPrice(rentStatus.calculatedRefund, property.currency)} has been calculated. Please confirm receipt of compensation within 3 days.`
                    });
                });

                toast({
                    title: "Termination Initiated",
                    description: `The tenant has been notified. A 3-day grace period has started for the refund of ${formatPrice(rentStatus.calculatedRefund, property.currency)}.`,
                });
            } else {
                // Rent is due or tenancy inactive, end immediately
                await updateDocumentNonBlocking(leaseRef, {
                    status: 'expired',
                    endDate: new Date().toISOString()
                });

                const propertyDocRef = doc(firestore, 'properties', property.id);
                await updateDocumentNonBlocking(propertyDocRef, {
                    status: 'available',
                    currentTenantId: null,
                    leaseStartDate: null
                });

                toast({
                    title: "Tenancy Ended",
                    description: "The tenancy has been successfully terminated as rent was overdue.",
                });
            }
        } catch (error) {
            console.error("Error ending tenancy:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not end tenancy. Please try again.",
            });
        }
    };

    useEffect(() => {
        if (!lease || !property || !tenantTransactions) {
            if (!areLeasesLoading && !isPropertyLoading) {
                setRentStatus({
                    status: 'Inactive',
                    text: 'No active lease',
                    isLeaseActive: false,
                    isLeaseEndingSoon: false,
                    leaseEndDate: null,
                    leaseDaysRemaining: 0,
                    compassionFee: 0,
                });
            }
            return;
        };

        const today = new Date();
        const leaseStartDate = new Date(lease.startDate);
        const leaseEndDate = new Date(lease.endDate);

        const lastRentPayment = tenantTransactions
            .filter(t => t.type === 'Rent' && t.status === 'Completed')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        const isLeaseActive = lease.status === 'active' || lease.status === 'terminating';

        let nextRentDueDate: Date;
        let status: 'Paid' | 'Due' | 'Inactive' = 'Inactive';
        let text = 'Lease Inactive';

        if (isLeaseActive) {
            if (lastRentPayment) {
                const monthsPaid = (lastRentPayment as any).months || 1;
                nextRentDueDate = addMonths(new Date(lastRentPayment.date), monthsPaid);
            } else {
                nextRentDueDate = leaseStartDate;
            }

            if (isPast(nextRentDueDate)) {
                status = 'Due';
                text = `Due on ${format(nextRentDueDate, 'MMM do, yyyy')}`;
            } else {
                status = 'Paid';
                text = `Next due on ${format(nextRentDueDate, 'MMM do, yyyy')}`;
            }
        }

        const leaseDaysRemaining = differenceInDays(leaseEndDate, today);
        const isLeaseEndingSoon = isLeaseActive && leaseDaysRemaining <= 90;

        // Pro-rated Refund Calculation
        let calculatedRefund = 0;
        if (status === 'Paid' && isLeaseActive) {
            const dailyRate = property.price / 30;
            const totalDaysRemaining = differenceInDays(nextRentDueDate, today);
            if (totalDaysRemaining > 0) {
                const fullMonths = Math.floor(totalDaysRemaining / 30);
                const remainingDays = totalDaysRemaining % 30;
                calculatedRefund = (fullMonths * property.price) + (remainingDays * dailyRate);
            }
        }

        setRentStatus({
            status,
            text,
            isLeaseActive,
            isLeaseEndingSoon,
            leaseEndDate,
            leaseDaysRemaining,
            calculatedRefund
        });

    }, [lease, property, tenantTransactions, areLeasesLoading, isPropertyLoading]);

    const isLoading = isUserLoading || isTenantLoading || areLeasesLoading || isPropertyLoading || areTransactionsLoading || !rentStatus;

    if (isLoading) {
        return <Loading />;
    }

    if (!isTenantLoading && !tenant) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-20">
                <div className="rounded-full bg-secondary p-4">
                    <UserIcon className="h-10 w-10 text-muted-foreground" />
                </div>
                <h1 className="mt-6 text-2xl font-bold">Tenant Not Found</h1>
                <p className="mt-2 text-muted-foreground">The user you are looking for does not exist or their profile could not be loaded.</p>
                <Button asChild className="mt-6">
                    <Link href="/landlord/tenants">Back to All Tenants</Link>
                </Button>
            </div>
        );
    }


    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-3xl font-bold">Tenant Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-6">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={tenant?.profileImageUrl} alt={tenant?.name} />
                            <AvatarFallback>
                                <UserIcon className="h-12 w-12 text-muted-foreground" />
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="text-2xl font-bold">{tenant?.name}</h2>
                            <p className="text-muted-foreground">{tenant?.role}</p>
                        </div>
                    </div>
                    <Separator className="my-6" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <a href={`mailto:${tenant?.email}`} className="text-primary hover:underline">{tenant?.email}</a>
                        </div>
                        {tenant?.phone && (
                            <div className="flex items-center gap-3">
                                <Phone className="h-5 w-5 text-muted-foreground" />
                                <span>{tenant?.phone}</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {property && rentStatus ? (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>Tenancy Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="rounded-lg border bg-secondary/50 p-4">
                                    <p className="text-sm font-medium text-muted-foreground">Rented Property</p>
                                    <Link href={`/landlord/properties/${property.id}`} className="text-lg font-bold text-primary hover:underline">{property.title}</Link>
                                </div>
                                <div className="rounded-lg border bg-secondary/50 p-4">
                                    <p className="text-sm font-medium text-muted-foreground">Rent Status</p>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={rentStatus.status === 'Due' ? 'destructive' : rentStatus.status === 'Paid' ? 'secondary' : 'outline'}>{rentStatus.status}</Badge>
                                        <p className="text-sm">
                                            {rentStatus.text}
                                        </p>
                                    </div>
                                </div>
                                <div className={cn("rounded-lg border p-4 col-span-full", rentStatus.isLeaseEndingSoon ? "border-amber-500/50 bg-amber-50" : "bg-secondary/50")}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Lease End Date</p>
                                            <p className={cn("text-xl font-bold", rentStatus.isLeaseEndingSoon && "text-amber-600")}>{rentStatus.leaseEndDate && format(rentStatus.leaseEndDate, 'MMMM do, yyyy')}</p>
                                            {rentStatus.isLeaseEndingSoon && <p className="text-xs text-amber-500 mt-1">{rentStatus.leaseDaysRemaining} days remaining</p>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {rentStatus.isLeaseEndingSoon && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                                            <Button variant="outline" disabled><Pencil className="mr-2 h-4 w-4" /> Edit Lease</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Landlord Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2 sm:flex-row">
                            <Button variant="outline" asChild>
                                <Link href={`/landlord/messages?conversationId=${tenant?.id}`}>
                                    <Mail className="mr-2 h-4 w-4" /> Message Tenant
                                </Link>
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" disabled={!rentStatus.isLeaseActive || lease?.status === 'terminating'}>
                                        {lease?.status === 'terminating' ? 'Termination Pending' : 'End Tenancy'}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>End Tenancy for {tenant?.name}?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Ending the tenancy will terminate the lease before its official end date. This action can have legal implications. You will be charged a compassion fee calculated based on the remaining lease term.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <Card className="my-4">
                                        <CardHeader className="flex-row items-center justify-between">
                                            <CardTitle>Compassion Fee</CardTitle>
                                            <Coins className="h-6 w-6 text-muted-foreground" />
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-3xl font-bold text-destructive">{formatPrice(rentStatus.calculatedRefund, property.currency)}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Pro-rated based on days remaining in current paid period + any prepaid full months.
                                            </p>
                                        </CardContent>
                                    </Card>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleEndTenancy} className="bg-destructive hover:bg-destructive/90">Confirm & End Tenancy</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>No Active Tenancy</CardTitle>
                        <CardDescription>This user is not currently renting any of your properties.</CardDescription>
                    </CardHeader>
                </Card>
            )}
        </div>
    );
}
