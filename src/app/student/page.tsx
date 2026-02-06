"use client";

import PropertyCard from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Home } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
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

  const stats = useMemo(() => ({
    activeRents: rentedProperties?.length || 0,
    pendingApps: pendingApplications?.length || 0,
  }), [rentedProperties, pendingApplications]);

  return (
    <div className="space-y-12">
      {/* Header Section */}
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-foreground">
            Hi, {user?.displayName?.split(' ')[0] || 'there'}! 👋
          </h1>
          <p className="text-lg font-medium text-muted-foreground/80">
            Welcome back to your Lodger dashboard.
          </p>
        </div>
        <Button size="lg" className="rounded-2xl px-8 font-bold shadow-xl shadow-primary/20 transition-all hover:shadow-primary/40 hover:-translate-y-1 active:translate-y-0" asChild>
          <Link href="/student/properties">Explore Properties</Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="group relative overflow-hidden border-none bg-white p-1 transition-all hover:shadow-2xl hover:shadow-primary/5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <CardHeader className="relative pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-widest text-primary/60">Currently Renting</CardDescription>
            <CardTitle className="text-4xl font-black tracking-tighter text-primary">{stats.activeRents}</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-sm font-medium text-muted-foreground/80">Active tenancies secured</p>
          </CardContent>
          {/* Decorative background icon */}
          <Home className="absolute -bottom-4 -right-4 h-24 w-24 text-primary/5 transition-transform group-hover:scale-110 group-hover:rotate-6" />
        </Card>

        <Card className="group relative overflow-hidden border-none bg-white p-1 transition-all hover:shadow-2xl hover:shadow-orange-500/5">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <CardHeader className="relative pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-widest text-orange-600/60">Applications</CardDescription>
            <CardTitle className="text-4xl font-black tracking-tighter text-orange-600">{stats.pendingApps}</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-sm font-medium text-muted-foreground/80">Pending landlord approval</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-none bg-white p-1 transition-all hover:shadow-2xl hover:shadow-blue-500/5 hidden lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <CardHeader className="relative pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-widest text-blue-600/60">Account Status</CardDescription>
            <CardTitle className="text-4xl font-black tracking-tighter text-blue-600">Verified</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-sm font-medium text-muted-foreground/80">Priority student access active</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-headline font-bold tracking-tight">My Active Tenancies</h2>
          {rentedProperties && rentedProperties.length > 0 && (
            <Link href="/student/tenancy" className="text-sm font-bold text-primary hover:underline underline-offset-4">
              View All Details →
            </Link>
          )}
        </div>

        {rentedProperties && rentedProperties.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {rentedProperties.map(property => (
              <Link key={property.id} href={`/student/tenancy/${property.id}`} className="group transition-all hover:-translate-y-2 block">
                <PropertyCard property={property} as="div" />
              </Link>
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden border-none bg-white shadow-xl shadow-black/[0.02]">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-muted/30 transition-transform hover:scale-110 hover:rotate-3">
                <Home className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">No Active Tenancies</CardTitle>
              <CardDescription className="mx-auto mt-2 max-w-sm text-base font-medium leading-relaxed">
                You haven&apos;t secured any rentals yet. Start exploring properties and apply to your favorites!
              </CardDescription>
              <Button size="lg" className="mt-8 rounded-2xl px-8 font-bold" asChild>
                <Link href="/student/properties">Start Searching</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}



