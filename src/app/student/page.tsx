
"use client";

import PropertyCard from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Home } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Property } from "@/types";
import Loading from '@/app/loading';


export default function StudentDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/auth/login');
    }
  }, [isUserLoading, user, router]);

  const propertiesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'properties'), where('currentTenantId', '==', user.uid));
  }, [user, firestore]);

  const applicationsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'rentalApplications'), where('tenantId', '==', user.uid), where('status', '==', 'pending'));
  }, [user, firestore]);

  const { data: rentedProperties, isLoading: propsLoading } = useCollection<Property>(propertiesQuery);
  const { data: pendingApplications, isLoading: appsLoading } = useCollection<any>(applicationsQuery);

  if (isUserLoading || propsLoading || appsLoading || !user) {
    return <Loading />;
  }

  const stats = {
    activeRents: rentedProperties?.length || 0,
    pendingApps: pendingApplications?.length || 0,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-headline text-3xl font-bold">Student Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.displayName || user?.email}.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/student/properties">Find a Property</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-primary/5 border-primary/10 transition-all hover:bg-primary/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary/70 font-medium">My Tenancies</CardDescription>
            <CardTitle className="text-3xl font-bold">{stats.activeRents}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Properties you are currently renting</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/5 border-orange-500/10 transition-all hover:bg-orange-500/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-orange-600/70 font-medium">Pending Applications</CardDescription>
            <CardTitle className="text-3xl font-bold text-orange-600">{stats.pendingApps}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Awaiting landlord approval</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/10 transition-all hover:bg-blue-500/10 hidden lg:block">
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-600/70 font-medium">Verified Status</CardDescription>
            <CardTitle className="text-3xl font-bold text-blue-600">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Your student account is verified</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-headline font-semibold">My Home</h2>

        {rentedProperties && rentedProperties.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {rentedProperties.map(property => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader className="text-center py-12">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
                <Home className="h-10 w-10 text-muted-foreground" />
              </div>
              <CardTitle>Not Renting Anything Yet</CardTitle>
              <CardDescription>Your active tenancies will appear here once approved by the landlord.</CardDescription>
              <div className="mt-6 flex justify-center">
                <Button asChild>
                  <Link href="/student/properties">Start Searching</Link>
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  )
}



