
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getPropertiesByLandlord, getRentalRequestsByPropertyId, getUserById, getPropertyById } from '@/lib/data';
import type { User, Property, RentalRequest } from '@/lib/definitions';
import { Check, X, Bell } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import React from 'react';

// Mock current user
const useUser = () => {
  const user = getUserById('user-1');
  return { user };
};

type AggregatedRequest = {
  request: RentalRequest;
  applicant: User | undefined;
  property: Property | undefined;
};

export default function RentalRequestsPage() {
  const { user: landlord } = useUser();

  const aggregatedRequests = React.useMemo(() => {
    if (!landlord) return [];
    
    const landlordProperties = getPropertiesByLandlord(landlord.id);
    const allRequests: AggregatedRequest[] = [];

    landlordProperties.forEach(property => {
      const requests = getRentalRequestsByPropertyId(property.id);
      requests.forEach(request => {
        allRequests.push({
          request,
          applicant: getUserById(request.userId),
          property: getPropertyById(request.propertyId),
        });
      });
    });

    return allRequests.sort((a, b) => new Date(b.request.requestDate).getTime() - new Date(a.request.requestDate).getTime());
  }, [landlord]);

  const pendingRequests = aggregatedRequests.filter(req => req.request.status === 'pending');
  const pastRequests = aggregatedRequests.filter(req => req.request.status !== 'pending');


  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold">Rental Requests</h1>
          <p className="text-muted-foreground">
            Manage incoming applications from students.
          </p>
        </div>
      </div>
      <Separator className="my-6" />
      
      {aggregatedRequests.length === 0 ? (
        <Card>
            <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-background">
                        <Bell className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">No Rental Requests</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        When students apply to your properties, their requests will appear here.
                    </p>
                </div>
            </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
            {/* Pending Requests */}
            <Card>
                <CardHeader>
                <CardTitle>Pending Requests</CardTitle>
                <CardDescription>
                    You have {pendingRequests.length} pending requests that require your attention.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Applicant</TableHead>
                            <TableHead>Property</TableHead>
                            <TableHead>Message</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pendingRequests.length > 0 ? (
                            pendingRequests.map(({ request, applicant, property }) => (
                                <TableRow key={request.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={applicant?.avatarUrl} />
                                                <AvatarFallback>{applicant?.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{applicant?.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Link href={`/landlord/properties/${property?.id}`} className="hover:underline text-muted-foreground">
                                            {property?.title}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate text-muted-foreground">{request.message}</TableCell>
                                    <TableCell>{new Date(request.requestDate).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="outline"><Check className="h-4 w-4" /></Button>
                                            <Button size="sm" variant="destructive"><X className="h-4 w-4" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">No pending requests.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>

            {/* Past Requests */}
            <Card>
                <CardHeader>
                <CardTitle>Past Requests</CardTitle>
                <CardDescription>
                    A history of all previously handled requests.
                </CardDescription>
                </CardHeader>
                <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Applicant</TableHead>
                            <TableHead>Property</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pastRequests.length > 0 ? (
                             pastRequests.map(({ request, applicant, property }) => (
                                <TableRow key={request.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={applicant?.avatarUrl} />
                                                <AvatarFallback>{applicant?.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{applicant?.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Link href={`/landlord/properties/${property?.id}`} className="hover:underline text-muted-foreground">
                                            {property?.title}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{new Date(request.requestDate).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={request.status === 'accepted' ? 'secondary' : 'destructive'}>
                                            {request.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                             ))
                        ) : (
                             <TableRow>
                                <TableCell colSpan={4} className="text-center h-24">No past requests.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
