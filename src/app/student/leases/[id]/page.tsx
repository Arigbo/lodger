'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowRight, CreditCard, Download, FileX, Hourglass, KeyRound, Loader2, MessageSquare, PenLine, Printer } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { EmptyState, PageHeader, PageSkeleton, SectionCard, StatusBadge } from '@/components/dashboard';
import { LeaseDocument, LeaseProgress, downloadLeaseText } from '@/components/leases/lease-document';
import PaymentDialog from '@/components/payments/payment-dialog';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { authHeaders } from '@/lib/api-client';
import { sendNotification } from '@/lib/notifications';
import { formatPrice } from '@/lib/utils';
import type { LeaseAgreement, Property, UserProfile } from '@/types';

type PaymentDetails = { months: number; method: string; amount: number; transactionId?: string };

export default function StudentLeasePage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const leaseRef = useMemoFirebase(() => (id ? doc(firestore, 'leaseAgreements', id) : null), [firestore, id]);
  const { data: lease, isLoading: isLeaseLoading } = useDoc<LeaseAgreement>(leaseRef);
  const landlordRef = useMemoFirebase(() => (lease ? doc(firestore, 'users', lease.landlordId) : null), [firestore, lease?.landlordId]);
  const tenantRef = useMemoFirebase(() => (lease ? doc(firestore, 'users', lease.tenantId) : null), [firestore, lease?.tenantId]);
  const propertyRef = useMemoFirebase(() => (lease ? doc(firestore, 'properties', lease.propertyId) : null), [firestore, lease?.propertyId]);
  const { data: landlord } = useDoc<UserProfile>(landlordRef);
  const { data: tenant } = useDoc<UserProfile>(tenantRef);
  const { data: property } = useDoc<Property>(propertyRef);

  if (isUserLoading || isLeaseLoading) return <PageSkeleton variant="detail" />;

  if (!lease || !currentUser || currentUser.uid !== lease.tenantId) {
    return (
      <EmptyState
        className="mx-auto mt-10 max-w-xl"
        icon={FileX}
        title="We couldn't open this lease"
        description="It may have been removed, or it belongs to a different account."
        action={
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/student/leases">Back to leases</Link>
          </Button>
        }
      />
    );
  }

  const handlePaymentSuccess = async (details: PaymentDetails) => {
    if (!leaseRef) return;
    try {
      if (details.method === 'Offline') {
        // Bank transfer: the landlord confirms receipt before the lease activates.
        await updateDoc(leaseRef, {
          paymentMethod: 'offline',
          paymentConfirmed: false,
          offlinePaymentAmount: details.amount,
          offlinePaymentMonths: details.months,
        });
        await sendNotification({
          toUserId: lease.landlordId,
          type: 'OFFLINE_PAYMENT_PENDING',
          firestore,
          propertyName: property?.title || 'Property',
          transactionId: details.transactionId,
          link: '/landlord/requests',
        });
        toast({
          title: 'Bank transfer recorded',
          description: "We've asked your landlord to confirm it. Your tenancy starts once they do.",
        });
      } else {
        await updateDoc(leaseRef, { status: 'active', paymentMethod: 'stripe', paymentConfirmed: true });
        if (propertyRef) {
          await updateDoc(propertyRef, {
            status: 'occupied',
            currentTenantId: currentUser.uid,
            leaseStartDate: lease.startDate,
          });
          try {
            await fetch('/api/notify-applicants', {
              method: 'POST',
              headers: await authHeaders(),
              body: JSON.stringify({ propertyId: lease.propertyId, winnerTenantId: currentUser.uid, propertyTitle: property?.title }),
            });
          } catch (err) {
            console.error('Failed to notify other applicants', err);
          }
        }
        toast({ title: 'Payment received', description: 'Your tenancy is active. Welcome home!' });
      }
      setIsPaymentOpen(false);
    } catch (error) {
      console.error('Post-payment update failed:', error);
      toast({
        variant: 'destructive',
        title: "Payment went through, but we couldn't update your lease",
        description: 'Please contact support so we can fix it.',
      });
    }
  };

  const handleSignLease = async () => {
    if (!leaseRef) return;
    setIsSigning(true);
    try {
      const signedName = tenant?.legalName || tenant?.name || 'Tenant';
      const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      let updatedLeaseText = lease.leaseText.replace(/Tenant:\s*Nill/g, `Tenant: ${signedName}`);
      updatedLeaseText = updatedLeaseText.replace(/(Tenant:[^\n]*\n\s*Date:\s*)Nill/g, `$1${dateStr}`);
      // Older templates have no placeholder; append a signature line instead.
      if (!updatedLeaseText.includes(`Tenant: ${signedName}`)) {
        updatedLeaseText += `\n\nDigitally Signed by Tenant: ${signedName} on ${new Date().toLocaleString()}`;
      }
      // The lease stays pending until the first rent is paid.
      await updateDoc(leaseRef, { tenantSigned: true, leaseText: updatedLeaseText });
      toast({ title: 'Lease signed', description: 'One last step: pay your first rent.' });
      setSignOpen(false);
      setIsPaymentOpen(true);
    } catch (error) {
      console.error('Error signing lease:', error);
      toast({ variant: 'destructive', title: 'Could not sign the lease', description: 'Please try again.' });
    } finally {
      setIsSigning(false);
    }
  };

  const isPending = lease.status === 'pending';
  const offlinePending = lease.paymentMethod === 'offline' && !lease.paymentConfirmed;
  const needsSignature = isPending && !lease.tenantSigned;
  const needsPayment = isPending && lease.tenantSigned && !offlinePending;
  const rent = property ? formatPrice(property.price, property.currency) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: '/student/leases', label: 'Leases' }}
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
          {needsSignature && (
            <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <PenLine aria-hidden className="h-4 w-4 text-primary" /> Review and sign
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Read the whole agreement. Once you sign, you&apos;ll pay the first rent{rent ? ` (${rent})` : ''} to secure the home.
              </p>
              <Button className="mt-4 w-full rounded-xl" onClick={() => setSignOpen(true)}>
                Sign lease
              </Button>
            </section>
          )}

          {needsPayment && (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
              <h2 className="flex items-center gap-2 font-semibold text-emerald-900">
                <CreditCard aria-hidden className="h-4 w-4" /> Pay your first rent
              </h2>
              <p className="mt-1 text-sm text-emerald-900/80">
                You&apos;ve signed. Pay {rent ?? 'the first rent'} by card or bank transfer to move in.
              </p>
              <Button className="mt-4 w-full rounded-xl" onClick={() => setIsPaymentOpen(true)}>
                Pay {rent ?? 'now'}
              </Button>
            </section>
          )}

          {isPending && offlinePending && (
            <section className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
              <Hourglass aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <h2 className="font-semibold text-amber-900">Waiting for your landlord</h2>
                <p className="mt-1 text-sm text-amber-900/80">
                  You reported a bank transfer
                  {lease.offlinePaymentAmount ? ` of ${formatPrice(lease.offlinePaymentAmount, property?.currency)}` : ''}. Your
                  tenancy starts as soon as your landlord confirms they received it.
                </p>
              </div>
            </section>
          )}

          {(lease.status === 'active' || lease.status === 'terminating') && (
            <section className="rounded-2xl border bg-card p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-semibold">
                <KeyRound aria-hidden className="h-4 w-4 text-primary" /> Your tenancy is active
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Pay rent, report repairs and see your payment history.</p>
              <Button asChild className="mt-4 w-full rounded-xl">
                <Link href={`/student/tenancy/${lease.propertyId}`}>
                  Manage tenancy <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </section>
          )}

          <SectionCard title="Landlord" bodyClassName="p-5">
            {landlord ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={landlord.profileImageUrl} alt="" />
                    <AvatarFallback>{landlord.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{landlord.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{landlord.email}</p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="w-full rounded-lg">
                  <Link href={`/student/messages?conversationId=${landlord.id}`}>
                    <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Ask a question
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Landlord details unavailable.</p>
            )}
          </SectionCard>
        </aside>
      </div>

      <AlertDialog
        open={signOpen}
        onOpenChange={(open) => {
          setSignOpen(open);
          if (!open) setAgreed(false);
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign this lease?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;re signing as {tenant?.legalName || tenant?.name || 'the tenant'}. Your electronic signature is legally binding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-4">
            <Checkbox id="agree-lease" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
            <Label htmlFor="agree-lease" className="text-sm font-normal leading-snug">
              I have read the whole agreement and agree to its terms, including rent of {rent ?? 'the stated amount'} per month.
            </Label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg" disabled={isSigning}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg"
              disabled={!agreed || isSigning}
              onClick={(e) => {
                e.preventDefault();
                void handleSignLease();
              }}
            >
              {isSigning && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Sign and continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {property && (
        <PaymentDialog
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          onPaymentSuccess={handlePaymentSuccess}
          amount={property.price}
          tenantName={tenant?.name || currentUser.displayName || currentUser.email || ''}
          tenantId={currentUser.uid}
          landlordId={lease.landlordId}
          propertyId={lease.propertyId}
          currency={property.currency}
          destinationAccountId={landlord?.stripeAccountId}
          metadata={{ type: 'Lease Activation', leaseId: lease.id }}
        />
      )}
    </div>
  );
}
