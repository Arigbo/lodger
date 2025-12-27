
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
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Separator } from '@/components/ui/separator';
import type { Transaction, UserProfile as User, Property } from '@/types';
import { formatPrice, cn } from '@/utils';
import { DollarSign, ExternalLink, MoreHorizontal, Download, Calendar as CalendarIcon, X as ClearIcon, TrendingUp, TrendingDown, Wallet, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { DateRange } from 'react-day-picker';
import { addDays, format } from "date-fns";
import { Calendar } from '@/components/ui/calendar';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import Loading from '@/app/loading';


type AggregatedTransaction = {
  transaction: Transaction;
  tenant: User;
  property: Property;
}

// Helper function to split an array into chunks
function chunkArray<T>(array: T[], size: number): T[][] {
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

  React.useEffect(() => {
    if (!landlord || !firestore) return;

    const fetchTransactions = async () => {
      setIsLoading(true);
      const transactionsQuery = query(collection(firestore, 'transactions'), where('landlordId', '==', landlord.uid));
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const allTransactions: Transaction[] = transactionsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Transaction[];

      if (allTransactions.length === 0) {
        setAggregatedTransactions([]);
        setFilteredTransactions([]);
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
          const userQuery = query(collection(firestore, 'users'), where(documentId(), 'in', chunk));
          const userSnapshots = await getDocs(userQuery);
          userSnapshots.forEach((doc: any) => usersMap.set(doc.id, { id: doc.id, ...doc.data() } as User));
        }
      }

      if (propertyIds.length > 0) {
        const propertyChunks = chunkArray(propertyIds, 30);
        for (const chunk of propertyChunks) {
          const propertyQuery = query(collection(firestore, 'properties'), where(documentId(), 'in', chunk));
          const propertySnapshots = await getDocs(propertyQuery);
          propertySnapshots.forEach((doc: any) => propertiesMap.set(doc.id, { id: doc.id, ...doc.data() } as Property));
        }
      }

      const finalTransactions = allTransactions.map(t => ({
        transaction: t,
        tenant: usersMap.get(t.tenantId)!, // Will be undefined if not found, handled in render
        property: propertiesMap.get(t.propertyId)! // Will be undefined if not found, handled in render
      })); // Removed .filter(at => at.tenant && at.property) to prevent data loss

      setAggregatedTransactions(finalTransactions.sort((a, b) => new Date(b.transaction.date).getTime() - new Date(a.transaction.date).getTime()));
      setIsLoading(false);
    }

    fetchTransactions();
  }, [landlord, firestore]);

  React.useEffect(() => {
    let transactions = aggregatedTransactions;
    if (date?.from && date?.to) {
      transactions = transactions.filter(t => {
        const tDate = new Date(t.transaction.date);
        const from = new Date(date.from!);
        from.setHours(0, 0, 0, 0);
        const to = new Date(date.to!);
        to.setHours(23, 59, 59, 999);
        return tDate >= from && tDate <= to;
      });
    }
    if (type !== 'all') {
      transactions = transactions.filter(t => t.transaction.type === type);
    }
    if (status !== 'all') {
      transactions = transactions.filter(t => t.transaction.status === status);
    }

    setFilteredTransactions(transactions);

  }, [date, type, status, aggregatedTransactions]);


  const handleDownloadReport = () => {
    if (filteredTransactions.length === 0) {
      alert("No transactions to export.");
      return;
    }

    const headers = ["Date", "Type", "Status", "Amount", "Property", "Tenant"];
    const rows = filteredTransactions.map(t => [
      new Date(t.transaction.date).toLocaleDateString(),
      t.transaction.type,
      t.transaction.status,
      t.transaction.amount,
      t.property?.title || "Deleted Property",
      t.tenant?.name || "Deleted User"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `transactions_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleDownloadReceipt = (transactionId: string) => {
    // Basic text receipt for now
    const transaction = aggregatedTransactions.find(t => t.transaction.id === transactionId);
    if (!transaction) return;

    const receiptContent = `
RECEIPT
--------------------------------
ID: ${transaction.transaction.id}
Date: ${new Date(transaction.transaction.date).toLocaleString()}
Property: ${transaction.property?.title || "N/A"}
Tenant: ${transaction.tenant?.name || "N/A"}
Type: ${transaction.transaction.type}
Status: ${transaction.transaction.status}
--------------------------------
Total: ${formatPrice(transaction.transaction.amount, transaction.transaction.currency)}
--------------------------------
    `;

    const blob = new Blob([receiptContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `receipt_${transactionId}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const resetFilters = () => {
    setDate(undefined);
    setType('all');
    setStatus('all');
  }

  const totalRevenue = filteredTransactions
    .filter(t => t.transaction.status === 'Completed')
    .reduce((sum, t) => sum + t.transaction.amount, 0);

  const pendingAmount = filteredTransactions
    .filter(t => t.transaction.status === 'Pending')
    .reduce((sum, t) => sum + t.transaction.amount, 0);


  if (isLoading || isUserLoading) {
    return <Loading />;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Revenue Tracking</span>
          </div>
          <h1 className="font-headline text-5xl md:text-6xl font-black tracking-tighter text-foreground uppercase leading-tight">
            YOUR <br /> <span className="text-primary">FINANCES</span>
          </h1>
        </div>
        <Button onClick={handleDownloadReport} className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Download Report
        </Button>
      </div>
      <Separator className="my-4 sm:my-6" />

      {/* Overview Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">From {filteredTransactions.filter(t => t.transaction.status === 'Completed').length} completed transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(pendingAmount)}</div>
            <p className="text-xs text-muted-foreground">From transactions currently processing</p>
          </CardContent>
        </Card>
      </div>


      {/* Filter Controls */}
      <div className="mb-6 rounded-lg border bg-card p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "LLL dd, y")} -{" "}
                        {format(date.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(date.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                />
                <div className="p-2 border-t">
                  <Button variant="ghost" size="sm" className="w-full justify-center" onClick={() => setDate(undefined)}>Clear</Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-2">
            <label htmlFor="type-filter" className="text-sm font-medium">Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type-filter">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Rent">Rent</SelectItem>
                <SelectItem value="Deposit">Deposit</SelectItem>
                <SelectItem value="Late Fee">Late Fee</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="status-filter" className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 items-end">
            <Button onClick={resetFilters} variant="ghost">
              <ClearIcon className="mr-2 h-4 w-4" /> Reset Filters
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            Showing {filteredTransactions.length} of {aggregatedTransactions.length} total transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length > 0 ? (
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 border-none">
                    <TableHead className="px-6 font-bold text-foreground">Tenant</TableHead>
                    <TableHead className="hidden md:table-cell font-bold text-foreground">Property</TableHead>
                    <TableHead className="font-bold text-foreground">Date</TableHead>
                    <TableHead className="hidden sm:table-cell font-bold text-foreground">Type</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Amount</TableHead>
                    <TableHead className="text-center font-bold text-foreground">Status</TableHead>
                    <TableHead className="text-right px-6 font-bold text-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
            </div>
                      </TableCell>
        <TableCell className="hidden md:table-cell text-sm font-medium text-muted-foreground">{t.property?.title || 'Deleted Property'}</TableCell>
        <TableCell className="text-sm font-medium">
          {t.transaction.date ? format(new Date(t.transaction.date), 'MMM dd, yyyy') : 'N/A'}
        </TableCell>
        <TableCell className="hidden sm:table-cell">
          <Badge variant="outline" className="rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-widest border-muted/20">
            {t.transaction.type}
          </Badge>
        </TableCell>
        <TableCell className="text-right font-black text-sm">
          {formatPrice(t.transaction.amount, t.transaction.currency)}
        </TableCell>
        <TableCell className="text-center">
          <Badge className={cn(
            "rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest border-none",
            t.transaction.status === 'Completed' ? "bg-green-500/10 text-green-600" :
              t.transaction.status === 'Pending' ? "bg-amber-500/10 text-amber-600" :
                "bg-destructive/10 text-destructive"
          )}>
            {t.transaction.status}
          </Badge>
        </TableCell>
        <TableCell className="text-right px-6">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/5 group" asChild>
            <Link href={`/landlord/transactions/${t.transaction.id}`}>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </Button>
        </TableCell>
      </TableRow>
                  ))}
    </TableBody>
              </Table >
            </div >
          ) : (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] bg-muted/30">
          <DollarSign className="h-10 w-10 text-primary opacity-20" />
        </div>
      </div>
      <h3 className="text-2xl font-black tracking-tight">No Transactions Found</h3>
      <p className="mx-auto mt-2 max-w-sm text-muted-foreground font-medium">
        Try adjusting your filters or check back later for new activity.
      </p>
    </div>
  )
}
        </CardContent >
      </Card >
    </div >
  );
}


