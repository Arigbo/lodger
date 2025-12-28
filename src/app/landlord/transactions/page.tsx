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
import { formatPrice, cn } from '@/utils';
import { DollarSign, Download, Calendar as CalendarIcon, X as ClearIcon, TrendingUp, Wallet, Building, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { DateRange } from 'react-day-picker';
import { addDays, format } from "date-fns";
import { Calendar } from '@/components/ui/calendar';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import Loading from '@/app/loading';


type AggregatedTransaction = {
  transaction: Transaction;
  tenant: User;
  property: Property;
}

// Helper function to split an array into chunks
function chunkArray<T>(array: T[], size: number): T[][] {
  if (!array || array.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}


export default function TransactionsPage() {
  const { user: landlord, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [aggregatedTransactions, setAggregatedTransactions] = React.useState<AggregatedTransaction[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [filteredTransactions, setFilteredTransactions] = React.useState<AggregatedTransaction[]>([]);
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [type, setType] = React.useState('all');
  const [status, setStatus] = React.useState('all');

  const fetchTransactions = async () => {
    if (!landlord || !firestore) return;
    setIsLoading(true);

    try {
      const transactionsQuery = query(collection(firestore, 'transactions'), where('landlordId', '==', landlord.uid));
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const allTransactions: Transaction[] = transactionsSnapshot.docs.map((doc_ref: any) => ({ id: doc_ref.id, ...doc_ref.data() })) as Transaction[];

      if (allTransactions.length === 0) {
        setAggregatedTransactions([]);
        setIsLoading(false);
        return;
      }

      const tenantIds = [...new Set(allTransactions.map(t => t.tenantId))];
      const propertyIds = [...new Set(allTransactions.map(t => t.propertyId))];

      const usersMap = new Map<string, User>();
      const propertiesMap = new Map<string, Property>();

      if (tenantIds.length > 0) {
        const userChunks = chunkArray(tenantIds, 30);
        for (const chunk of userChunks) {
          const usersQuery = query(collection(firestore, 'users'), where(documentId(), 'in', chunk));
          const usersSnapshot = await getDocs(usersQuery);
          usersSnapshot.forEach((doc_ref: any) => usersMap.set(doc_ref.id, { id: doc_ref.id, ...doc_ref.data() } as User));
        }
      }

      if (propertyIds.length > 0) {
        const propertyChunks = chunkArray(propertyIds, 30);
        for (const chunk of propertyChunks) {
          const propertiesQuery = query(collection(firestore, 'properties'), where(documentId(), 'in', chunk));
          const propertiesSnapshot = await getDocs(propertiesQuery);
          propertiesSnapshot.forEach((doc_ref: any) => propertiesMap.set(doc_ref.id, { id: doc_ref.id, ...doc_ref.data() } as Property));
        }
      }

      const aggregatedData = allTransactions.map(t => ({
        transaction: t,
        tenant: usersMap.get(t.tenantId)!,
        property: propertiesMap.get(t.propertyId)!
      }));

      setAggregatedTransactions(aggregatedData);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchTransactions();
  }, [landlord, firestore]);

  React.useEffect(() => {
    let result = [...aggregatedTransactions];

    if (date?.from) {
      result = result.filter(n => {
        const d = new Date(n.transaction.date);
        return d >= date.from! && (!date.to || d <= date.to);
      });
    }

    if (type !== 'all') {
      result = result.filter(n => n.transaction.type === type);
    }

    if (status !== 'all') {
      result = result.filter(n => n.transaction.status === status);
    }

    setFilteredTransactions(result.sort((a, b) => new Date(b.transaction.date).getTime() - new Date(a.transaction.date).getTime()));
  }, [aggregatedTransactions, date, type, status]);

  const totalRevenue = filteredTransactions
    .filter(t => t.transaction.status === 'Completed')
    .reduce((sum, t) => sum + t.transaction.amount, 0);

  const pendingAmount = filteredTransactions
    .filter(t => t.transaction.status === 'Pending')
    .reduce((sum, t) => sum + t.transaction.amount, 0);

  if (isUserLoading || isLoading) return <Loading />;

  return (
    <div className="space-y-16 pb-32 animate-in fade-in duration-1000">
      {/* Cinematic Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b-4 border-foreground/5 px-2">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Financial Intelligence</span>
          </div>
          <h1 className="font-headline text-5xl md:text-7xl font-black tracking-tighter text-foreground uppercase leading-[0.9]">
            TRANSACTION <br /> <span className="text-primary">ARCHIVE</span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium mt-4">
            Comprehensive history of your property revenue and logistics.
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="h-16 px-8 rounded-2xl border-2 font-black text-xs uppercase tracking-widest gap-3 hover:bg-muted transition-all">
            <Download className="h-4 w-4" /> EXPORT DATA
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="rounded-[3rem] border-2 border-foreground/5 bg-white p-10 shadow-xl">
          <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-4">Settled Funds</p>
          <div className="flex items-end justify-between">
            <h3 className="text-4xl font-black tracking-tighter">{formatPrice(totalRevenue)}</h3>
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </Card>
        <Card className="rounded-[3rem] border-2 border-foreground/5 bg-white p-10 shadow-xl">
          <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-4">Pipeline Revenue</p>
          <div className="flex items-end justify-between">
            <h3 className="text-4xl font-black tracking-tighter">{formatPrice(pendingAmount)}</h3>
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </Card>
        <Card className="rounded-[3rem] border-2 border-foreground/5 bg-primary text-white p-10 shadow-xl shadow-primary/20">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Active Tenure</p>
          <div className="flex items-end justify-between">
            <h3 className="text-4xl font-black tracking-tighter">{filteredTransactions.length}</h3>
            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-6 items-center justify-between px-2">
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-14 px-6 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest gap-3">
                <CalendarIcon className="h-4 w-4" />
                {date?.from ? (
                  date.to ? `${format(date.from, "LLL dd")} - ${format(date.to, "LLL dd")}` : format(date.from, "LLL dd")
                ) : <span>SELECT RANGE</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl border-2 shadow-3xl" align="start">
              <Calendar mode="range" selected={date} onSelect={setDate} initialFocus />
            </PopoverContent>
          </Popover>

          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-14 w-[160px] rounded-xl border-2 font-black text-[10px] uppercase tracking-widest">
              <SelectValue placeholder="TYPE" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-2 p-1">
              <SelectItem value="all" className="font-bold text-xs uppercase tracking-widest">ALL TYPES</SelectItem>
              <SelectItem value="Rent" className="font-bold text-xs uppercase tracking-widest">RENT</SelectItem>
              <SelectItem value="Deposit" className="font-bold text-xs uppercase tracking-widest">DEPOSIT</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-14 w-[160px] rounded-xl border-2 font-black text-[10px] uppercase tracking-widest">
              <SelectValue placeholder="STATUS" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-2 p-1">
              <SelectItem value="all" className="font-bold text-xs uppercase tracking-widest">ALL STATUS</SelectItem>
              <SelectItem value="Completed" className="font-bold text-xs uppercase tracking-widest text-emerald-600">COMPLETED</SelectItem>
              <SelectItem value="Pending" className="font-bold text-xs uppercase tracking-widest text-amber-600">PENDING</SelectItem>
              <SelectItem value="Failed" className="font-bold text-xs uppercase tracking-widest text-red-600">FAILED</SelectItem>
            </SelectContent>
          </Select>

          {(date || type !== 'all' || status !== 'all') && (
            <Button variant="ghost" onClick={() => { setDate(undefined); setType('all'); setStatus('all'); }} className="h-14 px-6 font-black text-[10px] uppercase tracking-widest gap-2 hover:bg-muted">
              <ClearIcon className="h-4 w-4" /> CLEAR FILTERS
            </Button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="rounded-[3.5rem] border-2 border-foreground/5 bg-white shadow-3xl overflow-hidden">
        <CardContent className="p-0">
          {filteredTransactions.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 border-none">
                      <TableHead className="px-8 font-black text-[10px] uppercase tracking-widest text-foreground h-16">Tenant</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-foreground h-16">Property</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-foreground h-16 text-center">Date</TableHead>
                      <TableHead className="hidden sm:table-cell font-black text-[10px] uppercase tracking-widest text-foreground h-16 text-center">Type</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-foreground h-16 text-right">Amount</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-foreground h-16 text-center">Status</TableHead>
                      <TableHead className="text-right px-8 font-black text-[10px] uppercase tracking-widest text-foreground h-16">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((t) => (
                      <TableRow key={t.transaction.id} className="border-muted/10 hover:bg-muted/5 transition-colors h-24">
                        <TableCell className="px-8">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black uppercase text-xs">
                              {t.tenant?.name?.[0] || 'U'}
                            </div>
                            <div>
                              <p className="font-black text-sm uppercase tracking-tight">{t.tenant?.name || 'Anonymous'}</p>
                              <p className="text-[10px] font-bold text-muted-foreground/60 tracking-widest lowercase">{t.tenant?.email}</p>
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
                          <p className="text-[10px] font-medium text-muted-foreground/60">{format(new Date(t.transaction.date), 'HH:mm')}</p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-center">
                          <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border-muted/20">
                            {t.transaction.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="text-sm font-black tracking-tight">{formatPrice(t.transaction.amount, t.transaction.currency)}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn(
                            "rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border-none",
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
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black uppercase text-xs">
                          {t.tenant?.name?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="font-black text-xs uppercase tracking-tight">{t.tenant?.name || 'Anonymous'}</p>
                          <p className="text-[10px] font-medium text-muted-foreground/60 truncate max-w-[120px]">{t.tenant?.email}</p>
                        </div>
                      </div>
                      <Badge className={cn(
                        "rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest border-none",
                        t.transaction.status === 'Completed' ? "bg-emerald-500 text-white" :
                          t.transaction.status === 'Pending' ? "bg-amber-500 text-white" :
                            "bg-red-500 text-white"
                      )}>
                        {t.transaction.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">Property</p>
                        <p className="text-xs font-bold truncate">{t.property?.title || 'Unknown'}</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">Amount</p>
                        <p className="text-sm font-black tracking-tight">{formatPrice(t.transaction.amount, t.transaction.currency)}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <p className="text-[10px] font-bold text-muted-foreground/60">
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
                <div className="relative flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-muted/30">
                  <DollarSign className="h-10 w-10 text-primary opacity-20" />
                </div>
              </div>
              <h3 className="text-2xl font-black tracking-tight uppercase">No Activity Detected</h3>
              <p className="mx-auto mt-4 max-w-sm text-muted-foreground font-medium text-lg leading-relaxed">
                You haven't recorded any logistics data for this period. Try clearing your filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
