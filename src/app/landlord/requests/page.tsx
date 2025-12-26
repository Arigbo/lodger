'use client';

import * as React from 'react';
import { useState } from 'react';
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
import { Check, X, Bell, User as UserIcon, MessageSquare, Calendar, Building, Wallet, ArrowRight, ShieldCheck, Clock, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import LeaseGenerationDialog from '@/components/lease-generation-dialog';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, getDocs, addDoc, updateDoc, documentId, getDoc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import Loading from '@/app/loading';
import { sendNotification } from '@/lib/notifications';
import { formatPrice } from '@/utils';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
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
    toast({ title: "Inquiry Declined", description: "The applicant has been notified of your decision." });
  };

  const handleLeaseSigned = async () => {
    if (selectedRequest && landlord && selectedRequest.property?.leaseTemplate) {
      const { request, property } = selectedRequest;
      const requestRef = doc(firestore, 'rentalApplications', request.id);
      updateDocumentNonBlocking(requestRef, { status: 'approved' });

      const leaseStartDate = new Date().toISOString();
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

      setAggregatedRequests(prev => prev.map(ar =>
        ar.request.id === request.id
          ? { ...ar, request: { ...ar.request, status: 'approved' } }
          : ar
      ));
      toast({ title: "Authority Granted", description: "Lease protocol initiated and tenant notified." });
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
        monthsPaid: leaseData.offlinePaymentMonths || 1,
        currency: leaseData.currency || property?.currency || 'USD',
        date: new Date().toISOString(),
        type: 'Rent',
        status: 'Completed'
      });

      await sendNotification({
        toUserId: tenantId,
        type: 'OFFLINE_PAYMENT_APPROVED',
        firestore: firestore,
        propertyTitle: propertyTitle,
        link: `/student/tenancy`
      });

      setPendingOfflinePayments(prev => prev.filter(p => p.lease.id !== leaseId));
      toast({ title: "Revenue Confirmed", description: "Offline payment authenticated successfully." });
    } catch (error) {
      console.error('Error approving offline payment:', error);
      toast({ variant: "destructive", title: "Authentication Error", description: "Failed to confirm offline revenue." });
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

      setPendingOfflinePayments(prev => prev.filter(p => p.lease.id !== leaseId));
      toast({ title: "Payment Rejected", description: "Tenant redirected to re-choose payment protocol." });
    } catch (error) {
      console.error('Error rejecting offline payment:', error);
    }
  };

  if (isUserLoading || isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-16 pb-32 animate-in fade-in duration-1000">
      {/* Cinematic Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b-4 border-foreground/5">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic">INQUIRY MANAGEMENT</p>
          </div>
          <h1 className="font-headline text-5xl md:text-6xl font-black tracking-tight text-foreground uppercase">
            REQUEST <span className="text-primary italic">CENTER</span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium italic font-serif">
            &quot;Filtering prospective residents and authenticating financial yields.&quot;
          </p>
        </div>
        <div className="flex gap-4">
          <div className="bg-blue-500/5 px-6 py-4 rounded-[2rem] border-2 border-blue-500/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1 italic">Pending Applications</p>
            <p className="text-3xl font-black text-blue-600">{pendingRequests.length}</p>
          </div>
          {pendingOfflinePayments.length > 0 && (
            <div className="bg-orange-500/5 px-6 py-4 rounded-[2rem] border-2 border-orange-500/10 animate-pulse">
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-1 italic">Payment Tasks</p>
              <p className="text-3xl font-black text-orange-600">{pendingOfflinePayments.length}</p>
            </div>
          )}
        </div>
      </div>

      {/* Application Stream */}
      <div className="space-y-10">
        <div className="flex items-center gap-4 px-2">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <UserIcon className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight">Active <span className="text-primary italic">Inquiries</span></h2>
        </div>

        {pendingRequests.length === 0 ? (
          <Card className="rounded-[3.5rem] border-2 border-dashed border-foreground/10 bg-muted/5 p-24 text-center space-y-8">
            <div className="h-32 w-32 rounded-[2.5rem] bg-white shadow-2xl flex items-center justify-center mx-auto relative group overflow-hidden">
              <Bell className="h-14 w-14 text-muted-foreground/20 group-hover:scale-110 transition-transform" />
              <div className="absolute inset-0 bg-primary/5 rounded-[2.5rem]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tight italic">Silent Channels</h3>
              <p className="text-lg text-muted-foreground font-serif italic max-w-sm mx-auto">
                &quot;Your communication channels are currently clear. Incoming application data will manifest here.&quot;
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {pendingRequests.map((aggregatedRequest) => {
              const { request, applicant, property } = aggregatedRequest;
              if (!applicant || !property) return null;
              return (
                <Card key={request.id} className="group overflow-hidden rounded-[3rem] border-2 border-foreground/5 bg-white hover:shadow-3xl transition-all duration-500 p-8 md:p-10">
                  <div className="flex flex-col lg:flex-row gap-10">
                    {/* Applicant Profile */}
                    <div className="flex items-center gap-6 lg:w-1/3 border-r-2 border-muted/5 pr-10">
                      <div className="relative">
                        <Avatar className="h-24 w-24 rounded-[2rem] ring-4 ring-primary/5 ring-offset-4 ring-offset-white">
                          <AvatarImage src={applicant?.profileImageUrl} className="object-cover" />
                          <AvatarFallback className="bg-muted text-2xl font-black uppercase italic">
                            {applicant?.name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary italic">Identity Profile</p>
                        <h3 className="text-2xl font-black uppercase tracking-tight">{applicant?.name}</h3>
                        <p className="text-xs font-bold text-muted-foreground/60">{applicant?.email}</p>
                      </div>
                    </div>

                    {/* Property Connection */}
                    <div className="flex-1 space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">Asset Target</p>
                          <Link href={`/landlord/properties/${property.id}`} className="group/link flex items-center gap-2 text-xl font-black uppercase tracking-tight hover:text-primary transition-colors">
                            {property.title} <ExternalLink className="h-4 w-4 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                          </Link>
                          <p className="text-xs font-medium text-muted-foreground italic font-serif">
                            &quot;{request.messageToLandlord || "Standard inquiry protocol initiated without custom parameters."}&quot;
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">Submission Date</p>
                          <p className="text-sm font-black text-foreground">{new Date(request.applicationDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 pt-4 border-t-2 border-muted/5">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/20 text-[10px] font-black uppercase tracking-widest">
                          <Clock className="h-3 w-3 text-primary" /> Status: {request.status}
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/20 text-[10px] font-black uppercase tracking-widest">
                          <Wallet className="h-3 w-3 text-primary" /> Yield: {formatPrice(property.price, property.currency)}
                        </div>
                      </div>
                    </div>

                    {/* Decision Matrix */}
                    <div className="lg:w-1/4 flex lg:flex-col gap-4 justify-center items-stretch">
                      <Button
                        onClick={() => handleAcceptClick(aggregatedRequest)}
                        className="h-16 rounded-2xl bg-foreground text-white hover:bg-primary transition-all font-black text-xs uppercase tracking-widest gap-3 shadow-xl"
                      >
                        <Check className="h-5 w-5" /> GRANT AUTHORITY
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDeclineClick(request.id)}
                        className="h-16 rounded-2xl border-2 hover:bg-destructive hover:text-white hover:border-destructive transition-all font-black text-xs uppercase tracking-widest gap-3"
                      >
                        <X className="h-5 w-5" /> DECLINE INQUIRY
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Offline Payment Sector */}
      {pendingOfflinePayments.length > 0 && (
        <div className="space-y-10">
          <div className="flex items-center gap-4 px-2">
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-orange-600" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight">Financial <span className="text-orange-600 italic">Confirmations</span></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {pendingOfflinePayments.map(({ lease, tenant, property }) => {
              if (!tenant || !property) return null;
              return (
                <Card key={lease.id} className="group relative overflow-hidden rounded-[3rem] border-2 border-orange-500/10 bg-white hover:shadow-2xl transition-all duration-500 p-8">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-bl-[4rem] -mr-6 -mt-6" />

                  <div className="space-y-8 relative z-10">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 rounded-2xl ring-2 ring-orange-500/10">
                        <AvatarImage src={tenant.profileImageUrl} className="object-cover" />
                        <AvatarFallback className="bg-muted text-xl font-black uppercase italic">
                          {tenant.name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="text-xl font-black uppercase tracking-tight">{tenant.name}</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">RESIDENT IDENTIFIED</p>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-orange-500/5 border-2 border-orange-500/5 space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-600/60 italic">OFFLINE REVENUE</p>
                        <p className="text-2xl font-black text-orange-600">{formatPrice(lease.offlinePaymentAmount || property.price, property.currency)}</p>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-orange-500/10">
                        <p className="text-xs font-bold text-muted-foreground/60 italic">TENANCY TERM</p>
                        <p className="text-xs font-black uppercase">{lease.offlinePaymentMonths || 1} Month(s) Pre-Paid</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-center italic">Verify physical receipt of funds before proceeding</p>
                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          onClick={() => handleApproveOfflinePayment(lease.id, tenant.id, property.id, property.title)}
                          className="h-14 rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition-all font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg"
                        >
                          <Check className="h-4 w-4" /> AUTHENTICATE
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleRejectOfflinePayment(lease.id, tenant.id, property.title)}
                          className="h-14 rounded-xl border-2 border-orange-500/20 hover:bg-orange-50 text-orange-600 transition-all font-black text-[10px] uppercase tracking-widest gap-2"
                        >
                          <X className="h-4 w-4" /> REJECT
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
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


