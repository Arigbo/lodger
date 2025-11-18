
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
import type { User, Property, RentalRequest } from '@/lib/definitions';
import { Check, X, Bell } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import React, { useState } from 'react';
import LeaseGenerationDialog from '@/components/lease-generation-dialog';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, getDocs, addDoc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';


type AggregatedRequest = {
  request: RentalRequest;
  applicant: User;
  property: Property;
};

export default function RentalRequestsPage() {
  const { user: landlord, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AggregatedRequest | null>(null);
  const [aggregatedRequests, setAggregatedRequests] = useState<AggregatedRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    if (!landlord) return;

    const fetchRequests = async () => {
        setIsLoading(true);
        // 1. Get all properties for the landlord
        const propertiesQuery = query(collection(firestore, 'properties'), where('landlordId', '==', landlord.uid));
        const propertiesSnapshot = await getDocs(propertiesQuery);
        const landlordProperties = propertiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Property[];
        const propertyIds = landlordProperties.map(p => p.id);

        if (propertyIds.length === 0) {
            setAggregatedRequests([]);
            setIsLoading(false);
            return;
        }

        // 2. Get all rental applications for those properties
        const requestsQuery = query(collection(firestore, 'rentalApplications'), where('propertyId', 'in', propertyIds));
        const requestsSnapshot = await getDocs(requestsQuery);
        const allRequests = requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RentalRequest[];

        // 3. Get all unique user IDs from the applications
        const userIds = [...new Set(allRequests.map(req => req.userId))];

        if (userIds.length === 0) {
            setAggregatedRequests([]);
            setIsLoading(false);
            return;
        }

        // 4. Get all applicant user documents
        const usersQuery = query(collection(firestore, 'users'), where('id', 'in', userIds));
        const usersSnapshot = await getDocs(usersQuery);
        const usersMap = new Map<string, User>();
        usersSnapshot.forEach(doc => usersMap.set(doc.id, { id: doc.id, ...doc.data() } as User));

        // 5. Aggregate the data
        const finalRequests = allRequests.map(request => ({
            request,
            applicant: usersMap.get(request.userId)!,
            property: landlordProperties.find(p => p.id === request.propertyId)!,
        })).filter(req => req.applicant && req.property);
        
        setAggregatedRequests(finalRequests.sort((a, b) => new Date(b.request.applicationDate).getTime() - new Date(a.request.applicationDate).getTime()));
        setIsLoading(false);
    };

    fetchRequests();
  }, [landlord, firestore]);

  const pendingRequests = aggregatedRequests.filter(req => req.request.status === 'pending');
  
  const handleAcceptClick = (request: AggregatedRequest) => {
    setSelectedRequest(request);
    setDialogOpen(true);
  };
  
  const handleDeclineClick = (requestId: string) => {
    const requestRef = doc(firestore, 'rentalApplications', requestId);
    updateDocumentNonBlocking(requestRef, { status: 'declined' });

    setAggregatedRequests(prev => prev.map(ar => 
        ar.request.id === requestId 
        ? { ...ar, request: { ...ar.request, status: 'declined' } }
        : ar
    ));
  };

  const handleLeaseSigned = async () => {
    if (selectedRequest && landlord && selectedRequest.property.leaseTemplate) {
        const { request, property } = selectedRequest;
      
        // 1. Update rental request status
        const requestRef = doc(firestore, 'rentalApplications', request.id);
        updateDocumentNonBlocking(requestRef, { status: 'approved' });

        // 2. Update property status
        const propertyRef = doc(firestore, 'properties', property.id);
        const leaseStartDate = new Date().toISOString();
        updateDocumentNonBlocking(propertyRef, {
            status: 'occupied',
            currentTenantId: request.userId,
            leaseStartDate,
        });

        // 3. Create a new lease agreement
        const leaseCollectionRef = collection(firestore, 'leaseAgreements');
        await addDoc(leaseCollectionRef, {
            propertyId: property.id,
            landlordId: landlord.uid,
            tenantId: request.userId,
            leaseText: property.leaseTemplate,
            landlordSigned: true,
            tenantSigned: false,
            startDate: leaseStartDate,
            endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
            status: 'pending',
        });

        // 4. Update local state to reflect the change
        setAggregatedRequests(prev => prev.map(ar => 
            ar.request.id === request.id 
            ? { ...ar, request: { ...ar.request, status: 'approved' } }
            : ar
        ));
    }
  }

  if (isUserLoading || isLoading) {
    return <div>Loading requests...</div>
  }

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
      
      {aggregatedRequests.length === 0 && !isLoading ? (
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
                            pendingRequests.map((aggregatedRequest) => {
                                const { request, applicant, property } = aggregatedRequest;
                                return (
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
                                    <TableCell className="max-w-xs truncate text-muted-foreground">{request.messageToLandlord}</TableCell>
                                    <TableCell>{new Date(request.applicationDate).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="outline" onClick={() => handleAcceptClick(aggregatedRequest)}><Check className="h-4 w-4" /></Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleDeclineClick(request.id)}><X className="h-4 w-4" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )})
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">No pending requests.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </div>
      )}
      {selectedRequest && landlord && selectedRequest.property.leaseTemplate && (
        <LeaseGenerationDialog
            isOpen={dialogOpen}
            onClose={() => setDialogOpen(false)}
            onLeaseSigned={handleLeaseSigned}
            landlord={landlord}
            leaseText={selectedRequest.property.leaseTemplate}
        />
      )}
    </div>
  );
}
