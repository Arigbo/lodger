
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
import { Phone, Mail, FileText, CalendarDays, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { add, format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

export default function TenantDetailPage({ params }: { params: { id: string } }) {
  const tenant = getUserById(params.id);
  const rentedProperties = tenant ? getPropertiesByTenant(tenant.id) : [];

  if (!tenant || rentedProperties.length === 0) {
    notFound();
  }

  const property = rentedProperties[0]; // Assuming one tenant rents one property for this view

  // Calculate lease end date (assuming 1 year lease)
  const leaseStartDate = property.leaseStartDate ? new Date(property.leaseStartDate) : new Date();
  const leaseEndDate = add(leaseStartDate, { years: 1 });

  // Calculate next rent due date (assuming 1st of every month)
  const today = new Date();
  let nextRentDueDate = new Date(today.getFullYear(), today.getMonth(), 1);
  if (today.getDate() > 1) {
    nextRentDueDate = add(nextRentDueDate, { months: 1 });
  }

  const leaseDaysRemaining = differenceInDays(leaseEndDate, today);
  const isLeaseEndingSoon = leaseDaysRemaining <= 90;

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
                         <Button variant="outline"><FileText className="mr-2 h-4 w-4"/> View Lease Agreement</Button>
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
                        <Button variant="destructive">End Tenancy</Button>
                    </CardContent>
                 </Card>
            </div>
        </aside>
    </div>
  );
}
