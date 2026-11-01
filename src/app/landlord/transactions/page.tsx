'use client';

import * as React from 'react';
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
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Transaction, UserProfile as User, Property } from '@/types';
import { formatPrice, cn } from '@/lib/utils';
import { DollarSign, Download, Calendar as CalendarIcon, X as ClearIcon, TrendingUp, Wallet, Building, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { DateRange } from 'react-day-picker';
import { addDays, format } from "date-fns";
import { Calendar } from '@/components/ui/calendar';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import Loading from '@/app/loading';
import { PageHeader, StatCard, StatGrid } from "@/components/dashboard";
import { downloadCsv, toCsv } from "@/lib/csv";
import { useAsyncResult } from "@/hooks/use-async-result";
import { fetchDocsByIds } from "@/lib/firestore-batch";


type AggregatedTransaction = {
  transaction: Transaction;
  tenant: User | null;
  property: Property | null;
}



export default function TransactionsPage() {
  const { user: landlord, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [date, setDate] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
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

  if (isUserLoading || isLoading) return <Loading />;

  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-1000">
      <PageHeader
        title="Transactions"
        description="Rent and deposit payments across all of your properties."
        actions={
          <Button variant="outline" className="rounded-xl" onClick={exportTransactions} disabled={!filteredTransactions.length}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <StatGrid className="lg:grid-cols-3">
        <StatCard label="Received" value={formatPrice(totalRevenue, displayCurrency)} icon={TrendingUp} tone="success" hint="Completed payments" />
        <StatCard label="Pending" value={formatPrice(pendingAmount, displayCurrency)} icon={Wallet} tone="warning" hint="Awaiting confirmation" />
        <StatCard label="Transactions" value={filteredTransactions.length} icon={DollarSign} hint="Matching current filters" className="col-span-2 lg:col-span-1" />
      </StatGrid>

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-6 items-center justify-between px-2">
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-11 px-6 rounded-xl border font-semibold text-xs uppercase tracking-wider gap-3">
                <CalendarIcon className="h-4 w-4" />
                {date?.from ? (
                  date.to ? `${format(date.from, "LLL dd")} - ${format(date.to, "LLL dd")}` : format(date.from, "LLL dd")
                ) : <span>Select range</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl border shadow-sm" align="start">
              <Calendar mode="range" selected={date} onSelect={setDate} initialFocus />
            </PopoverContent>
          </Popover>

          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-14 w-[160px] rounded-xl border font-semibold text-xs uppercase tracking-wider">
              <SelectValue placeholder="TYPE" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border p-1">
              <SelectItem value="all" className="font-bold text-xs uppercase tracking-wider">All types</SelectItem>
              <SelectItem value="Rent" className="font-bold text-xs uppercase tracking-wider">RENT</SelectItem>
              <SelectItem value="Deposit" className="font-bold text-xs uppercase tracking-wider">Deposit</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-14 w-[160px] rounded-xl border font-semibold text-xs uppercase tracking-wider">
              <SelectValue placeholder="STATUS" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border p-1">
              <SelectItem value="all" className="font-bold text-xs uppercase tracking-wider">All status</SelectItem>
              <SelectItem value="Completed" className="font-bold text-xs uppercase tracking-wider text-emerald-600">Completed</SelectItem>
              <SelectItem value="Pending" className="font-bold text-xs uppercase tracking-wider text-amber-600">Pending</SelectItem>
              <SelectItem value="Failed" className="font-bold text-xs uppercase tracking-wider text-red-600">Failed</SelectItem>
            </SelectContent>
          </Select>

          {(date || type !== 'all' || status !== 'all') && (
            <Button variant="ghost" onClick={() => { setDate(undefined); setType('all'); setStatus('all'); }} className="h-11 px-6 font-semibold text-xs uppercase tracking-wider gap-2 hover:bg-muted">
              <ClearIcon className="h-4 w-4" /> Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="rounded-3xl border border-foreground/5 bg-card shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {filteredTransactions.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 border-none">
                      <TableHead className="px-8 font-semibold text-xs uppercase tracking-wider text-foreground h-11">Tenant</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-foreground h-16">Property</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-foreground h-16 text-center">Date</TableHead>
                      <TableHead className="hidden sm:table-cell font-semibold text-xs uppercase tracking-wider text-foreground h-16 text-center">Type</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-foreground h-16 text-right">Amount</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-foreground h-16 text-center">Status</TableHead>
                      <TableHead className="text-right px-8 font-semibold text-xs uppercase tracking-wider text-foreground h-11">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((t) => (
                      <TableRow key={t.transaction.id} className="border-muted/10 hover:bg-muted/5 transition-colors h-24">
                        <TableCell className="px-8">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-semibold uppercase text-xs">
                              {t.tenant?.name?.[0] || 'U'}
                            </div>
                            <div>
                              <p className="font-bold text-sm uppercase tracking-tight">{t.tenant?.name || 'Anonymous'}</p>
                              <p className="text-xs font-bold text-muted-foreground/60 tracking-wider lowercase">{t.tenant?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-muted-foreground">
                          <Link href={`/landlord/properties/${t.property?.id}`} className="hover:text-primary transition-colors flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            {t.property?.title || 'Unknown Property'}
                          </Link>
                        </TableCell>
                        <TableCell className="text-center">
                          <p className="text-sm font-bold">{format(new Date(t.transaction.date), 'MMM dd, yyyy')}</p>
                          <p className="text-xs font-medium text-muted-foreground/60">{format(new Date(t.transaction.date), 'HH:mm')}</p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-center">
                          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider border-muted/20">
                            {t.transaction.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="text-sm font-bold tracking-tight">{formatPrice(t.transaction.amount, t.transaction.currency)}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn(
                            "rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider border-none",
                            t.transaction.status === 'Completed' ? "bg-emerald-500 text-white" :
                              t.transaction.status === 'Pending' ? "bg-amber-500 text-white" :
                                "bg-red-500 text-white"
                          )}>
                            {t.transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-8">
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary" asChild>
                            <Link href={`/landlord/transactions/${t.transaction.id}`}>
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-muted/10">
                {filteredTransactions.map((t) => (
                  <Link
                    key={t.transaction.id}
                    href={`/landlord/transactions/${t.transaction.id}`}
                    className="flex flex-col p-6 hover:bg-muted/5 transition-colors space-y-4"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-semibold uppercase text-xs">
                          {t.tenant?.name?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-xs uppercase tracking-tight">{t.tenant?.name || 'Anonymous'}</p>
                          <p className="text-xs font-medium text-muted-foreground/60 truncate max-w-[120px]">{t.tenant?.email}</p>
                        </div>
                      </div>
                      <Badge className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider border-none",
                        t.transaction.status === 'Completed' ? "bg-emerald-500 text-white" :
                          t.transaction.status === 'Pending' ? "bg-amber-500 text-white" :
                            "bg-red-500 text-white"
                      )}>
                        {t.transaction.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground/40 uppercase tracking-wider">Property</p>
                        <p className="text-xs font-bold truncate">{t.property?.title || 'Unknown'}</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-xs font-semibold text-muted-foreground/40 uppercase tracking-wider">Amount</p>
                        <p className="text-sm font-bold tracking-tight">{formatPrice(t.transaction.amount, t.transaction.currency)}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <p className="text-xs font-bold text-muted-foreground/60">
                        {format(new Date(t.transaction.date), 'MMM dd, yyyy • HH:mm')}
                      </p>
                      <ChevronRight className="h-4 w-4 text-primary" />
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center px-10">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-muted/30">
                  <DollarSign className="h-10 w-10 text-primary opacity-20" />
                </div>
              </div>
              <h3 className="text-2xl font-bold tracking-tight">No transactions found</h3>
              <p className="mx-auto mt-4 max-w-sm text-muted-foreground font-medium text-lg leading-relaxed">
                There are no transactions for this period. Try clearing your filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
