"use client";

import * as React from 'react';
import Link from 'next/link';
import { Building2, GraduationCap, Mail, MessageSquare, Phone, Search, Users } from 'lucide-react';
import { collection, query, where } from 'firebase/firestore';
import { EmptyState, PageHeader, PageSkeleton } from '@/components/dashboard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useAsyncResult } from '@/hooks/use-async-result';
import { fetchDocsByIds } from '@/lib/firestore-batch';
import { formatPrice } from '@/lib/utils';
import type { Property, UserProfile as User } from '@/types';

type TenantWithProperty = {
  tenant: User;
  property: Property;
};


export default function TenantsPage() {
  const { user: landlord, isUserLoading } = useUser();
  const firestore = useFirestore();

  const propertiesQuery = useMemoFirebase(
    () => (landlord ? query(collection(firestore, 'properties'), where('landlordId', '==', landlord.uid)) : null),
    [landlord, firestore],
  );
  const { data: landlordProperties, isLoading: arePropertiesLoading } = useCollection<Property>(propertiesQuery);

  const { data: tenantsWithProperties = [], isLoading: areTenantsLoading } = useAsyncResult(
    landlordProperties,
    async (props): Promise<TenantWithProperty[]> => {
      const occupied = props.filter((p) => p.currentTenantId);
      const tenants = await fetchDocsByIds<User>(firestore, 'users', occupied.map((p) => p.currentTenantId));
      return occupied.flatMap((property) => {
        const tenant = tenants.get(property.currentTenantId!);
        return tenant ? [{ tenant, property }] : [];
      });
    }, { keepPrevious: true });
  const isLoading = arePropertiesLoading || areTenantsLoading;

  const [search, setSearch] = React.useState('');

  if (isLoading || isUserLoading) {
    return <PageSkeleton variant="list" />;
  }

  const term = search.trim().toLowerCase();
  const visible = tenantsWithProperties.filter(
    ({ tenant, property }) => !term || [tenant.name, tenant.email, property.title].some((v) => v?.toLowerCase().includes(term)),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        description={`${tenantsWithProperties.length} tenant${tenantsWithProperties.length === 1 ? '' : 's'} living in your properties.`}
      />

      {tenantsWithProperties.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No tenants yet"
          description="Tenants appear here once a lease is signed and the first payment is made."
          action={
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/landlord/requests">Review requests</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="relative max-w-sm">
            <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or property"
              aria-label="Search tenants"
              className="h-10 rounded-xl pl-9"
            />
          </div>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map(({ tenant, property }) => (
              <li key={`${tenant.id}-${property.id}`} className="flex flex-col rounded-2xl border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={tenant.profileImageUrl} alt="" className="object-cover" />
                    <AvatarFallback className="bg-primary/10 font-semibold text-primary">{tenant.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{tenant.name}</p>
                    {tenant.school && (
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <GraduationCap aria-hidden className="h-3.5 w-3.5" /> {tenant.school}
                      </p>
                    )}
                  </div>
                </div>

                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Building2 aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <dt className="sr-only">Property</dt>
                    <dd className="min-w-0 flex-1 truncate">
                      <Link href={`/landlord/properties/${property.id}`} className="hover:underline">
                        {property.title}
                      </Link>
                    </dd>
                    <dd className="shrink-0 text-muted-foreground">{formatPrice(property.price, property.currency)}/mo</dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <dt className="sr-only">Email</dt>
                    <dd className="truncate">
                      <a href={`mailto:${tenant.email}`} className="hover:underline">{tenant.email}</a>
                    </dd>
                  </div>
                  {tenant.phone && (
                    <div className="flex items-center gap-2">
                      <Phone aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <dt className="sr-only">Phone</dt>
                      <dd>
                        <a href={`tel:${tenant.phone}`} className="hover:underline">{tenant.phone}</a>
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="mt-5 flex gap-2 border-t pt-4">
                  <Button asChild size="sm" className="flex-1 rounded-lg">
                    <Link href={`/landlord/tenants/${tenant.id}`}>Manage tenancy</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-lg" aria-label={`Message ${tenant.name}`}>
                    <Link href={`/landlord/messages?conversationId=${tenant.id}`}>
                      <MessageSquare className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {visible.length === 0 && <EmptyState icon={Search} title="No tenants match your search" />}
        </>
      )}
    </div>
  );
}
