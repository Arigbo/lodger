
'use client';

import { useParams } from 'next/navigation';
import type { UserProfile as User, Property, Transaction, LeaseAgreement } from '@/types';


import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Building2, CalendarClock, GraduationCap, Mail, MessageSquare, Phone, User as UserIcon, Wallet } from 'lucide-react';
import { EmptyState, PageHeader, SectionCard, StatCard, StatusBadge } from '@/components/dashboard';
import Link from 'next/link';
import { format, differenceInDays, isPast, addMonths } from "date-fns";
import { formatPrice } from '@/lib/utils';
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
import React from "react";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { PageSkeleton } from "@/components/dashboard/skeletons";


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
            where('status', 'in', ['active', 'terminating'])
        );
    }, [id, currentUser, firestore]);
    const { data: leases, isLoading: areLeasesLoading } = useCollection<LeaseAgreement>(leaseQuery);
    const lease = leases?.[0];

    const propertyRef = useMemoFirebase(() => lease ? doc(firestore, 'properties', lease.propertyId) : null, [lease, firestore]);
    const { data: property, isLoading: isPropertyLoading } = useDoc<Property>(propertyRef);

    const transactionsQuery = useMemoFirebase(
        () => tenant && currentUser
            ? query(collection(firestore, 'transactions'), where('tenantId', '==', tenant.id), where('landlordId', '==', currentUser.uid))
            : null,
        [tenant, currentUser, firestore],
    );
    const { data: tenantTransactions, isLoading: areTransactionsLoading } = useCollection<Transaction>(transactionsQuery);
    const { toast } = useToast();

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
                    title: "Tenancy ending",
                    description: `The tenant has been notified. A 3-day grace period has started for the refund of ${formatPrice(rentStatus.calculatedRefund, property.currency)}.`,
                });
            } else {
                // Rent is due - still use terminating status, not immediate expiration
                // Tenant must confirm even if no refund is owed
                await updateDocumentNonBlocking(leaseRef, {
                    status: 'terminating',
                    terminationGracePeriodEnd: new Date().toISOString(), // No grace period for overdue rent
                    calculatedRefund: 0
                });

                // Notify tenant
                await import('@/lib/notifications').then(({ sendNotification }) => {
                    sendNotification({
                        toUserId: tenant.id,
                        type: 'TENANCY_TERMINATING',
                        firestore: firestore,
                        propertyName: property.title,
                        link: `/student/tenancy/${property.id}`,
                        customMessage: `Landlord has ended the tenancy due to overdue rent. Please vacate the property.`
                    });
                });

                toast({
                    title: "Tenancy ending",
                    description: "The tenant has been notified. Tenancy will be finalized once tenant confirms.",
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

    type RentStatus = {
        status: 'Paid' | 'Due' | 'Inactive';
        text: string;
        isLeaseActive: boolean;
        isLeaseEndingSoon: boolean;
        leaseEndDate: Date | null;
        leaseDaysRemaining: number;
        calculatedRefund: number;
    };

    // Rent status and pro-rated refund, derived from the lease and payments
    // (cheap to compute, so it is simply recalculated on render).
    const getRentStatus = (): RentStatus | null => {
        if (!lease || !property || !tenantTransactions) {
            if (areLeasesLoading || isPropertyLoading) return null;
            return {
                    status: 'Inactive',
                    text: 'No active lease',
                    isLeaseActive: false,
                    isLeaseEndingSoon: false,
                    leaseEndDate: null,
                    leaseDaysRemaining: 0,
                    calculatedRefund: 0,
                };
        }

        const today = new Date();
        const leaseStartDate = new Date(lease.startDate);
        const leaseEndDate = new Date(lease.endDate);

        const lastRentPayment = tenantTransactions
            .filter(t => t.type === 'Rent' && t.status === 'Completed')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        const isLeaseActive = lease.status === 'active' || lease.status === 'terminating';

        let nextRentDueDate: Date = leaseStartDate;
        let status: 'Paid' | 'Due' | 'Inactive' = 'Inactive';
        let text = 'Lease Inactive';

        if (isLeaseActive) {
            if (lastRentPayment) {
                const monthsPaid = lastRentPayment.months || lastRentPayment.monthsPaid || 1;
                nextRentDueDate = addMonths(new Date(lastRentPayment.date), monthsPaid);
            } else {
                nextRentDueDate = leaseStartDate;
            }

            // If tenant has prepaid rent (nextRentDueDate is in future), lease stays active
            // This handles the scenario where tenant pays beyond the lease period
            if (isPast(nextRentDueDate)) {
                status = 'Due';
                text = `Due on ${format(nextRentDueDate, 'MMM do, yyyy')}`;
            } else {
                status = 'Paid';
                text = `Next due on ${format(nextRentDueDate, 'MMM do, yyyy')}`;
                // Note: Even if official lease end date has passed, if rent is prepaid,
                // tenant has right to stay until prepaid period ends
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

        return {
            status,
            text,
            isLeaseActive,
            isLeaseEndingSoon,
            leaseEndDate,
            leaseDaysRemaining,
            calculatedRefund,
        };
    };
    const rentStatus = getRentStatus();
    const isLoading = isUserLoading || isTenantLoading || areLeasesLoading || isPropertyLoading || areTransactionsLoading || !rentStatus;

    if (isLoading) return <PageSkeleton variant="detail" />;

    if (!tenant) {
        return (
            <EmptyState
                icon={UserIcon}
                title="Tenant not found"
                description="Their profile could not be loaded."
                action={
                    <Button asChild variant="outline" className="rounded-xl">
                        <Link href="/landlord/tenants">All tenants</Link>
                    </Button>
                }
            />
        );
    }

    const payments = [...(tenantTransactions ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const isEnding = lease?.status === 'terminating';

    return (
        <div className="space-y-6">
            <PageHeader
                back={{ href: '/landlord/tenants', label: 'Tenants' }}
                title={tenant.name}
                description={property ? `Renting ${property.title}` : 'No active tenancy with you'}
                actions={
                    <Button asChild variant="outline" className="rounded-xl">
                        <Link href={`/landlord/messages?conversationId=${tenant.id}`}>
                            <MessageSquare className="mr-1.5 h-4 w-4" /> Message
                        </Link>
                    </Button>
                }
            />

            {isEnding && lease && (
                <div role="status" className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                    <AlertTriangle aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>
                        <span className="font-semibold">This tenancy is ending.</span>{' '}
                        {lease.calculatedRefund
                            ? `Refund owed: ${formatPrice(lease.calculatedRefund, property?.currency)}. `
                            : ''}
                        The tenant has been asked to confirm
                        {lease.terminationGracePeriodEnd ? ` by ${format(new Date(lease.terminationGracePeriodEnd), 'd MMM yyyy')}` : ''}.
                    </p>
                </div>
            )}

            <div className="grid items-start gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    {property && rentStatus ? (
                        <div className="grid gap-4 sm:grid-cols-3">
                            <StatCard
                                label="Rent"
                                value={rentStatus.status === 'Due' ? 'Overdue' : rentStatus.status === 'Paid' ? 'Paid up' : 'Inactive'}
                                icon={Wallet}
                                tone={rentStatus.status === 'Due' ? 'danger' : 'success'}
                                hint={rentStatus.text}
                            />
                            <StatCard label="Monthly rent" value={formatPrice(property.price, property.currency)} icon={Building2} hint={property.title} />
                            <StatCard
                                label="Lease ends"
                                value={rentStatus.leaseEndDate ? format(rentStatus.leaseEndDate, 'd MMM yyyy') : '—'}
                                icon={CalendarClock}
                                tone={rentStatus.isLeaseEndingSoon ? 'warning' : 'default'}
                                hint={rentStatus.isLeaseEndingSoon ? `${rentStatus.leaseDaysRemaining} days left` : undefined}
                            />
                        </div>
                    ) : (
                        <EmptyState icon={Building2} title="No active tenancy" description="This person isn't currently renting one of your properties." />
                    )}

                    <SectionCard title="Payment history" description={`${payments.length} payment${payments.length === 1 ? '' : 's'} from this tenant`}>
                        {payments.length ? (
                            <ul className="divide-y">
                                {payments.map((t) => (
                                    <li key={t.id}>
                                        <Link href={`/landlord/transactions/${t.id}`} className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-accent/40">
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm font-medium">{t.type === 'Lease Activation' ? 'First payment' : t.type}</span>
                                                <span className="block text-xs text-muted-foreground">{format(new Date(t.date), 'd MMM yyyy')}</span>
                                            </span>
                                            <span className="text-sm font-semibold">{formatPrice(t.amount, t.currency)}</span>
                                            <StatusBadge status={t.status} />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="px-5 py-8 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
                        )}
                    </SectionCard>
                </div>

                <div className="space-y-6">
                    <SectionCard title="Contact" bodyClassName="space-y-4 p-5">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={tenant.profileImageUrl} alt="" className="object-cover" />
                                <AvatarFallback className="bg-primary/10 font-semibold text-primary">{tenant.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="truncate font-semibold">{tenant.name}</p>
                                {tenant.school && (
                                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                        <GraduationCap aria-hidden className="h-3.5 w-3.5" /> {tenant.school}
                                    </p>
                                )}
                            </div>
                        </div>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-center gap-2">
                                <Mail aria-hidden className="h-4 w-4 text-muted-foreground" />
                                <a href={`mailto:${tenant.email}`} className="truncate hover:underline">{tenant.email}</a>
                            </li>
                            {tenant.phone && (
                                <li className="flex items-center gap-2">
                                    <Phone aria-hidden className="h-4 w-4 text-muted-foreground" />
                                    <a href={`tel:${tenant.phone}`} className="hover:underline">{tenant.phone}</a>
                                </li>
                            )}
                        </ul>
                    </SectionCard>

                    {lease && (
                        <SectionCard title="Lease" action={{ href: `/landlord/leases/${lease.id}`, label: 'Open' }} bodyClassName="space-y-2 p-5 text-sm">
                            <p className="flex justify-between"><span className="text-muted-foreground">Status</span> <StatusBadge status={lease.status} /></p>
                            <p className="flex justify-between"><span className="text-muted-foreground">Started</span> {format(new Date(lease.startDate), 'd MMM yyyy')}</p>
                            <p className="flex justify-between"><span className="text-muted-foreground">Ends</span> {format(new Date(lease.endDate), 'd MMM yyyy')}</p>
                        </SectionCard>
                    )}

                    {property && rentStatus?.isLeaseActive && !isEnding && (
                        <section className="rounded-2xl border border-destructive/30 bg-card p-5">
                            <h2 className="font-semibold text-destructive">End tenancy</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Ends the lease early. The tenant is notified and asked to confirm.
                            </p>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" className="mt-4 w-full rounded-lg border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                                        End tenancy…
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-2xl">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>End {tenant.name}&apos;s tenancy?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {rentStatus.status === 'Paid'
                                                ? 'Rent is paid ahead, so you owe a pro-rated refund for the unused period. The tenant has 3 days to confirm they received it.'
                                                : 'Rent is overdue, so no refund is owed. The tenant will be asked to confirm and vacate.'}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="rounded-xl border bg-muted/40 p-4">
                                        <p className="text-sm text-muted-foreground">Refund you&apos;ll owe</p>
                                        <p className="text-2xl font-bold">{formatPrice(rentStatus.calculatedRefund, property.currency)}</p>
                                    </div>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleEndTenancy} className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                            End tenancy
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
