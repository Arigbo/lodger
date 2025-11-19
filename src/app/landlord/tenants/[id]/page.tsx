

'use client';

import { notFound, useParams } from 'next/navigation';
import type { User, Property, Transaction } from '@/lib/definitions';
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
import { Phone, Mail, AlertTriangle, Coins, RefreshCcw, Pencil, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { add, format, differenceInDays, isPast, isBefore, differenceInMonths } from 'date-fns';
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
import React, { useEffect, useState } from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';


export default function TenantDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const { user: currentUser, isUserLoading } = useUser();
  const firestore = useFirestore();

  const tenantRef = useMemoFirebase(() => doc(firestore, 'users', id), [firestore, id]);
  const { data: tenant, isLoading: isTenantLoading } = useDoc<User>(tenantRef);

  const rentedPropertiesQuery = useMemoFirebase(() => tenant ? query(collection(firestore, 'properties'), where('currentTenantId', '==', tenant.id)) : null, [tenant, firestore]);
  const { data: rentedProperties, isLoading: arePropertiesLoading } = useCollection<Property>(rentedPropertiesQuery);

  const transactionsQuery = useMemoFirebase(() => tenant ? query(collection(firestore, 'transactions'), where('tenantId', '==', tenant.id)) : null, [tenant, firestore]);
  const { data: tenantTransactions, isLoading: areTransactionsLoading } = useCollection<Transaction>(transactionsQuery);

  const [rentStatus, setRentStatus] = useState<{
      status: 'Paid' | 'Due' | 'Inactive';
      text: string;
      isLeaseActive: boolean;
      isLeaseEndingSoon: boolean;
      leaseEndDate: Date | null;
      leaseDaysRemaining: number;
      compassionFee: number;
  } | null>(null);

  useEffect(() => {
      if (!rentedProperties || !tenantTransactions) return;

      const property = rentedProperties[0];
      if (!property) return;
      
      const today = new Date();
      const leaseStartDate = property.leaseStartDate ? new Date(property.leaseStartDate) : new Date();
      const leaseEndDate = add(leaseStartDate, { years: 1 });
      
      const lastRentPayment = tenantTransactions
        .filter(t => t.type === 'Rent' && t.status === 'Completed')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      const isLeaseActive = isPast(leaseStartDate) && isBefore(today, leaseEndDate);
      
      let nextRentDueDate: Date;
      let status: 'Paid' | 'Due' | 'Inactive' = 'Inactive';
      let text = 'Lease Inactive';

      if (isLeaseActive) {
        if (lastRentPayment) {
            nextRentDueDate = add(new Date(lastRentPayment.date), { months: 1 });
            if (isPast(nextRentDueDate)) {
                status = 'Due';
                text = `Due on ${format(nextRentDueDate, 'MMM do, yyyy')}`;
            } else {
                status = 'Paid';
                text = `Next due on ${format(nextRentDueDate, 'MMM do, yyyy')}`;
            }
        } else {
            nextRentDueDate = leaseStartDate;
            if (isPast(leaseStartDate)) {
                status = 'Due';
                text = `Due on ${format(nextRentDueDate, 'MMM do, yyyy')}`;
            } else {
                status = 'Paid';
                text = `Next due on ${format(nextRentDueDate, 'MMM do, yyyy')}`;
            }
        }
      }
      
      const leaseDaysRemaining = differenceInDays(leaseEndDate, today);
      const isLeaseEndingSoon = isLeaseActive && leaseDaysRemaining <= 90;
      
      const monthsRemaining = isLeaseActive ? differenceInMonths(leaseEndDate, today) : 0;
      const monthsPaid = isLeaseActive ? differenceInMonths(today, leaseStartDate) : 0;
      const compassionFee = (property.price * monthsRemaining) + (property.price * 0.5 * monthsPaid);
      
      setRentStatus({
          status,
          text,
          isLeaseActive,
          isLeaseEndingSoon,
          leaseEndDate,
          leaseDaysRemaining,
          compassionFee
      });

  }, [rentedProperties, tenantTransactions]);

  const isLoading = isUserLoading || isTenantLoading || arePropertiesLoading || areTransactionsLoading;

  if (isLoading) {
    return <div>Loading tenant details...</div>;
  }

  if (!tenant || !currentUser || currentUser.role !== 'landlord') {
    notFound();
  }

  const property = rentedProperties?.[0];

  return (
    <div className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-3xl font-bold">Tenant Details</CardTitle>
            </CardHeader>
            <CardContent>
                    <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={tenant.profileImageUrl} alt={tenant.name} />
                        <AvatarFallback>
                            <UserIcon className="h-12 w-12 text-muted-foreground" />
                        </AvatarFallback>
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
                    {tenant.phone && (
                        <div className="flex items-center gap-3">
                            <Phone className="h-5 w-5 text-muted-foreground" />
                            <span>{tenant.phone}</span>
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
                                        <Button variant="outline" disabled><Pencil className="mr-2 h-4 w-4"/> Edit Lease</Button>
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
                                <Button variant="destructive" disabled={!rentStatus.isLeaseActive}>End Tenancy</Button>
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
                                        <p className="text-3xl font-bold text-destructive">{formatPrice(rentStatus.compassionFee)}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Based on remaining lease term + prorated fee.
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
