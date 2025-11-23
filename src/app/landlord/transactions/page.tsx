
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
import type { Transaction, User, Property } from '@/lib/definitions';
import { formatPrice, cn } from '@/lib/utils';
import { DollarSign, ExternalLink, MoreHorizontal, Download, Calendar as CalendarIcon, X as ClearIcon, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import Link from 'next/link';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
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
      const allTransactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
      
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
            userSnapshots.forEach(doc => usersMap.set(doc.id, { id: doc.id, ...doc.data() } as User));
        }
      }

      if (propertyIds.length > 0) {
        const propertyChunks = chunkArray(propertyIds, 30);
        for (const chunk of propertyChunks) {
            const propertyQuery = query(collection(firestore, 'properties'), where(documentId(), 'in', chunk));
            const propertySnapshots = await getDocs(propertyQuery);
            propertySnapshots.forEach(doc => propertiesMap.set(doc.id, { id: doc.id, ...doc.data() } as Property));
        }
      }
      
      const finalTransactions = allTransactions.map(t => ({
        transaction: t,
        tenant: usersMap.get(t.tenantId)!,
        property: propertiesMap.get(t.propertyId)!
      })).filter(at => at.tenant && at.property);

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
    // Placeholder for CSV generation logic
    console.log("Downloading report for:", filteredTransactions);
    alert('Generating CSV report...');
  }
  
  const handleDownloadReceipt = (transactionId: string) => {
    // Placeholder for receipt generation logic
    console.log("Downloading receipt for:", transactionId);
    alert(`Generating receipt for transaction ${transactionId}...`);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">
            View, filter, and export your payment history.
          </p>
        </div>
        <Button onClick={handleDownloadReport}>
            <Download className="mr-2 h-4 w-4" />
            Download Report
        </Button>
      </div>
      <Separator className="my-6" />

       {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
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
      <div className="mb-6 rounded-lg border bg-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map(({ transaction, tenant, property }) => {
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <Link href={`/landlord/tenants/${tenant?.id}`} className="font-medium hover:underline flex items-center gap-2">
                           {tenant?.name} <ExternalLink className="h-3 w-3 text-muted-foreground"/>
                        </Link>
                      </TableCell>
                       <TableCell>
                        <Link href={`/landlord/properties/${property?.id}`} className="text-muted-foreground hover:underline">
                          {property?.title}
                        </Link>
                      </TableCell>
                      <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                       <TableCell className="text-muted-foreground">{transaction.type}</TableCell>
                      <TableCell className="text-right font-medium">{formatPrice(transaction.amount)}</TableCell>
                       <TableCell className="text-center">
                        <Badge variant={
                            transaction.status === 'Completed' ? 'secondary' 
                            : transaction.status === 'Pending' ? 'default' 
                            : 'destructive'
                        }>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                       <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleDownloadReceipt(transaction.id)}>
                                <Download className="mr-2 h-4 w-4" />
                                Download Receipt
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
             <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-background">
                <DollarSign className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No Transactions Found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Your transactions will appear here. Try adjusting your filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    