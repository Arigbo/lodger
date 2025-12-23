
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
import type { UserProfile, Property, RentalApplication, LeaseAgreement } from '@/types/';
import { Check, X, Bell, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';
import LeaseGenerationDialog from '@/components/lease-generation-dialog';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, getDocs, addDoc, updateDoc, documentId, getDoc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import Loading from '@/app/loading';
import { sendNotification } from '@/lib/notifications';
import { formatPrice } from '@/utils';

type AggregatedRequest = {
  request: RentalApplication;
  applicant: UserProfile | null;
  property: Property | null;
};

// Helper function to split an array into chunks
function chunkArray<T>(array: T[], size: number): T[][] {
  if (array.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}


export default function RentalRequestsPage() {
  const { user: landlord, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AggregatedRequest | null>(null);
  const [aggregatedRequests, setAggregatedRequests] = useState<AggregatedRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [landlordProfile, setLandlordProfile] = useState<UserProfile | null>(null);
  const [pendingOfflinePayments, setPendingOfflinePayments] = useState<Array<{
    lease: LeaseAgreement;
    tenant: UserProfile | null;
    property: Property | null;
  }>>([]);

  React.useEffect(() => {
    if (!landlord || !firestore) {
      if (!isUserLoading) setIsLoading(false);
      return;
    }

    const fetchLandlordProfile = async () => {
      try {
        const userDocRef = doc(firestore, 'users', landlord.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setLandlordProfile({ id: userDocSnap.id, ...userDocSnap.data() } as UserProfile);
        }
      } catch (error) {
        console.error("Error fetching landlord profile:", error);
      }
    };

    fetchLandlordProfile();

    const fetchRequests = async () => {
      setIsLoading(true);
      const requestsQuery = query(collection(firestore, 'rentalApplications'), where('landlordId', '==', landlord.uid));
      const requestsSnapshot = await getDocs(requestsQuery);
      const allRequests: RentalApplication[] = requestsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as RentalApplication));

      if (allRequests.length === 0) {
        setAggregatedRequests([]);
        setIsLoading(false);
        return;
      }

      const userIds = [...new Set(allRequests.map(req => req.tenantId))].filter(Boolean);
      const propertyIds = [...new Set(allRequests.map(req => req.propertyId))].filter(Boolean);

      const usersMap = new Map<string, UserProfile>();
      const propertiesMap = new Map<string, Property>();

      if (userIds.length > 0) {
        const userChunks = chunkArray(userIds, 30);
        for (const chunk of userChunks) {
          const usersQuery = query(collection(firestore, 'users'), where(documentId(), 'in', chunk));
          const userSnapshots = await getDocs(usersQuery);
          userSnapshots.forEach((doc: any) => usersMap.set(doc.id, { id: doc.id, ...doc.data() } as UserProfile));
        }
      }

      if (propertyIds.length > 0) {
        const propertyChunks = chunkArray(propertyIds, 30);
        for (const chunk of propertyChunks) {
          const propertiesQuery = query(collection(firestore, 'properties'), where(documentId(), 'in', chunk));
          const propertySnapshots = await getDocs(propertiesQuery);
          propertySnapshots.forEach((doc: any) => propertiesMap.set(doc.id, { id: doc.id, ...doc.data() } as Property));
        }
      }

      const finalRequests: AggregatedRequest[] = allRequests.map(request => ({
        request,
        applicant: usersMap.get(request.tenantId) || null,
        property: propertiesMap.get(request.propertyId) || null,
      }));

      setAggregatedRequests(finalRequests.sort((a, b) => new Date(b.request.applicationDate).getTime() - new Date(a.request.applicationDate).getTime()));
      setIsLoading(false);
    };

    fetchRequests();

    // Fetch pending offline payments
    const fetchOfflinePayments = async () => {
      const leasesQuery = query(
        collection(firestore, 'leaseAgreements'),
        where('landlordId', '==', landlord.uid),
        where('paymentMethod', '==', 'offline'),
        where('paymentConfirmed', '==', false)
      );

      const leasesSnapshot = await getDocs(leasesQuery);
      const leases: LeaseAgreement[] = leasesSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as LeaseAgreement));

      if (leases.length === 0) {
        setPendingOfflinePayments([]);
        return;
      }

      const tenantIds = [...new Set(leases.map(l => l.tenantId))].filter(Boolean);
      const propertyIds = [...new Set(leases.map(l => l.propertyId))].filter(Boolean);

      const tenantsMap = new Map<string, UserProfile>();
      const propertiesMap = new Map<string, Property>();

      if (tenantIds.length > 0) {
        const tenantChunks = chunkArray(tenantIds, 30);
        for (const chunk of tenantChunks) {
          const tenantsQuery = query(collection(firestore, 'users'), where(documentId(), 'in', chunk));
          const tenantSnapshots = await getDocs(tenantsQuery);
          tenantSnapshots.forEach((doc: any) => tenantsMap.set(doc.id, { id: doc.id, ...doc.data() } as UserProfile));
        }
      }

      if (propertyIds.length > 0) {
        const propertyChunks = chunkArray(propertyIds, 30);
        for (const chunk of propertyChunks) {
          const propertiesQuery = query(collection(firestore, 'properties'), where(documentId(), 'in', chunk));
          const propertySnapshots = await getDocs(propertiesQuery);
          propertySnapshots.forEach((doc: any) => propertiesMap.set(doc.id, { id: doc.id, ...doc.data() } as Property));
        }
      }

      const payments = leases.map(lease => ({
        lease,
        tenant: tenantsMap.get(lease.tenantId) || null,
        property: propertiesMap.get(lease.propertyId) || null,
      }));

      setPendingOfflinePayments(payments);
    };

    fetchOfflinePayments();
  }, [landlord, firestore, isUserLoading]);

  const pendingRequests = aggregatedRequests.filter(req => req.request.status === 'pending');

  const handleAcceptClick = (request: AggregatedRequest) => {
    setSelectedRequest(request);
    setDialogOpen(true);
  };

  const handleDeclineClick = (requestId: string) => {
    const requestRef = doc(firestore, 'rentalApplications', requestId);
    updateDocumentNonBlocking(requestRef, { status: 'declined' });

    // Notify Tenant
    const request = aggregatedRequests.find(r => r.request.id === requestId);
    if (request && request.request.tenantId) {
      sendNotification({
        toUserId: request.request.tenantId,
        type: 'REQUEST_REJECTED',
        firestore: firestore,
        propertyName: request.property?.title,
        link: `/student/requests`
      });
    }

    setAggregatedRequests(prev => prev.map(ar =>
      ar.request.id === requestId
        ? { ...ar, request: { ...ar.request, status: 'declined' } }
        : ar
    ));
  };

  const handleLeaseSigned = async () => {
    if (selectedRequest && landlord && selectedRequest.property?.leaseTemplate) {
      const { request, property } = selectedRequest;

      // 1. Update rental request status
      const requestRef = doc(firestore, 'rentalApplications', request.id);
      updateDocumentNonBlocking(requestRef, { status: 'approved' });

      // 2. Do NOT update property status yet. Wait for tenant to sign and pay.
      // const propertyRef = doc(firestore, 'properties', property.id);
      // const leaseStartDate = new Date().toISOString();
      // updateDocumentNonBlocking(propertyRef, {
      //   status: 'occupied',
      //   currentTenantId: request.tenantId,
      //   leaseStartDate,
      // });
      const leaseStartDate = new Date().toISOString();

      // 3. Create a new lease agreement
      const leaseCollectionRef = collection(firestore, 'leaseAgreements');
      const leaseDocRef = await addDoc(leaseCollectionRef, {
        propertyId: property.id,
        landlordId: landlord.uid,
        tenantId: request.tenantId,
        leaseText: property.leaseTemplate,
        landlordSigned: true,
        tenantSigned: false,
        startDate: leaseStartDate,
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        status: 'pending', // Pending tenant signature and payment
      });
      await updateDoc(leaseDocRef, { id: leaseDocRef.id });

      // Notify Tenant: Request Accepted
      await sendNotification({
        toUserId: request.tenantId,
        type: 'REQUEST_ACCEPTED',
        firestore: firestore,
        propertyName: property.title,
        link: `/student/leases/${leaseDocRef.id}` // Correct Link to Lease Page
      });

      // Notify Tenant: Lease Generated (Ready to sign)
      await sendNotification({
        toUserId: request.tenantId,
        type: 'LEASE_GENERATED',
        firestore: firestore,
        propertyName: property.title,
        link: `/student/leases/${leaseDocRef.id}` // Correct Link to Lease Page
      });

      // 4. Update local state
      setAggregatedRequests(prev => prev.map(ar =>
        ar.request.id === request.id
          ? { ...ar, request: { ...ar.request, status: 'approved' } }
          : ar
      ));
    }
  };

  const handleApproveOfflinePayment = async (leaseId: string, tenantId: string, propertyId: string, propertyTitle: string) => {
    try {
      const leaseRef = doc(firestore, 'leaseAgreements', leaseId);
      const propertyRef = doc(firestore, 'properties', propertyId);

      // Update lease
      await updateDoc(leaseRef, {
        paymentConfirmed: true,
        landlordApprovedOfflinePayment: true,
        status: 'active'
      });

      // Update property
      const leaseDoc = await getDoc(leaseRef);
      const leaseData = leaseDoc.data() as LeaseAgreement;

      await updateDoc(propertyRef, {
        status: 'occupied',
        currentTenantId: tenantId,
        leaseStartDate: leaseData.startDate
      });

      // Create transaction record
      const property = pendingOfflinePayments.find(p => p.lease.id === leaseId)?.property;
      await addDoc(collection(firestore, 'transactions'), {
        landlordId: landlord!.uid,
        tenantId: tenantId,
        propertyId: propertyId,
        amount: leaseData.offlinePaymentAmount || property?.price || 0,
        monthsPaid: leaseData.offlinePaymentMonths || 1,
        currency: leaseData.currency || property?.currency || 'USD',
        date: new Date().toISOString(),
        type: 'Rent',
        status: 'Completed'
      });

      // Notify tenant
      await sendNotification({
        toUserId: tenantId,
        type: 'OFFLINE_PAYMENT_APPROVED',
        firestore: firestore,
        propertyTitle: propertyTitle,
        link: `/student/tenancy`
      });

      // Update local state
      setPendingOfflinePayments(prev => prev.filter(p => p.lease.id !== leaseId));
    } catch (error) {
      console.error('Error approving offline payment:', error);
    }
  };

  const handleRejectOfflinePayment = async (leaseId: string, tenantId: string, propertyTitle: string) => {
    try {
      const leaseRef = doc(firestore, 'leaseAgreements', leaseId);

      // Reset payment method so tenant can choose again
      await updateDoc(leaseRef, {
        paymentMethod: null,
        paymentConfirmed: false
      });

      // Notify tenant
      await sendNotification({
        toUserId: tenantId,
        type: 'OFFLINE_PAYMENT_REJECTED',
        firestore: firestore,
        propertyTitle: propertyTitle,
        link: `/student/leases/${leaseId}`
      });

      // Update local state
      setPendingOfflinePayments(prev => prev.filter(p => p.lease.id !== leaseId));
    } catch (error) {
      console.error('Error rejecting offline payment:', error);
    }
  };

  if (isUserLoading || isLoading) {
    return <Loading />;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold">Rental Requests</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage incoming applications from students.
          </p>
        </div>
      </div>
      <Separator className="my-4 sm:my-6" />

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
              <div className="w-full overflow-x-auto">
                <div className="inline-block min-w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">Applicant</TableHead>
                        <TableHead className="hidden md:table-cell text-xs sm:text-sm whitespace-nowrap">Property</TableHead>
                        <TableHead className="hidden lg:table-cell text-xs sm:text-sm whitespace-nowrap">Message</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">Date</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.length > 0 ? (
                        pendingRequests.map((aggregatedRequest) => {
                          const { request, applicant, property } = aggregatedRequest;
                          if (!applicant || !property) return null;
                          return (
                            <TableRow key={request.id}>
                              <TableCell className="text-xs sm:text-sm py-2 sm:py-4">
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                                    <AvatarImage src={applicant?.profileImageUrl} />
                                    <AvatarFallback>
                                      <UserIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium line-clamp-1">{applicant?.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-xs sm:text-sm py-2 sm:py-4">
                                <Link href={`/landlord/properties/${property?.id}`} className="hover:underline text-muted-foreground line-clamp-2">
                                  {property?.title}
                                </Link>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell text-xs sm:text-sm py-2 sm:py-4 max-w-xs">
                                <span className="text-muted-foreground line-clamp-2">{request.messageToLandlord}</span>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm py-2 sm:py-4 whitespace-nowrap">{new Date(request.applicationDate).toLocaleDateString()}</TableCell>
                              <TableCell className="text-xs sm:text-sm py-2 sm:py-4 text-right">
                                <div className="flex justify-end gap-1 sm:gap-2">
                                  <Button size="xs" variant="outline" onClick={() => handleAcceptClick(aggregatedRequest)} className="px-2 h-7"><Check className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                                  <Button size="xs" variant="destructive" onClick={() => handleDeclineClick(request.id)} className="px-2 h-7"><X className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center h-16 sm:h-24 text-xs sm:text-sm">No pending requests.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Offline Payment Approvals */}
          {pendingOfflinePayments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Offline Payment Confirmations</CardTitle>
                <CardDescription>
                  {pendingOfflinePayments.length} tenant(s) selected offline payment. Confirm receipt to activate their lease.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full overflow-x-auto">
                  <div className="inline-block min-w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">Tenant</TableHead>
                          <TableHead className="hidden md:table-cell text-xs sm:text-sm whitespace-nowrap">Property</TableHead>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">Amount</TableHead>
                          <TableHead className="hidden sm:table-cell text-xs sm:text-sm whitespace-nowrap">Date Selected</TableHead>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingOfflinePayments.map(({ lease, tenant, property }) => {
                          if (!tenant || !property) return null;
                          return (
                            <TableRow key={lease.id}>
                              <TableCell className="text-xs sm:text-sm py-2 sm:py-4">
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                                    <AvatarImage src={tenant.profileImageUrl} />
                                    <AvatarFallback>
                                      <UserIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium line-clamp-1">{tenant.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-xs sm:text-sm py-2 sm:py-4">
                                <Link href={`/landlord/properties/${property.id}`} className="hover:underline text-muted-foreground line-clamp-2">
                                  {property.title}
                                </Link>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm py-2 sm:py-4 font-semibold whitespace-nowrap">
                                {formatPrice(lease.offlinePaymentAmount || property.price, property.currency)}
                                {lease.offlinePaymentMonths && lease.offlinePaymentMonths > 1 && (
                                  <span className="ml-1 text-xs text-muted-foreground">({lease.offlinePaymentMonths}m)</span>
                                )}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-xs sm:text-sm py-2 sm:py-4 whitespace-nowrap">{lease.createdAt ? new Date(lease.createdAt.toDate()).toLocaleDateString() : 'N/A'}</TableCell>
                              <TableCell className="text-xs sm:text-sm py-2 sm:py-4 text-right">
                                <div className="flex justify-end gap-1 sm:gap-2 flex-col sm:flex-row">
                                  <Button
                                    size="xs"
                                    onClick={() => handleApproveOfflinePayment(lease.id, tenant.id, property.id, property.title)}
                                    className="text-xs px-2 h-7"
                                  >
                                    <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" /> Confirm
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    onClick={() => handleRejectOfflinePayment(lease.id, tenant.id, property.title)}
                                    className="text-xs px-2 h-7"
                                  >
                                    <X className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" /> Reject
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      {selectedRequest && landlordProfile && selectedRequest.property?.leaseTemplate && (
        <LeaseGenerationDialog
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onLeaseSigned={handleLeaseSigned}
          landlord={landlordProfile}
          leaseText={selectedRequest.property.leaseTemplate}
        />
      )}
    </div>
  );
}


