

'use client';

import { notFound, useParams } from 'next/navigation';
import { getUserById, getPropertiesByTenant, getTransactionsByTenantId } from '@/lib/data';
import type { User, Property } from '@/lib/definitions';
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
import { Phone, Mail, AlertTriangle, Coins, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { add, format, differenceInDays, isPast, isBefore } from 'date-fns';
import { cn, formatPrice } from '@/lib/utils';
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
import React from 'react';

// Mock current user
const useUser = () => {
    // This page is for landlords viewing tenants, so we mock a landlord.
    const user = getUserById('user-1');
    return { user };
};

export default function TenantDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const { user: currentUser } = useUser();
  const tenant = getUserById(id);
  const rentedProperties = tenant ? getPropertiesByTenant(tenant.id) : [];

  if (!tenant || !currentUser || currentUser.role !== 'landlord' || rentedProperties.length === 0) {
    notFound();
  }

  const property = rentedProperties[0]; // Assuming one tenant rents one property for this view
  const tenantTransactions = getTransactionsByTenantId(tenant.id);

  // --- DATE & PAYMENT CALCULATIONS ---
  const today = new Date();
  const leaseStartDate = property.leaseStartDate ? new Date(property.leaseStartDate) : new Date();
  const leaseEndDate = add(leaseStartDate, { years: 1 });
  
  const lastRentPayment = tenantTransactions
    .filter(t => t.type === 'Rent' && t.status === 'Completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  const isLeaseActive = isPast(leaseStartDate) && isBefore(today, leaseEndDate);
  
  let nextRentDueDate: Date;
  let isRentDue = false;

  if (isLeaseActive) {
    if (lastRentPayment) {
        nextRentDueDate = add(new Date(lastRentPayment.date), { months: 1 });
        isRentDue = isPast(nextRentDueDate);
    } else {
        nextRentDueDate = leaseStartDate;
        isRentDue = isPast(leaseStartDate);
    }
  } else {
    nextRentDueDate = leaseStartDate;
  }
  
  const leaseDaysRemaining = differenceInDays(leaseEndDate, today);
  const isLeaseEndingSoon = isLeaseActive && leaseDaysRemaining <= 90;
  
  // Compassion Calculation
  const monthsBetween = (start: Date, end: Date) => {
    let months;
    months = (end.getFullYear() - start.getFullYear()) * 12;
    months -= start.getMonth();
    months += end.getMonth();
    return months <= 0 ? 0 : months;
  }
  const monthsRemaining = isLeaseActive ? monthsBetween(today, leaseEndDate) : 0;
  const monthsPaid = isLeaseActive ? monthsBetween(leaseStartDate, today) : 0;
  const compassionFee = (property.price * monthsRemaining) + (property.price * 0.5 * monthsPaid);


  return (
    <div className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-3xl font-bold">Tenant Details</CardTitle>
            </CardHeader>
            <CardContent>
                    <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={tenant.avatarUrl} alt={tenant.name} />
                        <AvatarFallback>{tenant.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-2xl font-bold">{tenant.name}</h2>
                        <p className="text-muted-foreground">{tenant.role}</p>
                    </div>
                </div>
                <Separator className="my-6"/>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <a href={`mailto:${tenant.email}`} className="text-primary hover:underline">{tenant.email}</a>
                    </div>
                    <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <span>(123) 456-7890</span>
                    </div>
                </div>
            </CardContent>
            </Card>

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
                             <Badge variant={isRentDue ? 'destructive' : 'secondary'}>{isRentDue ? 'Due' : 'Paid'}</Badge>
                             <p className="text-sm">
                                {isLeaseActive ? `Next due on ${format(nextRentDueDate, 'MMM do, yyyy')}` : 'Lease Inactive'}
                            </p>
                        </div>
                    </div>
                    <div className={cn("rounded-lg border p-4 col-span-full", isLeaseEndingSoon ? "border-amber-500/50 bg-amber-50" : "bg-secondary/50")}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Lease End Date</p>
                                <p className={cn("text-xl font-bold", isLeaseEndingSoon && "text-amber-600")}>{format(leaseEndDate, 'MMMM do, yyyy')}</p>
                                {isLeaseEndingSoon && <p className="text-xs text-amber-500 mt-1">{leaseDaysRemaining} days remaining</p>}
                            </div>
                            <div className="flex items-center gap-2">
                                {isLeaseEndingSoon && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                                <Button variant="outline"><RefreshCcw className="mr-2 h-4 w-4"/> Renew Lease</Button>
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
                <Link href={`/landlord/messages?conversationId=${tenant.id}`}>
                    <Mail className="mr-2 h-4 w-4"/> Message Tenant
                </Link>
                </Button>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={!isLeaseActive}>End Tenancy</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>End Tenancy for {tenant.name}?</AlertDialogTitle>
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
                                <p className="text-3xl font-bold text-destructive">{formatPrice(compassionFee)}</p>
                                <p className="text-xs text-muted-foreground">
                                    Based on {monthsRemaining} months remaining + prorated fee.
                                </p>
                            </CardContent>
                        </Card>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive hover:bg-destructive/90">Confirm & End Tenancy</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    </div>
  );
}
