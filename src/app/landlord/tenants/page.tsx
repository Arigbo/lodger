
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User, Property, Transaction } from '@/lib/definitions';
import { MoreHorizontal, Users, Mail, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { add, isPast, isBefore } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import React from 'react';

type TenantWithProperty = {
  tenant: User;
  property: Property;
  isRentDue: boolean;
};

export default function TenantsPage() {
  const { user: landlord, isUserLoading } = useUser();
  const firestore = useFirestore();
  const today = new Date();
  const [tenants, setTenants] = React.useState<TenantWithProperty[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);


  React.useEffect(() => {
    if (!landlord || !firestore) return;

    const fetchTenants = async () => {
      setIsLoading(true);

      // 1. Get all properties for the landlord
      const propertiesQuery = query(collection(firestore, 'properties'), where('landlordId', '==', landlord.uid));
      const propertiesSnapshot = await getDocs(propertiesQuery);
      const landlordProperties = propertiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Property[];

      // 2. Filter for occupied properties with active leases
      const occupiedProperties = landlordProperties.filter(p => {
        if (!p.currentTenantId || p.status !== 'occupied' || !p.leaseStartDate) {
          return false;
        }
        const leaseEndDate = add(new Date(p.leaseStartDate), { years: 1 });
        return isBefore(today, leaseEndDate);
      });

      if (occupiedProperties.length === 0) {
        setTenants([]);
        setIsLoading(false);
        return;
      }
      
      // 3. Get tenant and transaction data
      const tenantIds = [...new Set(occupiedProperties.map(p => p.currentTenantId!))];
      if (tenantIds.length === 0) {
        setTenants([]);
        setIsLoading(false);
        return;
      }

      const usersQuery = query(collection(firestore, 'users'), where('id', 'in', tenantIds));
      const transactionsQuery = query(collection(firestore, 'transactions'), where('tenantId', 'in', tenantIds));

      const [usersSnapshot, transactionsSnapshot] = await Promise.all([
          getDocs(usersQuery),
          getDocs(transactionsQuery),
      ]);
      
      const usersMap = new Map<string, User>();
      usersSnapshot.forEach(doc => usersMap.set(doc.id, { id: doc.id, ...doc.data() } as User));

      const transactionsMap = new Map<string, Transaction[]>();
      transactionsSnapshot.forEach(doc => {
          const t = doc.data() as Transaction;
          const userTransactions = transactionsMap.get(t.tenantId) || [];
          userTransactions.push(t);
          transactionsMap.set(t.tenantId, userTransactions);
      });

      // 4. Aggregate data
      const tenantData = occupiedProperties.map(property => {
        const tenant = usersMap.get(property.currentTenantId!);
        if (!tenant) return null;

        const tenantTransactions = transactionsMap.get(tenant.id) || [];
        const lastRentPayment = tenantTransactions
            .filter(t => t.type === 'Rent' && t.status === 'Completed')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        let isRentDue = false;
        let nextDueDate = add(new Date(property.leaseStartDate!), { months: 1 });
        if (lastRentPayment) {
            nextDueDate = add(new Date(lastRentPayment.date), { months: 1 });
        }
        isRentDue = isPast(nextDueDate);
        
        return { tenant, property, isRentDue };
      }).filter((item): item is TenantWithProperty => item !== null);

      setTenants(tenantData);
      setIsLoading(false);
    };

    fetchTenants();

  }, [landlord, firestore]);
  

  if (isLoading || isUserLoading) {
      return <div>Loading tenants...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold">My Tenants</h1>
          <p className="text-muted-foreground">
            Manage all your current tenants with active leases.
          </p>
        </div>
      </div>
      <Separator className="my-6" />
      <Card>
        <CardHeader>
          <CardTitle>Tenant List</CardTitle>
          <CardDescription>
            You have {tenants.length} current tenants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tenants.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Rent Status</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map(({ tenant, property, isRentDue }) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                     <Link href={`/landlord/tenants/${tenant.id}`} className="hover:underline">
                        <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={tenant.profileImageUrl} />
                            <AvatarFallback>
                                <UserIcon className="h-4 w-4" />
                            </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{tenant.name}</span>
                        </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/landlord/properties/${property.id}`}
                      className="hover:underline"
                    >
                      {property.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={isRentDue ? 'destructive' : 'secondary'}>
                        {isRentDue ? 'Due' : 'Paid'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{tenant.email}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-haspopup="true"
                          size="icon"
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                            <Link href={`/landlord/tenants/${tenant.id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/landlord/messages?conversationId=${tenant.id}`} className="flex items-center">
                            <Mail className="mr-2 h-4 w-4" /> Message Tenant
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/landlord/tenants/${tenant.id}`}>View Lease</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          ) : (
             <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-background">
                <Users className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No Active Tenants</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                When a student with an active lease occupies one of your properties, they will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    