'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { Building2, Check, Mail, Printer, Receipt, X } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { EmptyState, PageHeader, PageSkeleton, SectionCard, StatusBadge } from '@/components/dashboard';
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
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { sendNotification } from '@/lib/notifications';
import { formatPrice } from '@/lib/utils';
import type { Property, Transaction, UserProfile } from '@/types';

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [pendingAction, setPendingAction] = useState<'confirm' | 'deny' | null>(null);
  const [busy, setBusy] = useState(false);

  const txRef = useMemoFirebase(() => (id ? doc(firestore, 'transactions', id) : null), [firestore, id]);
  const { data: tx, isLoading } = useDoc<Transaction>(txRef);
  const tenantRef = useMemoFirebase(() => (tx?.tenantId ? doc(firestore, 'users', tx.tenantId) : null), [firestore, tx?.tenantId]);
  const propertyRef = useMemoFirebase(() => (tx?.propertyId ? doc(firestore, 'properties', tx.propertyId) : null), [firestore, tx?.propertyId]);
  const { data: tenant } = useDoc<UserProfile>(tenantRef);
  const { data: property } = useDoc<Property>(propertyRef);

  const resolve = async (action: 'confirm' | 'deny') => {
    if (!txRef || !tx) return;
    setBusy(true);
    try {
      await updateDoc(txRef, action === 'confirm' ? { status: 'Completed', date: tx.date || new Date().toISOString() } : { status: 'Failed' });
      await sendNotification({
        toUserId: tx.tenantId,
        type: action === 'confirm' ? 'OFFLINE_PAYMENT_APPROVED' : 'OFFLINE_PAYMENT_REJECTED',
        firestore,
        propertyTitle: property?.title || 'your home',
        link: '/student/tenancy',
      });
      toast({
        title: action === 'confirm' ? 'Payment confirmed' : 'Payment marked as not received',
        description: 'The tenant has been notified.',
      });
    } catch (error) {
      console.error('Update payment failed:', error);
      toast({ variant: 'destructive', title: 'Could not update payment', description: 'Please try again.' });
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  };

  if (isLoading) return <PageSkeleton variant="detail" />;
  if (!tx) {
    return (
      <EmptyState
        icon={Receipt}
        title="Payment not found"
        action={
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/landlord/transactions">All transactions</Link>
          </Button>
        }
      />
    );
  }

  const isPending = tx.status === 'Pending' || tx.status === 'Pending Verification';
  const method = tx.paymentMethod ?? tx.method ?? '—';
  const months = tx.months ?? tx.monthsPaid ?? 1;
  const rows: [string, React.ReactNode][] = [
    ['Date', tx.date ? format(new Date(tx.date), 'd MMMM yyyy, HH:mm') : '—'],
    ['Type', tx.type === 'Lease Activation' ? 'First payment' : tx.type],
    ['Covers', `${months} month${months === 1 ? '' : 's'}`],
    ['Method', method],
    ['Reference', <span key="ref" className="break-all font-mono text-xs">{tx.paymentIntentId || tx.id}</span>],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: '/landlord/transactions', label: 'Transactions' }}
        title="Payment details"
        actions={
          <Button variant="outline" className="rounded-xl print:hidden" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" /> Print receipt
          </Button>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm lg:col-span-2">
          <div className="flex flex-col gap-4 border-b bg-muted/30 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-3xl font-bold tracking-tight">{formatPrice(tx.amount, tx.currency)}</p>
            </div>
            <StatusBadge status={tx.status} className="self-start text-sm sm:self-auto" />
          </div>
          <dl className="divide-y">
            {rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-3 gap-4 px-6 py-3.5 text-sm">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="col-span-2 font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          {isPending && (
            <div className="flex flex-col gap-3 border-t bg-amber-50/60 p-6 sm:flex-row sm:items-center print:hidden">
              <p className="flex-1 text-sm text-amber-900">
                Confirm only once the money has arrived in your bank account.
              </p>
              <div className="flex gap-2">
                <Button className="rounded-lg" disabled={busy} onClick={() => setPendingAction('confirm')}>
                  <Check className="mr-1.5 h-4 w-4" /> Received
                </Button>
                <Button variant="outline" className="rounded-lg" disabled={busy} onClick={() => setPendingAction('deny')}>
                  <X className="mr-1.5 h-4 w-4" /> Not received
                </Button>
              </div>
            </div>
          )}
        </section>

        <div className="space-y-6">
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
                    <a href={`mailto:${tenant.email}`} className="flex items-center gap-1 truncate text-xs text-muted-foreground hover:underline">
                      <Mail aria-hidden className="h-3 w-3" /> {tenant.email}
                    </a>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="w-full rounded-lg print:hidden">
                  <Link href={`/landlord/tenants/${tenant.id}`}>View tenancy</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Tenant details unavailable.</p>
            )}
          </SectionCard>

          <SectionCard title="Property" bodyClassName="p-5">
            {property ? (
              <Link href={`/landlord/properties/${property.id}`} className="flex items-start gap-3 hover:underline">
                <Building2 aria-hidden className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <span>
                  <span className="block font-medium">{property.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {[property.location?.address, property.location?.city].filter(Boolean).join(', ')}
                  </span>
                </span>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">Property details unavailable.</p>
            )}
          </SectionCard>
        </div>
      </div>

      <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingAction === 'confirm' ? 'Confirm this payment?' : 'Mark as not received?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === 'confirm'
                ? `You're confirming ${formatPrice(tx.amount, tx.currency)} arrived in your account. The tenant will be notified.`
                : 'The tenant will be told the payment was not received and asked to try again.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-lg" onClick={() => pendingAction && void resolve(pendingAction)}>
              {pendingAction === 'confirm' ? 'Yes, received' : 'Not received'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
