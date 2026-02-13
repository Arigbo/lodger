"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Clock,
  Home,
  ArrowRight,
  Wallet,
  Activity,
  ExternalLink,
  Calendar,
  Building,
  PlusCircle,
} from "lucide-react";
import { format } from "date-fns";
import {
  useUser,
  useFirestore,
  useCollection,
  useDoc,
  useMemoFirebase,
} from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import type { Property, UserProfile, RentalApplication } from "@/types";
import Loading from "@/app/loading";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils";
import PropertyCard from "@/components/property-card";

export default function LandlordDashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/auth/login");
    }
  }, [isUserLoading, user, router]);

  if (isUserLoading || !user) {
    return <Loading />;
  }

  return <LandlordOverview />;
}

function LandlordOverview() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, "users", user.uid);
  }, [user, firestore]);

  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (
      userProfile &&
      !userProfile.stripeAccountId &&
      !userProfile.stripeBannerDismissed
    ) {
      const timer = setTimeout(() => {
        toast({
          title: "Link Your Bank Account (Stripe)",
          description:
            "Connect your Stripe account to start receiving rent payments automatically.",
          action: (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="rounded-xl border-2 font-black text-[10px] uppercase tracking-widest bg-white"
            >
              <Link href="/landlord/account">SYNC NOW</Link>
            </Button>
          ),
          duration: 10000,
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [userProfile, toast]);

  useEffect(() => {
    // Logic for checking overall status could go here
  }, []);

  const propertiesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, "properties"),
      where("landlordId", "==", user.uid),
    );
  }, [user, firestore]);

  const requestsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, "rentalApplications"),
      where("landlordId", "==", user.uid),
      where("status", "==", "pending"),
    );
  }, [user, firestore]);

  const { data: properties, isLoading: propsLoading } =
    useCollection<Property>(propertiesQuery);
  const { data: pendingRequests, isLoading: requestsLoading } =
    useCollection<any>(requestsQuery);

  const stats = {
    totalProperties: properties?.length || 0,
    activeTenants:
      properties?.filter((p) => p.status === "occupied").length || 0,
    pendingRequests: pendingRequests?.length || 0,
    availableProperties:
      properties?.filter((p) => p.status === "available").length || 0,
  };

  if (propsLoading || requestsLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-16 pb-32 animate-in fade-in duration-1000">
      {/* Premium Hero Section */}
      <div className="relative overflow-hidden rounded-[3rem] bg-foreground text-white p-10 md:p-16 border-2 border-white/10 shadow-3xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-bl-[10rem] -mr-16 -mt-16 blur-3xl opacity-50" />
        <div className="relative z-10 space-y-6">
          <div className="space-y-2">
            <h1 className="font-headline text-5xl md:text-6xl font-black tracking-tighter uppercase leading-none">
              Landlord <span className="text-primary">Dashboard.</span>
            </h1>
            <p className="text-xl text-white/60 font-medium max-w-xl">
              Manage your properties and see your rental activity in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 pt-4">
            <Button
              asChild
              className="h-14 rounded-2xl px-8 bg-primary text-white hover:bg-primary/90 transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20"
            >
              <Link
                href="/landlord/properties/new"
                className="flex items-center gap-3"
              >
                <PlusCircle className="h-5 w-5" /> ADD PROPERTY
              </Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="h-14 rounded-2xl px-8 border-white/20 hover:bg-white/10 transition-all font-black text-xs uppercase tracking-widest bg-transparent"
            >
              <Link
                href="/landlord/requests"
                className="flex items-center gap-3"
              >
                <Users className="h-5 w-5" /> VIEW REQUESTS
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stripe Connection Status Banner */}
      {!userProfile?.stripeAccountId && !userProfile?.stripeBannerDismissed && (
        <Card className="mx-4 overflow-hidden border-none bg-orange-500/5 shadow-xl shadow-orange-500/5 rounded-[2rem] relative group">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
            onClick={async () => {
              if (userDocRef) {
                try {
                  import("firebase/firestore").then(({ updateDoc }) => {
                    updateDoc(userDocRef, { stripeBannerDismissed: true });
                  });
                } catch (e) {
                  console.error("Failed to dismiss banner", e);
                }
              }
            }}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex flex-col md:flex-row items-center gap-8 p-8 md:p-10">
            <div className="h-20 w-20 rounded-3xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
              <Wallet className="h-10 w-10 text-orange-600" />
            </div>
            <div className="flex-1 space-y-2 text-center md:text-left">
              <h3 className="font-black text-2xl uppercase tracking-tight text-orange-900">
                Link your bank account
              </h3>
              <p className="text-orange-800/70 font-medium max-w-2xl leading-relaxed">
                Connect your Stripe account to receive rent payments. You won't
                be able to get paid until this is set up.
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="h-16 px-10 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-600/20"
            >
              <Link href="/landlord/account">COMPLETE SETUP</Link>
            </Button>
          </div>
        </Card>
      )}

      {userProfile?.stripeAccountId && (
        <div className="mx-4 px-8 py-4 rounded-3xl bg-green-500/5 border border-green-500/10 flex items-center gap-4">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <p className="text-[10px] font-black uppercase tracking-widest text-green-700">
            Bank account linked & ready
          </p>
        </div>
      )}

      {/* Modern Stats Overlay */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 -mt-8 mx-4">
        {[
          {
            label: "Properties",
            val: stats.totalProperties,
            icon: Building,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
          },
          {
            label: "Tenants",
            val: stats.activeTenants,
            icon: Users,
            color: "text-green-500",
            bg: "bg-green-500/10",
          },
          {
            label: "New Requests",
            val: stats.pendingRequests,
            icon: Clock,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
          },
          {
            label: "Available",
            val: stats.availableProperties,
            icon: Home,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
          },
        ].map((stat, i) => (
          <Card
            key={i}
            className="rounded-3xl border-white/40 border-2 shadow-xl shadow-black/[0.02] bg-white/80 backdrop-blur-xl p-8 flex items-center gap-6"
          >
            <div
              className={cn(
                "h-16 w-16 rounded-[1.25rem] flex items-center justify-center flex-shrink-0",
                stat.bg,
              )}
            >
              <stat.icon className={cn("h-8 w-8", stat.color)} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">
                {stat.label}
              </p>
              <p className="text-3xl font-black tracking-tighter">{stat.val}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Portfolio Insight */}
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
          <div className="space-y-4">
            <h2 className="text-4xl font-black uppercase tracking-tight">
              Your <span className="text-primary">Properties</span>
            </h2>
            <p className="text-lg text-muted-foreground font-medium max-w-2xl leading-relaxed">
              Track how your properties are doing and manage them here.
            </p>
          </div>
          <Button
            variant="ghost"
            asChild
            size="lg"
            className="h-14 rounded-2xl px-6 font-black text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
          >
            <Link
              href="/landlord/properties"
              className="flex items-center gap-3"
            >
              SEE ALL <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {properties && properties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {properties.slice(0, 4).map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <Card className="rounded-[4rem] border-2 border-dashed border-muted/20 bg-muted/5 p-20 text-center space-y-8">
            <div className="h-32 w-32 rounded-[2.5rem] bg-white shadow-2xl flex items-center justify-center mx-auto relative group overflow-hidden">
              <Building className="h-14 w-14 text-muted-foreground/20 group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-primary/5 rounded-[2.5rem]" />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-black uppercase tracking-tight">
                No Properties Yet
              </h3>
              <p className="text-lg text-muted-foreground font-medium max-w-sm mx-auto">
                Add your first property to start finding tenants.
              </p>
            </div>
            <Button
              asChild
              className="h-16 rounded-[1.25rem] px-12 bg-foreground text-white hover:scale-105 transition-all font-black text-xs uppercase tracking-widest shadow-2xl shadow-black/10"
            >
              <Link href="/landlord/properties/new">
                ADD YOUR FIRST PROPERTY
              </Link>
            </Button>
          </Card>
        )}
      </div>

      {/* Support & Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="relative group overflow-hidden rounded-[3rem] bg-white border-2 border-muted/10 p-12 shadow-xl hover:shadow-2xl transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[5rem] -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <div className="space-y-6">
            <h3 className="text-3xl font-black uppercase tracking-tight">
              Need <span className="text-primary">Help?</span>
            </h3>
            <p className="text-muted-foreground font-medium text-lg leading-relaxed">
              Have questions about your properties or payments? Our team is here
              to help you.
            </p>
            <Button className="h-14 rounded-2xl px-10 bg-foreground text-white hover:bg-primary transition-all font-black text-xs uppercase tracking-[0.2em]">
              CONTACT SUPPORT
            </Button>
          </div>
        </div>

        <div className="relative group overflow-hidden rounded-[3rem] bg-primary text-white p-12 shadow-xl hover:shadow-2xl transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[5rem] -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <div className="space-y-6">
            <h3 className="text-3xl font-black uppercase tracking-tight">
              Rental <span className="text-white/60">Tips</span>
            </h3>
            <p className="text-white/70 font-medium text-lg leading-relaxed">
              Learn how to manage your rentals better and earn more from your
              properties.
            </p>
            <Button
              variant="outline"
              className="h-14 rounded-2xl px-10 border-white/20 bg-white/10 hover:bg-white text-white hover:text-primary transition-all font-black text-xs uppercase tracking-[0.2em]"
            >
              SEE TIPS
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
