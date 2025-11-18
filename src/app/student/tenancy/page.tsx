
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUserById, getPropertiesByTenant } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Mock current user
const useUser = () => {
    // To test tenant view: 'user-3'
    const user = getUserById('user-3');
    return { user };
};

export default function TenancyRedirectPage() {
  const { user } = useUser();
  const router = useRouter();
  const rentedProperties = user ? getPropertiesByTenant(user.id) : [];
  
  useEffect(() => {
      if (rentedProperties.length > 0) {
          const property = rentedProperties[0]; // Assuming one property per tenant
          router.replace(`/student/properties/${property.id}`);
      }
  }, [rentedProperties, router]);

  if (rentedProperties.length > 0) {
      return (
          <div>
              <p>Redirecting to your tenancy details...</p>
          </div>
      );
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>No Tenancy Found</CardTitle>
            <CardDescription>You are not currently renting any properties.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild>
                <Link href="/student/properties">Find a Property to Rent</Link>
            </Button>
        </CardContent>
    </Card>
  );
}
