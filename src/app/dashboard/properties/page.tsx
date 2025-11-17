'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getPropertiesByLandlord, getUserById } from '@/lib/data';
import { formatPrice } from '@/lib/utils';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

// Mock current user - replace with real auth
const useUser = () => {
  // To test a landlord, use 'user-1'.
  const user = getUserById('user-1');
  return { user };
};

export default function LandlordPropertiesPage() {
  const { user } = useUser();
  const properties = user ? getPropertiesByLandlord(user.id) : [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold">My Properties</h1>
          <p className="text-muted-foreground">
            View and manage all your listings.
          </p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Property
        </Button>
      </div>
      <Separator className="my-6" />
      <Card>
        <CardHeader>
          <CardTitle>Property List</CardTitle>
          <CardDescription>
            You have {properties.length} properties.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((property) => {
                const tenant = property.currentTenantId ? getUserById(property.currentTenantId) : null;
                return (
                <TableRow key={property.id}>
                  <TableCell className="font-medium">
                    <Link href={`/properties/${property.id}`} className="hover:underline">
                        {property.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={property.status === 'occupied' ? 'secondary' : 'default'}>
                      {property.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatPrice(property.price)}/mo</TableCell>
                  <TableCell>{tenant ? tenant.name : 'N/A'}</TableCell>
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
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>View Requests</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}