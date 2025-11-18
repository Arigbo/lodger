

'use client';

import { notFound } from 'next/navigation';
import { getUserById, getPropertiesByTenant, getTransactionsByTenantId } from '@/lib/data';
import type { User, Property, Transaction } from '@/lib/definitions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FileText, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { add, format, isPast, isBefore } from 'date-fns';
import { cn, formatPrice } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import PaymentDialog from '@/components/payment-dialog';

// Mock current user
const useUser = () => {
    // To test tenant view: 'user-3'
    const user = getUserById('user-3');
    return { user };
};

export default function TenantDetailPage() {
  const { user: currentUser } = useUser();
  const tenant = currentUser; // On this page, the current user is the tenant
  const rentedProperties = tenant ? getPropertiesByTenant(tenant.id) : [];
  
  if (!tenant || rentedProperties.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>No Tenancy Found</CardTitle>
                <CardDescription>You are not currently renting any properties.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href="/student/properties">Find a Property to Rent</Link>
                </Button>
            </CardContent>
        </Card>
    );
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
  const isLeaseExpired = isPast(leaseEndDate);
  
  let nextRentDueDate: Date;
  let isRentDue = false;
  let rentDueDateText = "N/A";
  let rentStatusText = isLeaseActive ? `Due on` : 'Next due on';

  if (isLeaseActive) {
    if (lastRentPayment) {
        nextRentDueDate = add(new Date(lastRentPayment.date), { months: 1 });
        isRentDue = isPast(nextRentDueDate);
    } else {
        // New tenant, rent is due if today is past the first month's start date
        nextRentDueDate = leaseStartDate;
        isRentDue = isPast(leaseStartDate);
    }
     rentDueDateText = format(nextRentDueDate, 'MMMM do, yyyy');
  } else {
      rentStatusText = 'Lease Inactive';
  }
  
  if(isRentDue) {
      rentStatusText = 'Due on';
  } else if (isLeaseActive) {
      rentStatusText = 'Next due on';
  }


  const hasPendingPayments = tenantTransactions.some(t => t.status === 'Pending');
  const showPayButton = (isRentDue || hasPendingPayments) && isLeaseActive;

  const pendingTransactions = tenantTransactions.filter(t => t.status === 'Pending');
  const paymentAmount = pendingTransactions.reduce((acc, t) => acc + t.amount, 0);

  // State
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  const handlePaymentSuccess = () => {
    console.log("Payment successful!");
    // Here you would typically re-fetch data or update state
    window.location.reload();
  };

  return (
    <div className="space-y-8">
        <div>
            <h1 className="font-headline text-3xl font-bold">My Tenancy</h1>
            <p className="text-muted-foreground">Manage your current rental agreement and payments.</p>
        </div>
        <Separator />
         <Card>
            <CardHeader>
                <CardTitle>Rented Property</CardTitle>
            </CardHeader>
            <CardContent>
                <h3 className="font-semibold">{property.title}</h3>
                <p className="text-sm text-muted-foreground">{property.location.address}</p>
                <Button asChild className="w-full mt-4">
                    <Link href={`/student/properties/${property.id}`}>View Property Details</Link>
                </Button>
            </CardContent>
        </Card>

        <Tabs defaultValue="payments" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="lease">Lease Info</TabsTrigger>
            </TabsList>
            <TabsContent value="payments">
                 <Card className="mt-2">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Payment History</CardTitle>
                            <CardDescription>Review your past transactions.</CardDescription>
                        </div>
                        {showPayButton && paymentAmount > 0 && (
                            <Button onClick={() => setIsPaymentDialogOpen(true)}>Pay Now {formatPrice(paymentAmount)}</Button>
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
             <TabsContent value="lease">
                <Card className="mt-2">
                    <CardHeader>
                        <CardTitle>Lease Information</CardTitle>
                        <CardDescription>Key dates and details about your tenancy.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="rounded-lg border bg-secondary/50 p-4">
                                <p className="text-sm font-medium text-muted-foreground">{rentStatusText}</p>
                                <p className={cn("text-xl font-bold", isRentDue && isLeaseActive ? "text-destructive" : "text-primary")}>
                                    {rentDueDateText}
                                </p>
                            </div>
                            <div className={cn("rounded-lg border p-4", isLeaseExpired ? "border-destructive/50 bg-destructive/5" : "bg-secondary/50")}>
                                <p className="text-sm font-medium text-muted-foreground">{isLeaseExpired ? "Lease Expired On" : "Lease End Date"}</p>
                                <p className={cn("text-xl font-bold", isLeaseExpired && "text-destructive")}>
                                    {format(leaseEndDate, 'MMMM do, yyyy')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Lease Started</p>
                                <p>{format(leaseStartDate, 'MMMM do, yyyy')}</p>
                            </div>
                            
                            {isLeaseExpired ? (
                                <Button variant="outline" disabled><RefreshCcw className="mr-2 h-4 w-4"/> Request New Lease</Button>
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
        </Tabs>
        
        <PaymentDialog
            isOpen={isPaymentDialogOpen}
            onClose={() => setIsPaymentDialogOpen(false)}
            onPaymentSuccess={handlePaymentSuccess}
            amount={paymentAmount}
            tenantName={tenant.name}
        />
    </div>
  );
}
