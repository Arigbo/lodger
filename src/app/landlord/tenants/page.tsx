
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
import { getPropertiesByLandlord, getUserById } from '@/lib/data';
import type { User, Property } from '@/lib/definitions';
import { MoreHorizontal, Users } from 'lucide-react';
import Link from 'next/link';

// Mock current user
const useUser = () => {
  const user = getUserById('user-1');
  return { user };
};

type TenantWithProperty = {
  tenant: User;
  property: Property;
};

export default function TenantsPage() {
  const { user: landlord } = useUser();

  const landlordProperties = landlord
    ? getPropertiesByLandlord(landlord.id)
    : [];

  const tenants: TenantWithProperty[] = landlordProperties
    .filter(
      (property) => property.status === 'occupied' && property.currentTenantId
    )
    .map((property) => {
      const tenant = getUserById(property.currentTenantId!);
      // The filter ensures tenant is not undefined, but we check to be safe
      return tenant ? { tenant, property } : null;
    })
    .filter((item): item is TenantWithProperty => item !== null);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold">My Tenants</h1>
          <p className="text-muted-foreground">
            Manage all your current tenants.
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
                <TableHead>Email</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map(({ tenant, property }) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                     <Link href={`/landlord/tenants/${tenant.id}`} className="hover:underline">
                        <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={tenant.avatarUrl} />
                            <AvatarFallback>
                            {tenant.name.charAt(0)}
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
                        <DropdownMenuItem>Message Tenant</DropdownMenuItem>
                        <DropdownMenuItem>View Lease</DropdownMenuItem>
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
              <h3 className="mt-4 text-lg font-semibold">No Tenants Yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                When a student occupies one of your properties, they will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
