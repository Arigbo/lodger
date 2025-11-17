
'use client';

import { notFound } from 'next/navigation';
import { getUserById, getPropertiesByTenant } from '@/lib/data';
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
import { Phone, Mail, FileText, CalendarDays, AlertTriangle, Coins } from 'lucide-react';
import Link from 'next/link';
import { add, format, differenceInDays, differenceInMonths, startOfMonth, isPast } from 'date-fns';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function TenantDetailPage({ params }: { params: { id: string } }) {
  const tenant = getUserById(params.id);
  const rentedProperties = tenant ? getPropertiesByTenant(tenant.id) : [];

  if (!tenant || rentedProperties.length === 0) {
    notFound();
  }

  const property = rentedProperties[0]; // Assuming one tenant rents one property for this view
  const landlord = getUserById(property.landlordId);


  // --- DATE & PAYMENT CALCULATIONS ---
  const today = new Date();
  const leaseStartDate = property.leaseStartDate ? new Date(property.leaseStartDate) : new Date();
  const leaseEndDate = add(leaseStartDate, { years: 1 });
  
  // Is rent for the current month "due"? (Assuming due on the 1st)
  const isRentDue = isPast(startOfMonth(today)); 

  // Calculate next rent due date (assuming 1st of every month)
  let nextRentDueDate = new Date(today.getFullYear(), today.getMonth(), 1);
  if (today.getDate() > 1) {
    nextRentDueDate = add(nextRentDueDate, { months: 1 });
  }

  const leaseDaysRemaining = differenceInDays(leaseEndDate, today);
  const isLeaseEndingSoon = leaseDaysRemaining <= 90;

  // Compassion Calculation
  const monthsRemaining = differenceInMonths(leaseEndDate, today);
  const monthsPaid = differenceInMonths(today, leaseStartDate);
  const compassionFee = (property.price * monthsRemaining) + (property.price * 0.5 * monthsPaid);


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

             <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Lease Information</CardTitle>
                    <CardDescription>Key dates and details about the tenancy.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="rounded-lg border bg-secondary/50 p-4">
                            <p className="text-sm font-medium text-muted-foreground">Next Rent Due</p>
                            <p className={cn("text-xl font-bold text-primary")}>
                                {format(nextRentDueDate, 'MMMM do, yyyy')}
                            </p>
                        </div>
                        <div className={cn("rounded-lg border p-4", isLeaseEndingSoon ? "border-amber-500/50 bg-amber-50" : "bg-secondary/50")}>
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-muted-foreground">Lease End Date</p>
                                {isLeaseEndingSoon && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                            </div>
                            <p className={cn("text-xl font-bold", isLeaseEndingSoon && "text-amber-600")}>
                                {format(leaseEndDate, 'MMMM do, yyyy')}
                            </p>
                             {isLeaseEndingSoon && <p className="text-xs text-amber-500 mt-1">{leaseDaysRemaining} days remaining</p>}
                        </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                             <p className="text-sm font-medium text-muted-foreground">Lease Started</p>
                            <p>{format(leaseStartDate, 'MMMM do, yyyy')}</p>
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline"><FileText className="mr-2 h-4 w-4"/> View Lease Agreement</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                    <DialogTitle>Lease Agreement: {property.title}</DialogTitle>
                                    <DialogDescription>
                                        This is a legally binding document. Dated: {format(leaseStartDate, 'MMMM do, yyyy')}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="prose max-h-[60vh] overflow-y-auto pr-6 text-sm">
                                    <h3>1. PARTIES</h3>
                                    <p>This Residential Lease Agreement ("Agreement") is made between <strong>{landlord?.name}</strong> ("Landlord") and <strong>{tenant.name}</strong> ("Tenant").</p>

                                    <h3>2. PROPERTY</h3>
                                    <p>Landlord agrees to lease to Tenant the property located at <strong>{property.location.address}, {property.location.city}, {property.location.state} {property.location.zip}</strong>.</p>

                                    <h3>3. TERM</h3>
                                    <p>The term of this lease is for one year, beginning on <strong>{format(leaseStartDate, 'MMMM do, yyyy')}</strong> and ending on <strong>{format(leaseEndDate, 'MMMM do, yyyy')}</strong>.</p>
                                    
                                    <h3>4. RENT</h3>
                                    <p>Tenant agrees to pay Landlord the sum of <strong>{formatPrice(property.price)}</strong> per month as rent, due on the 1st day of each month.</p>

                                    <h3>5. SECURITY DEPOSIT</h3>
                                    <p>Upon execution of this Agreement, Tenant shall deposit with Landlord the sum of {formatPrice(property.price)} as security for the faithful performance of the terms of this lease.</p>

                                    <h3>6. UTILITIES</h3>
                                    <p>Tenant is responsible for all utilities and services for the property, unless otherwise specified in the property amenities list.</p>

                                    <h3>7. USE OF PREMISES</h3>
                                    <p>The premises shall be used and occupied by Tenant and Tenant's immediate family, exclusively, as a private single-family dwelling, and no part of the premises shall be used at any time during the term of this Agreement for the purpose of carrying on any business, profession, or trade of any kind, or for any purpose other than as a private single-family dwelling.</p>
                                    
                                    <h3>8. HOUSE RULES</h3>
                                    <p>Tenant agrees to abide by the house rules, which are attached as an addendum to this lease. The current rules include: {property.rules.join(', ')}.</p>

                                    <h3>9. SIGNATURES</h3>
                                    <p>By signing below, the parties agree to the terms of this Lease Agreement.</p>
                                    <div className="mt-8 flex justify-between">
                                        <div>
                                            <p>_________________________</p>
                                            <p>Landlord: {landlord?.name}</p>
                                        </div>
                                        <div>
                                            <p>_________________________</p>
                                            <p>Tenant: {tenant.name}</p>
                                        </div>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardContent>
             </Card>
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
                            <Link href={`/landlord/properties/${property.id}`}>View Property</Link>
                        </Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        <Button variant="outline">
                            <Mail className="mr-2 h-4 w-4"/> Message Tenant
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">End Tenancy</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>End Tenancy Agreement?</AlertDialogTitle>
                                {isRentDue ? (
                                    <AlertDialogDescription>
                                        The tenant's rent is currently due. You can end the tenancy immediately without penalty.
                                    </AlertDialogDescription>
                                ) : (
                                    <AlertDialogDescription>
                                        The tenant's rent is not due. Ending the lease early requires a compassion payment to the tenant. Please review the details below.
                                    </AlertDialogDescription>
                                )}
                                </AlertDialogHeader>

                                {!isRentDue && (
                                    <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                                        <h4 className="font-semibold text-center">Compassion Payment Calculation</h4>
                                        <div className="flex justify-between items-center text-sm">
                                            <p>Monthly Rent:</p>
                                            <p>{formatPrice(property.price)}</p>
                                        </div>
                                         <div className="flex justify-between items-center text-sm">
                                            <p>Remaining Months in Lease:</p>
                                            <p>{monthsRemaining}</p>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <p>Months Paid (50% Rate):</p>
                                            <p>{monthsPaid}</p>
                                        </div>
                                        <Separator/>
                                        <div className="flex justify-between items-center font-bold text-lg">
                                            <p className="flex items-center gap-2"><Coins className="h-5 w-5 text-primary"/>Total Fee:</p>
                                            <p>{formatPrice(compassionFee)}</p>
                                        </div>
                                    </div>
                                )}
                                
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className={cn(isRentDue && "bg-destructive hover:bg-destructive/90")}>
                                    {isRentDue ? 'Proceed to End Tenancy' : 'Acknowledge & Continue'}
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardContent>
                 </Card>
            </div>
        </aside>
    </div>
  );
}
