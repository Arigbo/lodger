'use client';

import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { UserProfile, Property, RentalApplication, LeaseAgreement } from '@/types/';
import { Check, GraduationCap, Inbox, MessageSquare, Wallet, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import LeaseGenerationDialog from '@/components/leases/lease-generation-dialog';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, query, where, addDoc, updateDoc, getDoc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { PageSkeleton } from "@/components/dashboard/skeletons";
import { sendNotification } from '@/lib/notifications';
import { formatPrice } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { EmptyState, PageHeader, SectionCard, StatusBadge } from "@/components/dashboard";
import { useAsyncResult } from "@/hooks/use-async-result";
import { fetchDocsByIds } from "@/lib/firestore-batch";

type AggregatedRequest = {
  request: RentalApplication;
  applicant: UserProfile | null;
  property: Property | null;
};


export default function RentalRequestsPage() {
  const { user: landlord, profile: landlordProfile, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AggregatedRequest | null>(null);

  // Live sources: accepting/declining updates these lists automatically.
  const requestsQuery = useMemoFirebase(
    () => (landlord ? query(collection(firestore, 'rentalApplications'), where('landlordId', '==', landlord.uid)) : null),
    [landlord, firestore],
  );
  const offlineLeasesQuery = useMemoFirebase(
    () =>
      landlord
        ? query(
            collection(firestore, 'leaseAgreements'),
            where('landlordId', '==', landlord.uid),
            where('paymentMethod', '==', 'offline'),
            where('paymentConfirmed', '==', false),
          )
        : null,
    [landlord, firestore],
  );
  const { data: requests, isLoading: areRequestsLoading } = useCollection<RentalApplication>(requestsQuery);
  const { data: offlineLeases } = useCollection<LeaseAgreement>(offlineLeasesQuery);

  const { data: aggregatedRequests = [], isLoading: isAggregating } = useAsyncResult(
    requests,
    async (items): Promise<AggregatedRequest[]> => {
      const [people, properties] = await Promise.all([
        fetchDocsByIds<UserProfile>(firestore, 'users', items.map((r) => r.tenantId)),
        fetchDocsByIds<Property>(firestore, 'properties', items.map((r) => r.propertyId)),
      ]);
      return items
        .map((request) => ({
          request,
          applicant: people.get(request.tenantId) ?? null,
          property: properties.get(request.propertyId) ?? null,
        }))
        .sort((x, y) => new Date(y.request.applicationDate).getTime() - new Date(x.request.applicationDate).getTime());
    },
    { keepPrevious: true },
  );

  const { data: pendingOfflinePayments = [] } = useAsyncResult(
    offlineLeases,
    async (leases) => {
      const [people, properties] = await Promise.all([
        fetchDocsByIds<UserProfile>(firestore, 'users', leases.map((l) => l.tenantId)),
        fetchDocsByIds<Property>(firestore, 'properties', leases.map((l) => l.propertyId)),
      ]);
      return leases.map((lease) => ({
        lease,
        tenant: people.get(lease.tenantId) ?? null,
        property: properties.get(lease.propertyId) ?? null,
      }));
    },
    { keepPrevious: true },
  );

  const isLoading = isUserLoading || areRequestsLoading || isAggregating;

  const [tab, setTab] = useState<'pending' | 'approved' | 'declined'>('pending');
  // Optional ?property= filter, used when arriving from a property page.
  const propertyFilter = useSearchParams().get('property');
  const [requestToDecline, setRequestToDecline] = useState<AggregatedRequest | null>(null);

  const handleAcceptClick = (request: AggregatedRequest) => {
    if (!request.property?.leaseTemplate) {
      toast({
        variant: "destructive",
        title: "Add a lease template first",
        description: "This property has no lease template yet. Add one from the property's edit page, then accept again.",
      });
      return;
    }
    setSelectedRequest(request);
    setDialogOpen(true);
  };

  const handleDeclineClick = (requestId: string) => {
    const requestRef = doc(firestore, 'rentalApplications', requestId);
    updateDocumentNonBlocking(requestRef, { status: 'declined' });

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
    toast({ title: "Request declined", description: "The student has been notified." });
  };

  const handleLeaseSigned = async (finalText: string) => {
    if (selectedRequest && landlord) {
      const { request, property } = selectedRequest;
      if (!property) return;

      const requestRef = doc(firestore, 'rentalApplications', request.id);
      updateDocumentNonBlocking(requestRef, { status: 'approved' });

      const leaseStartDate = new Date().toISOString();
      const leaseCollectionRef = collection(firestore, 'leaseAgreements');
      const leaseDocRef = await addDoc(leaseCollectionRef, {
        propertyId: property.id,
        landlordId: landlord.uid,
        tenantId: request.tenantId,
        leaseText: finalText,
        landlordSigned: true,
        tenantSigned: false,
        startDate: leaseStartDate,
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        status: 'pending',
      });
      await updateDoc(leaseDocRef, { id: leaseDocRef.id });

      await sendNotification({
        toUserId: request.tenantId,
        type: 'REQUEST_ACCEPTED',
        firestore: firestore,
        propertyName: property.title,
        link: `/student/leases/${leaseDocRef.id}`
      });

      await sendNotification({
        toUserId: request.tenantId,
        type: 'LEASE_GENERATED',
        firestore: firestore,
        propertyName: property.title,
        link: `/student/leases/${leaseDocRef.id}`
      });
      toast({ title: "Request accepted", description: "A lease has been created and the tenant notified." });
    }
  };

  const handleApproveOfflinePayment = async (leaseId: string, tenantId: string, propertyId: string, propertyTitle: string) => {
    try {
      const leaseRef = doc(firestore, 'leaseAgreements', leaseId);
      const propertyRef = doc(firestore, 'properties', propertyId);

      await updateDoc(leaseRef, {
        paymentConfirmed: true,
        landlordApprovedOfflinePayment: true,
        status: 'active'
      });

      const leaseDoc = await getDoc(leaseRef);
      const leaseData = leaseDoc.data() as LeaseAgreement;

      await updateDoc(propertyRef, {
        status: 'occupied',
        currentTenantId: tenantId,
        leaseStartDate: leaseData.startDate
      });

      const property = pendingOfflinePayments.find(p => p.lease.id === leaseId)?.property;
      await addDoc(collection(firestore, 'transactions'), {
        landlordId: landlord!.uid,
        tenantId: tenantId,
        propertyId: propertyId,
        amount: leaseData.offlinePaymentAmount || property?.price || 0,
        months: leaseData.offlinePaymentMonths || 1,
        currency: leaseData.currency || property?.currency || 'USD',
        date: new Date().toISOString(),
        type: 'Rent',
        paymentMethod: 'Offline',
        status: 'Completed'
      });

      await sendNotification({
        toUserId: tenantId,
        type: 'OFFLINE_PAYMENT_APPROVED',
        firestore: firestore,
        propertyTitle: propertyTitle,
        link: `/student/tenancy`
      });
      toast({ title: "Payment confirmed", description: "The offline payment has been confirmed." });
    } catch (error) {
      console.error('Error approving offline payment:', error);
      toast({ variant: "destructive", title: "Could not confirm payment", description: "Please try again." });
    }
  };

  const handleRejectOfflinePayment = async (leaseId: string, tenantId: string, propertyTitle: string) => {
    try {
      const leaseRef = doc(firestore, 'leaseAgreements', leaseId);
      await updateDoc(leaseRef, {
        paymentMethod: null,
        paymentConfirmed: false
      });

      await sendNotification({
        toUserId: tenantId,
        type: 'OFFLINE_PAYMENT_REJECTED',
        firestore: firestore,
        propertyTitle: propertyTitle,
        link: `/student/leases/${leaseId}`
      });
      toast({ title: "Payment marked as not received", description: "The tenant has been asked to choose another payment method." });
    } catch (error) {
      console.error('Error rejecting offline payment:', error);
    }
  };

  if (isUserLoading || isLoading) {
    return <PageSkeleton variant="list" />;
  }

  const scoped = propertyFilter ? aggregatedRequests.filter((r) => r.request.propertyId === propertyFilter) : aggregatedRequests;
  const filteredTitle = propertyFilter ? scoped[0]?.property?.title ?? 'this property' : null;
  const counts = {
    pending: scoped.filter((r) => r.request.status === 'pending').length,
    approved: scoped.filter((r) => r.request.status === 'approved').length,
    declined: scoped.filter((r) => r.request.status === 'declined').length,
  };
  const visible = scoped.filter((r) => r.request.status === tab);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rental requests"
        description="Review students who want to rent your homes, and confirm bank-transfer payments."
      />

      {filteredTitle && (
        <div className="flex w-fit items-center gap-2 rounded-full border bg-card py-1 pl-3 pr-1 text-sm shadow-sm">
          Showing requests for <span className="font-medium">{filteredTitle}</span>
          <Link href="/landlord/requests" aria-label="Show all requests" className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {pendingOfflinePayments.length > 0 && (
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <Wallet aria-hidden className="h-4 w-4 text-emerald-600" /> Payments to confirm
            </span>
          }
          description="Only confirm once the money has arrived in your account."
        >
          <ul className="divide-y">
            {pendingOfflinePayments.map(({ lease, tenant, property }) => {
              if (!tenant || !property) return null;
              return (
                <li key={lease.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <PersonAvatar person={tenant} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{tenant.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {property.title} · {lease.offlinePaymentMonths || 1} month{(lease.offlinePaymentMonths || 1) === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  <p className="text-lg font-semibold sm:text-right">
                    {formatPrice(lease.offlinePaymentAmount || property.price, property.currency)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="rounded-lg"
                      onClick={() => handleApproveOfflinePayment(lease.id, tenant.id, property.id, property.title)}
                    >
                      <Check className="mr-1.5 h-4 w-4" /> Received
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      onClick={() => handleRejectOfflinePayment(lease.id, tenant.id, property.title)}
                    >
                      Not received
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}

      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
        <TabsList className="h-auto rounded-xl p-1">
          {(['pending', 'approved', 'declined'] as const).map((key) => (
            <TabsTrigger key={key} value={key} className="gap-2 rounded-lg px-3 py-1.5 capitalize">
              {key === 'pending' ? 'To review' : key}
              <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{counts[key]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={tab === 'pending' ? 'No requests to review' : `No ${tab} requests`}
          description={
            tab === 'pending'
              ? 'When a student asks to rent one of your homes, it will appear here.'
              : 'Requests you have handled will be listed here.'
          }
          action={
            tab === 'pending' ? (
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/landlord/properties">Manage listings</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => {
            const { request, applicant, property } = item;
            return (
              <li key={request.id} className="rounded-2xl border bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  <div className="flex min-w-0 flex-1 gap-4">
                    <PersonAvatar person={applicant} />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="font-semibold">{applicant?.name ?? 'Student'}</p>
                        <StatusBadge status={request.status} />
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(request.applicationDate), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Wants to rent{' '}
                        <Link href={`/landlord/properties/${property?.id}`} className="font-medium text-foreground hover:underline">
                          {property?.title ?? 'a property'}
                        </Link>
                        {property && <> · {formatPrice(property.price, property.currency)}/mo</>}
                      </p>
                      {applicant?.school && (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <GraduationCap aria-hidden className="h-3.5 w-3.5" /> {applicant.school}
                        </p>
                      )}
                      {request.messageToLandlord && (
                        <blockquote className="rounded-xl bg-muted/60 px-4 py-3 text-sm italic text-foreground/80">
                          &ldquo;{request.messageToLandlord}&rdquo;
                        </blockquote>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:w-56 lg:flex-col">
                    {request.status === 'pending' && (
                      <>
                        <Button className="flex-1 rounded-lg" onClick={() => handleAcceptClick(item)}>
                          <Check className="mr-1.5 h-4 w-4" /> Accept & send lease
                        </Button>
                        <Button variant="outline" className="flex-1 rounded-lg" onClick={() => setRequestToDecline(item)}>
                          Decline
                        </Button>
                      </>
                    )}
                    <Button asChild variant="ghost" className="flex-1 rounded-lg">
                      <Link href={`/landlord/messages?conversationId=${request.tenantId}`}>
                        <MessageSquare className="mr-1.5 h-4 w-4" /> Message
                      </Link>
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={!!requestToDecline} onOpenChange={(open) => !open && setRequestToDecline(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Decline this request?</AlertDialogTitle>
            <AlertDialogDescription>
              {requestToDecline?.applicant?.name ?? 'The student'} will be notified that you declined their request for{' '}
              {requestToDecline?.property?.title ?? 'this property'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Keep request</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (requestToDecline) handleDeclineClick(requestToDecline.request.id);
                setRequestToDecline(null);
              }}
            >
              Decline request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedRequest && landlordProfile && selectedRequest.applicant && selectedRequest.property?.leaseTemplate && (
        <LeaseGenerationDialog
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onLeaseSigned={handleLeaseSigned}
          landlord={landlordProfile}
          tenant={selectedRequest.applicant}
          property={selectedRequest.property}
          templateText={selectedRequest.property.leaseTemplate}
        />
      )}
    </div>
  );
}

function PersonAvatar({ person }: { person: UserProfile | null }) {
  return (
    <Avatar className="h-11 w-11 shrink-0">
      <AvatarImage src={person?.profileImageUrl} alt="" className="object-cover" />
      <AvatarFallback className="bg-primary/10 font-semibold text-primary">{person?.name?.[0]?.toUpperCase() ?? '?'}</AvatarFallback>
    </Avatar>
  );
}
