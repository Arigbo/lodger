'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, Clock, Home, ArrowRight, Wallet, Activity, ExternalLink, Calendar, Building, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
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
      router.replace('/auth/login');
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
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (userProfile && !userProfile.stripeAccountId) {
      const timer = setTimeout(() => {
        toast({
          title: "Action Required: Financial Sync",
          description: "Synchronize your Stripe account to enable automated rent collection and disbursements.",
          action: (
            <Button variant="outline" size="sm" asChild className="rounded-xl border-2 font-black text-[10px] uppercase tracking-widest bg-white">
              <Link href="/landlord/account">SYNC NOW</Link>
            </Button>
          ),
          duration: 10000,
        });
      }, 3000);

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
    <div className="space-y-16 pb-32 animate-in fade-in duration-1000">
      {/* Premium Hero Section */}
      <div className="relative overflow-hidden rounded-[3rem] bg-foreground text-white p-10 md:p-16 border-2 border-white/10 shadow-3xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-bl-[10rem] -mr-16 -mt-16 blur-3xl opacity-50" />
        <div className="relative z-10 space-y-6">
          <div className="space-y-2">
            <h1 className="font-headline text-5xl md:text-6xl font-black tracking-tighter uppercase leading-none">
              Control <span className="text-primary">Center.</span>
            </h1>
            <p className="text-xl text-white/60 font-medium max-w-xl">
              Unified command for your property portfolio and rental operations.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 pt-4">
            <Button asChild className="h-14 rounded-2xl px-8 bg-primary text-white hover:bg-primary/90 transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20">
              <Link href="/landlord/properties/new" className="flex items-center gap-3">
                <PlusCircle className="h-5 w-5" /> ADD NEW PROPERTY
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-14 rounded-2xl px-8 border-white/20 hover:bg-white/10 transition-all font-black text-xs uppercase tracking-widest bg-transparent">
              <Link href="/landlord/requests" className="flex items-center gap-3">
                <Users className="h-5 w-5" /> VIEW REQUESTS
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Modern Stats Overlay */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 -mt-8 mx-4">
        {[
          { label: "Assets", val: stats.totalProperties, icon: Building, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Tenants", val: stats.activeTenants, icon: Users, color: "text-green-500", bg: "bg-green-500/10" },
          { label: "Pending", val: stats.pendingRequests, icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
          { label: "Available", val: stats.availableProperties, icon: Home, color: "text-purple-500", bg: "bg-purple-500/10" }
        ].map((stat, i) => (
          <Card key={i} className="rounded-3xl border-white/40 border-2 shadow-xl shadow-black/[0.02] bg-white/80 backdrop-blur-xl p-8 flex items-center gap-6">
            <div className={cn("h-16 w-16 rounded-[1.25rem] flex items-center justify-center flex-shrink-0", stat.bg)}>
              <stat.icon className={cn("h-8 w-8", stat.color)} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">{stat.label}</p>
              <p className="text-3xl font-black tracking-tighter">{stat.val}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Portfolio Insight */}
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
          <div className="space-y-4">
            <h2 className="text-4xl font-black uppercase tracking-tight">Portfolio <span className="text-primary">Overview</span></h2>
            <p className="text-lg text-muted-foreground font-medium max-w-2xl leading-relaxed">
              Performance analysis and management for your hosted assets.
            </p>
          </div>
          <Button variant="ghost" asChild size="lg" className="h-14 rounded-2xl px-6 font-black text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all">
            <Link href="/landlord/properties" className="flex items-center gap-3">VIEW ALL ASSETS <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>

        {properties && properties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {properties.slice(0, 4).map(property => (
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
              <h3 className="text-2xl font-black uppercase tracking-tight">Inventory Empty</h3>
              <p className="text-lg text-muted-foreground font-medium max-w-sm mx-auto">
                Begin your journey by digitizing your first property asset for the marketplace.
              </p>
            </div>
            <Button asChild className="h-16 rounded-[1.25rem] px-12 bg-foreground text-white hover:scale-105 transition-all font-black text-xs uppercase tracking-widest shadow-2xl shadow-black/10">
              <Link href="/landlord/properties/new">INITIATE SETUP</Link>
            </Button>
          </Card>
        )}
      </div>

      {/* Support & Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="relative group overflow-hidden rounded-[3rem] bg-white border-2 border-muted/10 p-12 shadow-xl hover:shadow-2xl transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[5rem] -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <div className="space-y-6">
            <h3 className="text-3xl font-black uppercase tracking-tight">Operations <span className="text-primary">Support</span></h3>
            <p className="text-muted-foreground font-medium text-lg leading-relaxed">
              Need assistance scaling your portfolio or managing complex leases? Our specialists are on standby to optimize your revenue.
            </p>
            <Button className="h-14 rounded-2xl px-10 bg-foreground text-white hover:bg-primary transition-all font-black text-xs uppercase tracking-[0.2em]">
              CONTACT SPECIALIST
            </Button>
          </div>
        </div>

        <div className="relative group overflow-hidden rounded-[3rem] bg-primary text-white p-12 shadow-xl hover:shadow-2xl transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[5rem] -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <div className="space-y-6">
            <h3 className="text-3xl font-black uppercase tracking-tight">Market <span className="text-white/60">Insights</span></h3>
            <p className="text-white/70 font-medium text-lg leading-relaxed">
              Explore the latest trends in rental assets and localized pricing strategies to maximize your investment performance.
            </p>
            <Button variant="outline" className="h-14 rounded-2xl px-10 border-white/20 bg-white/10 hover:bg-white text-white hover:text-primary transition-all font-black text-xs uppercase tracking-[0.2em]">
              EXPLORE DATA
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}



