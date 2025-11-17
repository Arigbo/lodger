
'use client';

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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getTransactionsByLandlord, getUserById, getPropertyById } from '@/lib/data';
import type { Transaction } from '@/lib/definitions';
import { formatPrice, cn } from '@/lib/utils';
import { DollarSign, ExternalLink } from 'lucide-react';
import Link from 'next/link';

// Mock current user
const useUser = () => {
  const user = getUserById('user-1');
  return { user };
};

export default function TransactionsPage() {
  const { user: landlord } = useUser();
  const transactions = landlord ? getTransactionsByLandlord(landlord.id) : [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">
            View your payment history.
          </p>
        </div>
      </div>
      <Separator className="my-6" />
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            A record of all transactions across your properties.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => {
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
                When payments are made, they will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
