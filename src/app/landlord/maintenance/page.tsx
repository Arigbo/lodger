
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getMaintenanceRequestsByLandlord, getUserById, getPropertyById } from '@/lib/data';
import type { MaintenanceRequest } from '@/lib/definitions';
import { MoreHorizontal, Wrench } from 'lucide-react';
import Link from 'next/link';

// Mock current user
const useUser = () => {
  const user = getUserById('user-1');
  return { user };
};

export default function MaintenancePage() {
  const { user: landlord } = useUser();

  const requests = React.useMemo(() => {
    return landlord ? getMaintenanceRequestsByLandlord(landlord.id) : [];
  }, [landlord]);

  const getPriorityVariant = (priority: MaintenanceRequest['priority']) => {
    switch (priority) {
      case 'High':
        return 'destructive';
      case 'Medium':
        return 'default';
      case 'Low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

   const getStatusVariant = (status: MaintenanceRequest['status']) => {
    switch (status) {
      case 'Completed':
        return 'secondary';
      case 'In Progress':
        return 'default';
      case 'Pending':
        return 'outline';
       case 'Cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold">Maintenance</h1>
          <p className="text-muted-foreground">
            Track and manage maintenance requests from tenants.
          </p>
        </div>
      </div>
      <Separator className="my-6" />

      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
          <CardDescription>
            You have {requests.length} total maintenance requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => {
                  const tenant = getUserById(request.tenantId);
                  const property = getPropertyById(request.propertyId);
                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <Link href={`/landlord/properties/${property?.id}`} className="font-medium hover:underline">
                          {property?.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/landlord/tenants/${tenant?.id}`} className="text-muted-foreground hover:underline">
                          {tenant?.name}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium max-w-xs truncate">{request.title}</TableCell>
                      <TableCell>{request.category}</TableCell>
                      <TableCell>
                        <Badge variant={getPriorityVariant(request.priority)}>{request.priority}</Badge>
                      </TableCell>
                      <TableCell>{new Date(request.requestDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                         <Badge variant={getStatusVariant(request.status)}>{request.status}</Badge>
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
                            <DropdownMenuItem>Mark as In Progress</DropdownMenuItem>
                            <DropdownMenuItem>Mark as Completed</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              Cancel Request
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
                <Wrench className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No Maintenance Requests</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                When tenants submit maintenance requests, they will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
