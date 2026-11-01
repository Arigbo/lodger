"use client";

import * as React from 'react';
import Link from 'next/link';
import type { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { Calendar as CalendarIcon, ChevronRight, Download, Receipt, TrendingUp, Wallet, X } from 'lucide-react';
import { collection, query, where } from 'firebase/firestore';
import { EmptyState, PageHeader, PageSkeleton, StatCard, StatGrid, StatusBadge } from '@/components/dashboard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useAsyncResult } from '@/hooks/use-async-result';
import { downloadCsv, toCsv } from '@/lib/csv';
import { fetchDocsByIds } from '@/lib/firestore-batch';
import { formatPrice } from '@/lib/utils';
import type { Property, Transaction, UserProfile as User } from '@/types';

type AggregatedTransaction = {
  transaction: Transaction;
  tenant: User | null;
  property: Property | null;
}



export default function TransactionsPage() {
  const { user: landlord, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [date, setDate] = React.useState<DateRange | undefined>(undefined);
  const [type, setType] = React.useState('all');
  const [status, setStatus] = React.useState('all');

  const transactionsQuery = useMemoFirebase(
    () => (landlord ? query(collection(firestore, 'transactions'), where('landlordId', '==', landlord.uid)) : null),
    [landlord, firestore],
  );
  const { data: transactions, isLoading: areTransactionsLoading } = useCollection<Transaction>(transactionsQuery);

  const { data: aggregatedTransactions = [], isLoading: isAggregating } = useAsyncResult(
    transactions,
    async (items): Promise<AggregatedTransaction[]> => {
      const [tenants, properties] = await Promise.all([
        fetchDocsByIds<User>(firestore, 'users', items.map((t) => t.tenantId)),
        fetchDocsByIds<Property>(firestore, 'properties', items.map((t) => t.propertyId)),
      ]);
      return items.map((transaction) => ({
        transaction,
        tenant: tenants.get(transaction.tenantId) ?? null,
        property: properties.get(transaction.propertyId) ?? null,
      }));
    },
    { keepPrevious: true },
  );
  const isLoading = areTransactionsLoading || isAggregating;

  const filteredTransactions = React.useMemo(
    () =>
      aggregatedTransactions
        .filter(({ transaction: t }) => {
          const d = new Date(t.date);
          if (date?.from && (d < date.from || (date.to && d > date.to))) return false;
          if (type !== 'all' && t.type !== type) return false;
          if (status !== 'all' && t.status !== status) return false;
          return true;
        })
        .sort((a, b) => new Date(b.transaction.date).getTime() - new Date(a.transaction.date).getTime()),
    [aggregatedTransactions, date, type, status],
  );

  const totalRevenue = filteredTransactions
    .filter(t => t.transaction.status === 'Completed')
    .reduce((sum, t) => sum + t.transaction.amount, 0);

  const pendingAmount = filteredTransactions
    .filter(t => t.transaction.status === 'Pending')
    .reduce((sum, t) => sum + t.transaction.amount, 0);

  const displayCurrency = filteredTransactions[0]?.transaction.currency || 'USD';

  const exportTransactions = () => {
    const rows = filteredTransactions.map(({ transaction: t, tenant, property }) => [
      t.date, tenant?.name, property?.title, t.type, t.status, t.paymentMethod ?? t.method, t.amount, t.currency,
    ]);
    downloadCsv(
      `lodger-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv([['Date', 'Tenant', 'Property', 'Type', 'Status', 'Method', 'Amount', 'Currency'], ...rows]),
    );
  };

  if (isUserLoading || isLoading) return <PageSkeleton variant="list" />;

  const filtersActive = type !== 'all' || status !== 'all' || !!date;
  const clearFilters = () => {
    setDate(undefined);
    setType('all');
    setStatus('all');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Rent and deposit payments across all of your properties."
        actions={
          <Button variant="outline" className="rounded-xl" onClick={exportTransactions} disabled={!filteredTransactions.length}>
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <StatGrid className="lg:grid-cols-3">
        <StatCard label="Received" value={formatPrice(totalRevenue, displayCurrency)} icon={TrendingUp} tone="success" hint="Completed payments" />
        <StatCard label="Pending" value={formatPrice(pendingAmount, displayCurrency)} icon={Wallet} tone="warning" hint="Awaiting confirmation" />
        <StatCard label="Payments" value={filteredTransactions.length} icon={Receipt} hint="Matching your filters" className="col-span-2 lg:col-span-1" />
      </StatGrid>

      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10 rounded-xl font-normal">
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              {date?.from ? (
                date.to ? `${format(date.from, 'd MMM')} – ${format(date.to, 'd MMM yyyy')}` : format(date.from, 'd MMM yyyy')
              ) : (
                'All dates'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-2xl p-0" align="start">
            <div className="flex flex-wrap gap-1 border-b p-2">
              {[
                ['Last 30 days', 30],
                ['Last 90 days', 90],
                ['This year', 365],
              ].map(([label, days]) => (
                <Button
                  key={label}
                  size="sm"
                  variant="ghost"
                  className="h-7 rounded-lg text-xs"
                  onClick={() => setDate({ from: addDays(new Date(), -Number(days)), to: new Date() })}
                >
                  {label}
                </Button>
              ))}
            </div>
            <Calendar mode="range" selected={date} onSelect={setDate} initialFocus />
          </PopoverContent>
        </Popover>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-10 w-40 rounded-xl" aria-label="Payment type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="Rent">Rent</SelectItem>
            <SelectItem value="Lease Activation">First payment</SelectItem>
            <SelectItem value="Deposit">Deposit</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-10 w-40 rounded-xl" aria-label="Payment status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        {filtersActive && (
          <Button variant="ghost" className="h-10 rounded-xl text-muted-foreground" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" /> Clear
          </Button>
        )}
      </div>

      {filteredTransactions.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={aggregatedTransactions.length ? 'No payments match these filters' : 'No payments yet'}
          description={
            aggregatedTransactions.length
              ? 'Try a different date range or clear the filters.'
              : 'Rent paid by your tenants — online or by confirmed bank transfer — will appear here.'
          }
          action={
            filtersActive ? (
              <Button variant="outline" className="rounded-xl" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <ul className="divide-y">
            {filteredTransactions.map(({ transaction: t, tenant, property }) => (
              <li key={t.id}>
                <Link
                  href={`/landlord/transactions/${t.id}`}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-accent/40 md:grid-cols-[auto_2fr_1.5fr_1fr_auto_auto]"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={tenant?.profileImageUrl} alt="" />
                    <AvatarFallback className="text-xs">{tenant?.name?.[0] ?? '?'}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{tenant?.name ?? 'Unknown tenant'}</p>
                    <p className="truncate text-xs text-muted-foreground md:hidden">
                      {property?.title} · {format(new Date(t.date), 'd MMM yyyy')}
                    </p>
                  </div>
                  <p className="hidden truncate text-sm text-muted-foreground md:block">{property?.title ?? '—'}</p>
                  <p className="hidden text-sm text-muted-foreground md:block">
                    {format(new Date(t.date), 'd MMM yyyy')} · {t.type === 'Lease Activation' ? 'First payment' : t.type}
                  </p>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatPrice(t.amount, t.currency)}</p>
                    <StatusBadge status={t.status} className="mt-0.5 md:hidden" />
                  </div>
                  <div className="hidden items-center gap-3 md:flex">
                    <StatusBadge status={t.status} />
                    <ChevronRight aria-hidden className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
