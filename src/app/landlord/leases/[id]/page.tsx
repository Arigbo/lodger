'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { Download, FileX, Hourglass, Loader2, MessageSquare, PenLine, Printer, Wallet } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { EmptyState, PageHeader, PageSkeleton, SectionCard, StatusBadge } from '@/components/dashboard';
import { LeaseDocument, LeaseProgress, downloadLeaseText } from '@/components/leases/lease-document';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/utils';
import type { LeaseAgreement, Property, UserProfile } from '@/types';

export default function LandlordLeasePage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const leaseRef = useMemoFirebase(() => (id ? doc(firestore, 'leaseAgreements', id) : null), [firestore, id]);
  const { data: lease, isLoading: isLeaseLoading } = useDoc<LeaseAgreement>(leaseRef);
  const landlordRef = useMemoFirebase(() => (lease ? doc(firestore, 'users', lease.landlordId) : null), [firestore, lease?.landlordId]);
  const tenantRef = useMemoFirebase(() => (lease ? doc(firestore, 'users', lease.tenantId) : null), [firestore, lease?.tenantId]);
  const propertyRef = useMemoFirebase(() => (lease ? doc(firestore, 'properties', lease.propertyId) : null), [firestore, lease?.propertyId]);
  const { data: landlord } = useDoc<UserProfile>(landlordRef);
  const { data: tenant } = useDoc<UserProfile>(tenantRef);
  const { data: property } = useDoc<Property>(propertyRef);

  const handleSignLease = async () => {
    if (!leaseRef || !lease) return;
    setIsSigning(true);
    try {
      const signedName = landlord?.legalName || landlord?.name || 'Landlord';
      const signatureLine = `\n\nDigitally Signed by Landlord: ${signedName} on ${new Date().toLocaleString()}`;
      await updateDoc(leaseRef, { landlordSigned: true, leaseText: lease.leaseText + signatureLine });
      toast({
        title: 'Lease signed',
        description: lease.tenantSigned ? 'Both parties have now signed.' : 'Your signature is recorded. Waiting for the tenant to sign.',
      });
    } catch (error) {
      console.error('Error signing lease:', error);
      toast({ variant: 'destructive', title: 'Could not sign the lease', description: 'Please try again.' });
    } finally {
      setIsSigning(false);
      setConfirmOpen(false);
    }
  };

  if (isUserLoading || isLeaseLoading) return <PageSkeleton variant="detail" />;

  if (!lease || !currentUser || currentUser.uid !== lease.landlordId) {
    return (
      <EmptyState
        className="mx-auto mt-10 max-w-xl"
        icon={FileX}
        title="We couldn't open this lease"
        description="It may have been removed, or it belongs to a different account."
        action={
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/landlord/leases">Back to leases</Link>
          </Button>
        }
      />
    );
  }

  const isPending = lease.status === 'pending';
  const offlinePending = isPending && lease.paymentMethod === 'offline' && !lease.paymentConfirmed;
  const tenantName = tenant?.name ?? 'the tenant';

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: '/landlord/leases', label: 'Leases' }}
        title={property?.title ?? 'Lease agreement'}
        description={`${format(new Date(lease.startDate), 'd MMM yyyy')} – ${format(new Date(lease.endDate), 'd MMM yyyy')}`}
        actions={
          <>
            <StatusBadge status={lease.status} className="text-sm" />
            <Button variant="outline" className="rounded-xl" onClick={() => downloadLeaseText(lease, property)}>
              <Download className="mr-1.5 h-4 w-4" /> Download
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-4 w-4" /> Print
            </Button>
          </>
        }
      />

      {isPending && (
        <div className="rounded-2xl border bg-card p-5 shadow-sm print:hidden">
          <LeaseProgress lease={lease} />
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LeaseDocument lease={lease} property={property} landlord={landlord} tenant={tenant} />
        </div>

        <aside className="space-y-6 print:hidden lg:sticky lg:top-20">
          {isPending && !lease.landlordSigned && (
            <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <PenLine aria-hidden className="h-4 w-4 text-primary" /> Your signature is needed
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Check the terms, then sign. {tenantName} can sign before or after you.
              </p>
              <Button className="mt-4 w-full rounded-xl" onClick={() => setConfirmOpen(true)}>
                Sign lease
              </Button>
            </section>
          )}

          {offlinePending && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
              <h2 className="flex items-center gap-2 font-semibold text-amber-900">
                <Wallet aria-hidden className="h-4 w-4" /> Bank transfer to confirm
              </h2>
              <p className="mt-1 text-sm text-amber-900/80">
                {tenantName} says they sent
                {lease.offlinePaymentAmount ? ` ${formatPrice(lease.offlinePaymentAmount, property?.currency)}` : ' the first payment'}.
                Confirm once it reaches your account to activate the tenancy.
              </p>
              <Button asChild className="mt-4 w-full rounded-xl">
                <Link href="/landlord/requests">Review payment</Link>
              </Button>
            </section>
          )}

          {isPending && lease.landlordSigned && !offlinePending && (
            <section className="flex gap-3 rounded-2xl border bg-card p-5 shadow-sm">
              <Hourglass aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <h2 className="font-semibold">Waiting on {tenantName}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {lease.tenantSigned
                    ? 'They have signed. The tenancy starts once they pay the first rent.'
                    : "They'll be asked to sign and pay the first rent. We'll notify you."}
                </p>
              </div>
            </section>
          )}

          <SectionCard title="Tenant" bodyClassName="p-5">
            {tenant ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={tenant.profileImageUrl} alt="" />
                    <AvatarFallback>{tenant.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{tenant.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{tenant.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild variant="outline" size="sm" className="rounded-lg">
                    <Link href={`/landlord/messages?contact=${tenant.id}`}>
                      <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Message
                    </Link>
                  </Button>
                  {lease.status !== 'pending' ? (
                    <Button asChild variant="outline" size="sm" className="rounded-lg">
                      <Link href={`/landlord/tenants/${tenant.id}`}>Tenancy</Link>
                    </Button>
                  ) : (
                    <Button asChild variant="outline" size="sm" className="rounded-lg">
                      <Link href={`/landlord/properties/${lease.propertyId}`}>Property</Link>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Tenant details unavailable.</p>
            )}
          </SectionCard>
        </aside>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign this lease?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;re signing as {landlord?.legalName || landlord?.name || 'the landlord'}. Your electronic signature is legally binding
              and is added to the agreement with today&apos;s date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg" disabled={isSigning}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg"
              disabled={isSigning}
              onClick={(e) => {
                e.preventDefault();
                void handleSignLease();
              }}
            >
              {isSigning && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Sign lease
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
