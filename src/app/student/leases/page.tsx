
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getLeasesByStudentId, getUserById, getPropertyById } from '@/lib/data';
import type { LeaseAgreement } from '@/lib/definitions';
import { FileText } from 'lucide-react';
import Link from 'next/link';

// Mock current user
const useUser = () => {
  const user = getUserById('user-3');
  return { user };
};

export default function StudentLeasesPage() {
  const { user: student } = useUser();
  
  const leases = React.useMemo(() => {
    return student ? getLeasesByStudentId(student.id) : [];
  }, [student]);

  const getStatusVariant = (status: LeaseAgreement['status']) => {
    switch (status) {
      case 'active':
        return 'secondary';
      case 'expired':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold">Lease Agreements</h1>
          <p className="text-muted-foreground">
            View all your current and past lease agreements.
          </p>
        </div>
      </div>
      <Separator className="my-6" />

      <Card>
        <CardHeader>
          <CardTitle>My Leases</CardTitle>
          <CardDescription>
            You have {leases.length} lease agreements on record.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leases.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Landlord</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases.map((lease) => {
                  const landlord = getUserById(lease.landlordId);
                  const property = getPropertyById(lease.propertyId);
                  return (
                    <TableRow key={lease.id}>
                      <TableCell>
                        <Link href={`/student/properties/${property?.id}`} className="font-medium hover:underline">
                          {property?.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{landlord?.name}</span>
                      </TableCell>
                      <TableCell>{new Date(lease.startDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(lease.endDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                         <Badge variant={getStatusVariant(lease.status)}>{lease.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" asChild>
                           <Link href={`/student/properties/${property?.id}`}>
                                <FileText className="mr-2 h-4 w-4" /> View
                            </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
             <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-background">
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No Lease Agreements</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                When you sign a lease for a property, it will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
