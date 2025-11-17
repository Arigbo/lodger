
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
import { getTransactionsByLandlord, getUserById, getPropertyById } from '@/lib/data';
import type { Transaction } from '@/lib/definitions';
import { formatPrice, cn } from '@/lib/utils';
import { DollarSign, ExternalLink, MoreHorizontal, Download, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';

// Mock current user
const useUser = () => {
  const user = getUserById('user-1');
  return { user };
};

export default function TransactionsPage() {
  const { user: landlord } = useUser();
  
  const allTransactions = React.useMemo(() => {
    return landlord ? getTransactionsByLandlord(landlord.id) : [];
  }, [landlord]);

  const [filteredTransactions, setFilteredTransactions] = React.useState<Transaction[]>(allTransactions);
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [type, setType] = React.useState('all');
  const [status, setStatus] = React.useState('all');

  React.useEffect(() => {
    let transactions = allTransactions;
    if (date?.from && date?.to) {
        transactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= date.from! && tDate <= date.to!;
        });
    }
    if (type !== 'all') {
        transactions = transactions.filter(t => t.type === type);
    }
    if (status !== 'all') {
        transactions = transactions.filter(t => t.status === status);
    }

    setFilteredTransactions(transactions);

  }, [date, type, status, allTransactions]);


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

       {/* Filter Controls */}
      <div className="mb-6 rounded-lg border bg-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            Showing {filteredTransactions.length} of {allTransactions.length} total transactions.
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
                {filteredTransactions.map((transaction) => {
                  const tenant = getUserById(transaction.tenantId);
                  const property = getPropertyById(transaction.propertyId);
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
