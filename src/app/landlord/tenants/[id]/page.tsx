

'use client';

import { notFound, useParams } from 'next/navigation';
import { getUserById, getPropertiesByTenant, getTransactionsByTenantId } from '@/lib/data';
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
import { Phone, Mail, FileText, CalendarDays, AlertTriangle, Coins, Download, Pencil, Lock, QrCode, RefreshCcw } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import PaymentDialog from '@/components/payment-dialog';

// Mock current user
const useUser = () => {
    // To test landlord view: 'user-1'
    // To test tenant view: 'user-3'
    const user = getUserById('user-3');
    return { user };
};

export default function TenantDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const { user: currentUser } = useUser();
  const tenant = getUserById(id);
  const rentedProperties = tenant ? getPropertiesByTenant(tenant.id) : [];
  const tenantTransactions = tenant ? getTransactionsByTenantId(tenant.id) : [];

  if (!tenant || !currentUser || rentedProperties.length === 0) {
    notFound();
  }
  
  // A tenant should only see their own page, unless it's a landlord viewing it
  if (currentUser.role === 'student' && currentUser.id !== tenant.id) {
    notFound();
  }


  const property = rentedProperties[0]; // Assuming one tenant rents one property for this view
  const landlord = getUserById(property.landlordId);


  // --- DATE & PAYMENT CALCULATIONS ---
  const today = new Date();
  const leaseStartDate = property.leaseStartDate ? new Date(property.leaseStartDate) : new Date();
  
  const leaseEndDate = add(leaseStartDate, { years: 1 });
  
  const lastRentPayment = tenantTransactions
    .filter(t => t.type === 'Rent')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  
  const isLeaseActive = isPast(leaseStartDate) && isBefore(today, leaseEndDate);
  const isLeaseExpired = isPast(leaseEndDate);
  
  let nextRentDueDate: Date;
  let isRentDue = false;

  if (isLeaseActive) {
    if (lastRentPayment) {
        nextRentDueDate = add(new Date(lastRentPayment.date), { months: 1 });
        isRentDue = isPast(nextRentDueDate);
    } else {
        // New tenant, rent is due if today is past the first month's start date
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
  
  // State for lease modal
  const initialLeaseText = `1. PARTIES...`;
  const [isEditing, setIsEditing] = useState(false);
  const [leaseText, setLeaseText] = useState(initialLeaseText);
  const [landlordSigned, setLandlordSigned] = useState(false);
  const [tenantSigned, setTenantSigned] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  const isDocLocked = landlordSigned && tenantSigned;
  const isCurrentUserTenant = currentUser.id === tenant.id;

  const handlePaymentSuccess = () => {
    console.log("Payment successful!");
    // Here you would typically re-fetch data or update state
    window.location.reload();
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
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

            <Tabs defaultValue="lease" className="w-full mt-8">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="lease">Lease Info</TabsTrigger>
                    <TabsTrigger value="payments">Payments</TabsTrigger>
                </TabsList>
                <TabsContent value="lease">
                    <Card className="mt-2">
                        <CardHeader>
                            <CardTitle>Lease Information</CardTitle>
                            <CardDescription>Key dates and details about the tenancy.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="rounded-lg border bg-secondary/50 p-4">
                                    <p className="text-sm font-medium text-muted-foreground">Next Rent Due</p>
                                    <p className={cn("text-xl font-bold", isRentDue && isLeaseActive ? "text-destructive" : "text-primary")}>
                                        {isLeaseActive ? format(nextRentDueDate, 'MMMM do, yyyy') : 'N/A'}
                                    </p>
                                </div>
                                <div className={cn("rounded-lg border p-4", isLeaseEndingSoon ? "border-amber-500/50 bg-amber-50" : isLeaseExpired ? "border-destructive/50 bg-destructive/5" : "bg-secondary/50")}>
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-muted-foreground">{isLeaseExpired ? "Lease Expired On" : "Lease End Date"}</p>
                                        {isLeaseEndingSoon && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                                    </div>
                                    <p className={cn("text-xl font-bold", isLeaseEndingSoon && "text-amber-600", isLeaseExpired && "text-destructive")}>
                                        {format(leaseEndDate, 'MMMM do, yyyy')}
                                    </p>
                                    {isLeaseEndingSoon && !isLeaseExpired && <p className="text-xs text-amber-500 mt-1">{leaseDaysRemaining} days remaining</p>}
                                </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Lease Started</p>
                                    <p>{format(leaseStartDate, 'MMMM do, yyyy')}</p>
                                </div>
                                
                                {isLeaseExpired && isCurrentUserTenant ? (
                                    <Button variant="outline"><RefreshCcw className="mr-2 h-4 w-4"/> Request New Lease</Button>
                                ) : (
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline"><FileText className="mr-2 h-4 w-4"/> View Lease Agreement</Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-3xl">
                                            {/* Lease Dialog Content */}
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="payments">
                     <Card className="mt-2">
                        <CardHeader>
                             <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Payment History</CardTitle>
                                    <CardDescription>Review your past transactions.</CardDescription>
                                </div>
                                {isCurrentUserTenant && isRentDue && isLeaseActive && (
                                    <Button onClick={() => setIsPaymentDialogOpen(true)}>Pay Rent Now</Button>
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
                                    {tenantTransactions.length > 0 ? tenantTransactions.map(t => (
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
            </Tabs>
        </div>
        <aside className="lg:col-span-1">
             <div className="sticky top-24 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Rented Property</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <h3 className="font-semibold">{property.title}</h3>
                        <p className="text-sm text-muted-foreground">{property.location.address}</p>
                        <Button asChild className="w-full mt-4">
                            <Link href={`/properties/${property.id}`}>View Property Details</Link>
                        </Button>
                    </CardContent>
                </Card>
                 {!isCurrentUserTenant && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Landlord Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2">
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
                                    {/* End Tenancy Dialog Content */}
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>
                 )}
            </div>
        </aside>
        
        {isCurrentUserTenant && (
            <PaymentDialog
                isOpen={isPaymentDialogOpen}
                onClose={() => setIsPaymentDialogOpen(false)}
                onPaymentSuccess={handlePaymentSuccess}
                amount={property.price}
                tenantName={tenant.name}
            />
        )}
    </div>
  );
}
