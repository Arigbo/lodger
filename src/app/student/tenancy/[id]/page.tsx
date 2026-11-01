'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { add, differenceInCalendarDays, format, formatDistanceToNow, isPast } from 'date-fns';
import {
  AlertTriangle,
  CalendarClock,
  CreditCard,
  FileText,
  Home,
  Hourglass,
  Mail,
  MessageSquare,
  PenLine,
  Receipt,
  Wallet,
  Wrench,
} from 'lucide-react';
import { collection, doc, query, updateDoc, where } from 'firebase/firestore';
import { EmptyState, PageHeader, PageSkeleton, SectionCard, StatCard, StatGrid, StatusBadge } from '@/components/dashboard';
import { ReportIssueDialog } from '@/components/maintenance/report-issue-dialog';
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
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { sendNotification } from '@/lib/notifications';
import { formatPrice } from '@/lib/utils';
import type { LeaseAgreement, MaintenanceRequest, Property, Transaction, UserProfile } from '@/types';

type PaymentDetails = { months: number; method: string; amount: number };

const RENT_TYPES = new Set(['Rent', 'Lease Activation']);
const isAwaiting = (t: Transaction) => t.status === 'Pending' || t.status === 'Pending Verification';

/** The lease that matters most for this home: current, then pending, then the latest. */
function pickLease(leases: LeaseAgreement[] | null) {
  if (!leases?.length) return undefined;
  const rank = { active: 0, terminating: 0, pending: 1, expired: 2 } as const;
  return [...leases].sort((a, b) => rank[a.status] - rank[b.status] || b.startDate.localeCompare(a.startDate))[0];
}

export default function TenancyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isVacateOpen, setIsVacateOpen] = useState(false);

  const propertyRef = useMemoFirebase(() => (id ? doc(firestore, 'properties', id) : null), [firestore, id]);
  const { data: property, isLoading: isPropertyLoading } = useDoc<Property>(propertyRef);
  const landlordRef = useMemoFirebase(
    () => (property ? doc(firestore, 'users', property.landlordId) : null),
    [firestore, property?.landlordId],
  );
  const { data: landlord } = useDoc<UserProfile>(landlordRef);

  const mine = (name: string) =>
    user && id ? query(collection(firestore, name), where('tenantId', '==', user.uid), where('propertyId', '==', id)) : null;
  const leaseQuery = useMemoFirebase(() => mine('leaseAgreements'), [firestore, user, id]);
  const txQuery = useMemoFirebase(() => mine('transactions'), [firestore, user, id]);
  const repairsQuery = useMemoFirebase(() => mine('maintenanceRequests'), [firestore, user, id]);
  const { data: leases, isLoading: isLeaseLoading } = useCollection<LeaseAgreement>(leaseQuery);
  const { data: transactions } = useCollection<Transaction>(txQuery);
  const { data: repairs } = useCollection<MaintenanceRequest>(repairsQuery);
  const lease = pickLease(leases);

  const handlePaymentSuccess = async (details: PaymentDetails) => {
    if (!lease || !property || !user) return;
    try {
      if (lease.status === 'pending') {
        const leaseRef = doc(firestore, 'leaseAgreements', lease.id);
        if (details.method === 'Offline') {
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
            propertyName: property.title,
            link: '/landlord/requests',
          });
          toast({ title: 'Bank transfer recorded', description: 'Your tenancy starts once your landlord confirms it.' });
        } else {
          await updateDoc(leaseRef, { status: 'active', paymentMethod: 'stripe', paymentConfirmed: true });
          await updateDoc(doc(firestore, 'properties', property.id), {
            status: 'occupied',
            currentTenantId: user.uid,
            leaseStartDate: new Date().toISOString(),
          });
          await sendNotification({
            toUserId: lease.landlordId,
            type: 'LEASE_SIGNED',
            firestore,
            propertyName: property.title,
            link: `/landlord/leases/${lease.id}`,
            customMessage: `${profile?.name || 'Your tenant'} signed the lease and paid the first month's rent.`,
          });
          toast({ title: 'Tenancy active', description: 'Your payment is confirmed. Welcome home!' });
        }
      } else {
        toast({
          title: details.method === 'Offline' ? 'Bank transfer recorded' : 'Payment received',
          description:
            details.method === 'Offline'
              ? 'Your landlord will confirm it shortly.'
              : `${formatPrice(details.amount, property.currency)} for ${details.months} month${details.months === 1 ? '' : 's'}.`,
        });
      }
      setIsPaymentOpen(false);
    } catch (error) {
      console.error('Error finalising payment:', error);
      toast({
        variant: 'destructive',
        title: "Payment went through, but we couldn't update your tenancy",
        description: 'Please contact support so we can fix it.',
      });
    }
  };

  const closeTenancy = async () => {
    if (!lease || !property) return;
    try {
      await updateDoc(doc(firestore, 'leaseAgreements', lease.id), { status: 'expired', endDate: new Date().toISOString() });
      await updateDoc(doc(firestore, 'properties', property.id), { status: 'available', currentTenantId: null, leaseStartDate: null });
      toast({ title: 'Tenancy closed', description: 'Thanks for confirming. Please hand back the keys within 48 hours.' });
      setIsVacateOpen(false);
      router.push('/student');
    } catch (error) {
      console.error('Error closing tenancy:', error);
      toast({ variant: 'destructive', title: 'Could not close the tenancy', description: 'Please try again.' });
    }
  };

  // Close the tenancy automatically once the termination grace period has passed.
  const autoClose = useEffectEvent(() => void closeTenancy());
  useEffect(() => {
    if (lease?.status === 'terminating' && lease.terminationGracePeriodEnd && isPast(new Date(lease.terminationGracePeriodEnd))) {
      const timer = setTimeout(autoClose, 0); // cancelled on cleanup, so it runs once under StrictMode
      return () => clearTimeout(timer);
    }
  }, [lease?.status, lease?.terminationGracePeriodEnd]);

  if (isUserLoading || isPropertyLoading || isLeaseLoading) return <PageSkeleton variant="overview" />;

  if (!property || !lease || !user) {
    return (
      <EmptyState
        className="mx-auto mt-10 max-w-xl"
        icon={Home}
        title="We couldn't find this tenancy"
        description="It may have ended, or it belongs to a different account."
        action={
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/student">Back to home</Link>
          </Button>
        }
      />
    );
  }

  // Rent schedule, derived from the lease and completed rent payments.
  const rentPayments = (transactions ?? []).filter((t) => RENT_TYPES.has(t.type));
  const monthsPaid = rentPayments.filter((t) => t.status === 'Completed').reduce((sum, t) => sum + (t.months || t.monthsPaid || 1), 0);
  const totalPaid = rentPayments.filter((t) => t.status === 'Completed').reduce((sum, t) => sum + (t.amount || 0), 0);
  const start = new Date(lease.startDate || property.leaseStartDate || lease.endDate);
  const end = lease.endDate ? new Date(lease.endDate) : add(start, { years: 1 });
  const nextDue = add(start, { months: monthsPaid });
  const daysToDue = differenceInCalendarDays(nextDue, new Date());
  const daysLeft = Math.max(0, differenceInCalendarDays(end, new Date()));

  const isCurrent = lease.status === 'active' || lease.status === 'terminating';
  const offlineActivationPending = lease.status === 'pending' && lease.paymentMethod === 'offline' && !lease.paymentConfirmed;
  const paymentAwaiting = rentPayments.some(isAwaiting) || offlineActivationPending;
  const canPay = (lease.status === 'active' || (lease.status === 'pending' && lease.tenantSigned)) && !paymentAwaiting;
  const overdue = lease.status === 'active' && daysToDue < 0;
  const sortedPayments = [...(transactions ?? [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const sortedRepairs = [...(repairs ?? [])].sort((a, b) => b.requestDate.localeCompare(a.requestDate));
  const openRepairs = sortedRepairs.filter((r) => r.status === 'Pending' || r.status === 'In Progress').length;

  const reportButton = landlord && isCurrent && (
    <ReportIssueDialog
      propertyId={property.id}
      propertyTitle={property.title}
      landlordId={property.landlordId}
      tenantId={user.uid}
      tenantName={profile?.name || 'Your tenant'}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: '/student', label: 'Home' }}
        eyebrow={isCurrent ? 'Your home' : 'Upcoming home'}
        title={property.title}
        description={[property.location?.address, property.location?.city].filter(Boolean).join(', ')}
        actions={
          <>
            {landlord && (
              <Button asChild variant="outline" className="rounded-xl">
                <Link href={`/student/messages?conversationId=${landlord.id}`}>
                  <MessageSquare className="mr-1.5 h-4 w-4" /> Message landlord
                </Link>
              </Button>
            )}
            {canPay && (
              <Button className="rounded-xl" onClick={() => setIsPaymentOpen(true)}>
                <CreditCard className="mr-1.5 h-4 w-4" /> {lease.status === 'pending' ? 'Pay first rent' : 'Pay rent'}
              </Button>
            )}
          </>
        }
      />

      {/* What needs attention */}
      {lease.status === 'pending' && !lease.tenantSigned && (
        <Banner tone="primary" icon={PenLine} title="Sign your lease to secure this home">
          <p>Your request was accepted. Review the agreement and sign it, then pay the first rent.</p>
          <Button asChild size="sm" className="mt-3 rounded-lg">
            <Link href={`/student/leases/${lease.id}`}>Review lease</Link>
          </Button>
        </Banner>
      )}
      {paymentAwaiting && (
        <Banner tone="warning" icon={Hourglass} title="Payment waiting for confirmation">
          <p>Your landlord needs to confirm your bank transfer. We&apos;ll notify you as soon as they do.</p>
        </Banner>
      )}
      {overdue && !paymentAwaiting && (
        <Banner tone="danger" icon={AlertTriangle} title={`Rent was due ${formatDistanceToNow(nextDue, { addSuffix: true })}`}>
          <p>Pay now to stay up to date, or message your landlord if you need more time.</p>
          <Button size="sm" className="mt-3 rounded-lg" onClick={() => setIsPaymentOpen(true)}>
            Pay {formatPrice(property.price, property.currency)}
          </Button>
        </Banner>
      )}
      {lease.status === 'terminating' && (
        <Banner tone="danger" icon={AlertTriangle} title="Your tenancy is ending">
          <p>
            Your landlord has ended the tenancy. You&apos;re due a pro-rated refund of{' '}
            <strong>{formatPrice(lease.calculatedRefund || 0, property.currency)}</strong>
            {lease.terminationGracePeriodEnd && <> and must move out by {format(new Date(lease.terminationGracePeriodEnd), 'd MMMM yyyy')}</>}.
          </p>
          <Button size="sm" variant="destructive" className="mt-3 rounded-lg" onClick={() => setIsVacateOpen(true)}>
            I&apos;ve received my refund
          </Button>
        </Banner>
      )}

      <StatGrid>
        <StatCard
          label="Next rent"
          value={isCurrent ? format(nextDue, 'd MMM') : '—'}
          icon={CalendarClock}
          tone={overdue ? 'danger' : daysToDue <= 7 ? 'warning' : 'default'}
          hint={
            !isCurrent
              ? 'Starts when your tenancy is active'
              : overdue
                ? 'Overdue'
                : daysToDue === 0
                  ? 'Due today'
                  : `In ${daysToDue} day${daysToDue === 1 ? '' : 's'}`
          }
        />
        <StatCard label="Monthly rent" value={formatPrice(property.price, property.currency)} icon={Wallet} />
        <StatCard label="Lease ends" value={format(end, 'd MMM yyyy')} icon={Home} hint={isCurrent ? `${daysLeft} days left` : undefined} />
        <StatCard label="Paid so far" value={formatPrice(totalPaid, property.currency)} icon={Receipt} tone="success" hint={`${monthsPaid} month${monthsPaid === 1 ? '' : 's'} of rent`} />
      </StatGrid>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Payments" description={sortedPayments.length ? `${sortedPayments.length} payment${sortedPayments.length === 1 ? '' : 's'}` : undefined}>
            {sortedPayments.length ? (
              <ul className="divide-y">
                {sortedPayments.map((t) => (
                  <li key={t.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Receipt aria-hidden className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {t.type === 'Lease Activation' ? 'First payment' : t.type}
                        {(t.months ?? 1) > 1 && <span className="text-muted-foreground"> · {t.months} months</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.date ? format(new Date(t.date), 'd MMM yyyy') : '—'} · {t.paymentMethod ?? t.method ?? 'Card'}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{formatPrice(t.amount, t.currency)}</span>
                    <StatusBadge status={t.status} className="hidden sm:inline-flex" />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                className="m-5 border-none bg-transparent py-10"
                icon={Receipt}
                title="No payments yet"
                description="Your rent payments and receipts will appear here."
              />
            )}
          </SectionCard>

          <SectionCard
            title="Repairs"
            description={openRepairs ? `${openRepairs} open` : 'Report anything that needs fixing'}
            action={sortedRepairs.length ? reportButton : undefined}
          >
            {sortedRepairs.length ? (
              <ul className="divide-y">
                {sortedRepairs.map((r) => (
                  <li key={r.id} className="flex items-start gap-4 px-5 py-3.5">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                      <Wrench aria-hidden className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.title}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.category} · {r.priority === 'High' ? 'Urgent' : `${r.priority} priority`} · reported{' '}
                        {formatDistanceToNow(new Date(r.requestDate), { addSuffix: true })}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                className="m-5 border-none bg-transparent py-10"
                icon={Wrench}
                title="No repairs reported"
                description={isCurrent ? 'Something broken? Let your landlord know and track the fix here.' : 'You can report repairs once you move in.'}
                action={reportButton || undefined}
              />
            )}
          </SectionCard>
        </div>

        <aside className="space-y-6">
          <SectionCard title="Landlord" bodyClassName="p-5">
            {landlord ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={landlord.profileImageUrl} alt="" />
                    <AvatarFallback>{landlord.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{landlord.name}</p>
                    <a href={`mailto:${landlord.email}`} className="flex items-center gap-1 truncate text-xs text-muted-foreground hover:underline">
                      <Mail aria-hidden className="h-3 w-3" /> {landlord.email}
                    </a>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="w-full rounded-lg">
                  <Link href={`/student/messages?conversationId=${landlord.id}`}>
                    <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Send a message
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Landlord details unavailable.</p>
            )}
          </SectionCard>

          <SectionCard title="Lease" action={{ href: `/student/leases/${lease.id}`, label: 'Open' }} bodyClassName="p-5">
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <StatusBadge status={lease.status} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Starts</dt>
                <dd className="font-medium">{format(start, 'd MMM yyyy')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Ends</dt>
                <dd className="font-medium">{format(end, 'd MMM yyyy')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Signed</dt>
                <dd className="font-medium">
                  {lease.tenantSigned && lease.landlordSigned ? 'Both parties' : lease.tenantSigned ? 'You' : lease.landlordSigned ? 'Landlord' : 'Not yet'}
                </dd>
              </div>
            </dl>
            <Button asChild variant="outline" size="sm" className="mt-4 w-full rounded-lg">
              <Link href={`/student/leases/${lease.id}`}>
                <FileText className="mr-1.5 h-3.5 w-3.5" /> View agreement
              </Link>
            </Button>
          </SectionCard>
        </aside>
      </div>

      <AlertDialog open={isVacateOpen} onOpenChange={setIsVacateOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm you&apos;ve received your refund?</AlertDialogTitle>
            <AlertDialogDescription>
              This closes your tenancy. You&apos;ll need to move out and hand back the keys within <strong>48 hours</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Not yet</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void closeTenancy();
              }}
            >
              Confirm and close tenancy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PaymentDialog
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onPaymentSuccess={handlePaymentSuccess}
        amount={property.price}
        tenantName={profile?.name || user.displayName || user.email || ''}
        tenantId={user.uid}
        landlordId={property.landlordId}
        propertyId={property.id}
        currency={property.currency}
        destinationAccountId={landlord?.stripeAccountId}
        metadata={{ type: lease.status === 'pending' ? 'Lease Activation' : 'Rent', leaseId: lease.id }}
      />
    </div>
  );
}

const BANNER_TONES = {
  primary: 'border-primary/30 bg-primary/5 [&_h2]:text-foreground [&_svg.banner-icon]:text-primary',
  warning: 'border-amber-200 bg-amber-50/70 text-amber-900 [&_svg.banner-icon]:text-amber-600',
  danger: 'border-red-200 bg-red-50/70 text-red-900 [&_svg.banner-icon]:text-red-600',
} as const;

function Banner({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: keyof typeof BANNER_TONES;
  icon: typeof Home;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`flex gap-3 rounded-2xl border p-5 ${BANNER_TONES[tone]}`}>
      <Icon aria-hidden className="banner-icon mt-0.5 h-5 w-5 shrink-0" />
      <div className="text-sm">
        <h2 className="mb-1 font-semibold">{title}</h2>
        {children}
      </div>
    </section>
  );
}
