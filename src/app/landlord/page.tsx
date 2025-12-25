
"use client";

import PropertyCard from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { PlusCircle, Building } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { collection, query, where, doc } from "firebase/firestore";
import type { Property, UserProfile } from "@/types";
import Loading from '@/app/loading';
import { useToast } from '@/hooks/use-toast';
import { useDoc } from '@/firebase';

export default function LandlordDashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/auth/login');
    }
  }, [isUserLoading, user, router]);

  if (isUserLoading || !user) {
    return <Loading />;
  }

  // This is a client component, but we have user data. We must ensure only landlords see this page.
  // We will get the user document from firestore to check the role.
  // For now, we'll assume if they try to access /landlord, they are one if logged in.
  // A more robust solution involves custom claims or checking the user doc.

  return <LandlordOverview />;
}

function LandlordOverview() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  // Show Stripe setup reminder
  useEffect(() => {
    if (userProfile && !userProfile.stripeAccountId) {
      const timer = setTimeout(() => {
        toast({
          title: "Set Up Payments",
          description: "Connect your Stripe account to receive rent payments directly from tenants.",
          action: (
            <Button variant="outline" size="sm" asChild>
              <Link href="/landlord/account">Set Up Now</Link>
            </Button>
          ),
          duration: 10000,
        });
      }, 2000); // Show after 2 seconds

      return () => clearTimeout(timer);
    }
  }, [userProfile, toast]);

  const propertiesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'properties'), where('landlordId', '==', user.uid));
  }, [user, firestore]);

  const requestsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'rentalApplications'), where('landlordId', '==', user.uid), where('status', '==', 'pending'));
  }, [user, firestore]);

  const { data: properties, isLoading: propsLoading } = useCollection<Property>(propertiesQuery);
  const { data: pendingRequests, isLoading: requestsLoading } = useCollection<any>(requestsQuery);

  const stats = {
    totalProperties: properties?.length || 0,
    activeTenants: properties?.filter(p => p.status === 'occupied').length || 0,
    pendingRequests: pendingRequests?.length || 0,
    availableProperties: properties?.filter(p => p.status === 'available').length || 0,
  };

  if (propsLoading || requestsLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-headline text-3xl font-bold">Overview</h1>
          <p className="text-muted-foreground">Welcome back, {user?.displayName || user?.email}.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/landlord/requests">
              View Requests
            </Link>
          </Button>
          <Button asChild>
            <Link href="/landlord/properties/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Property
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/10 transition-all hover:bg-primary/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary/70 font-medium">Total Properties</CardDescription>
            <CardTitle className="text-3xl font-bold">{stats.totalProperties}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Across all locations</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/10 transition-all hover:bg-green-500/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-green-600/70 font-medium">Active Tenants</CardDescription>
            <CardTitle className="text-3xl font-bold text-green-600">{stats.activeTenants}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Currently renting</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/5 border-orange-500/10 transition-all hover:bg-orange-500/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-orange-600/70 font-medium">Pending Requests</CardDescription>
            <CardTitle className="text-3xl font-bold text-orange-600">{stats.pendingRequests}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/10 transition-all hover:bg-blue-500/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-600/70 font-medium">Available</CardDescription>
            <CardTitle className="text-3xl font-bold text-blue-600">{stats.availableProperties}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Listed for rent</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-headline font-semibold">My Properties</h2>
          <Button variant="ghost" asChild size="sm">
            <Link href="/landlord/properties">View All</Link>
          </Button>
        </div>

        {properties && properties.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {properties.map(property => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader className="text-center py-10">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
                <Building className="h-10 w-10 text-muted-foreground" />
              </div>
              <CardTitle>No Properties Yet</CardTitle>
              <CardDescription>Start managing your portfolio by adding your first listing.</CardDescription>
              <div className="mt-6 flex justify-center">
                <Button asChild>
                  <Link href="/landlord/properties/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Listing
                  </Link>
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}



