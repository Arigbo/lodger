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
    <div className="space-y-12 pb-32 animate-in fade-in duration-1000">
      {/* Cinematic Hero Section */}
      <div className="relative group overflow-hidden rounded-[3.5rem] bg-[#050505] text-white p-10 md:p-16 shadow-3xl">
        <div className="absolute inset-0 z-0 opacity-40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#3b82f6_0%,transparent_70%)]" />
          <div className="absolute inset-0 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:80px_80px]" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic">OPERATIONAL INTELLIGENCE</p>
            </div>
            <h1 className="font-headline text-5xl md:text-7xl font-black tracking-tight leading-[0.9]">
              CURATOR <span className="text-primary italic">PORTFOLIO</span>
            </h1>
            <p className="text-xl text-white/50 font-serif italic max-w-xl">
              &quot;Managing your digital real estate sanctuary with precision and sophisticated automation.&quot;
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" className="h-16 rounded-3xl px-8 border-2 border-white/10 text-white bg-white/5 backdrop-blur-xl hover:bg-white/10 hover:scale-105 transition-all text-xs font-black uppercase tracking-widest">
              <Link href="/landlord/requests" className="flex items-center gap-3">
                <Activity className="h-4 w-4" /> REVIEWS
                <span className="bg-orange-500 text-white px-2 py-0.5 rounded-lg text-[10px]">{stats.pendingRequests}</span>
              </Link>
            </Button>
            <Button asChild className="h-16 rounded-3xl px-8 bg-primary text-white hover:bg-primary/90 hover:scale-105 shadow-2xl transition-all text-xs font-black uppercase tracking-widest gap-3">
              <Link href="/landlord/properties/new">
                <PlusCircle className="h-5 w-5" /> NEW ASSET
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* High-Performance Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: "Assets Managed", val: stats.totalProperties, icon: Building, color: "text-blue-500", bg: "bg-blue-500/5", desc: "Digital land footprint" },
          { label: "Active Revenue", val: stats.activeTenants, icon: Wallet, color: "text-green-500", bg: "bg-green-500/5", desc: "Live yield generators" },
          { label: "Pending Reviews", val: stats.pendingRequests, icon: Clock, color: "text-orange-500", bg: "bg-orange-500/5", desc: "Applicant queue" },
          { label: "Market Ready", val: stats.availableProperties, icon: Home, color: "text-purple-500", bg: "bg-purple-500/5", desc: "Open for curation" }
        ].map((stat, i) => (
          <Card key={i} className="group relative overflow-hidden rounded-[2.5rem] border-2 border-foreground/5 shadow-sm transition-all hover:shadow-2xl hover:-translate-y-1 bg-white p-8">
            <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-bl-[5rem] -mr-8 -mt-8 opacity-0 group-hover:opacity-10 transition-all", stat.bg)} />
            <div className="relative z-10 space-y-4">
              <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500", stat.bg)}>
                <stat.icon className={cn("h-7 w-7", stat.color)} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 italic mb-1">{stat.label}</p>
                <p className="text-4xl font-black tracking-tighter">{stat.val}</p>
              </div>
              <p className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">{stat.desc}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Content Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Portfolio View */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between px-2">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tight">PORTFOLIO <span className="text-primary italic">ORCHESTRATION</span></h2>
              <p className="text-sm font-medium text-muted-foreground italic font-serif">A curated view of your high-yield rental assets.</p>
            </div>
            <Button variant="ghost" asChild size="sm" className="font-black text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 hover:bg-transparent">
              <Link href="/landlord/properties" className="flex items-center gap-2">VIEW ALL ASSETS <ExternalLink className="h-3 w-3" /></Link>
            </Button>
          </div>

          {properties && properties.length > 0 ? (
            <div className="grid grid-cols-1 gap-10">
              {properties.slice(0, 4).map(property => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <Card className="rounded-[3.5rem] border-2 border-dashed border-foreground/10 bg-muted/5 p-20 text-center space-y-8 animate-in zoom-in duration-700">
              <div className="h-32 w-32 rounded-[2.5rem] bg-white shadow-2xl flex items-center justify-center mx-auto relative">
                <Building className="h-14 w-14 text-muted-foreground/20" />
                <div className="absolute inset-0 bg-primary/5 rounded-[2.5rem] animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tight">Empty Inventory</h3>
                <p className="text-lg text-muted-foreground font-serif italic max-w-sm mx-auto">
                  &quot;Begin your journey by digitizing your first property asset for the marketplace.&quot;
                </p>
              </div>
              <Button asChild className="h-14 rounded-2xl px-10 bg-foreground text-white hover:scale-105 transition-all font-black text-xs uppercase tracking-widest">
                <Link href="/landlord/properties/new">INITIATE ASSET PROTOCOL</Link>
              </Button>
            </Card>
          )}
        </div>

        {/* Intelligent Sidebar */}
        <div className="space-y-12">
          {/* Activity Feed / Notifications Placeholder */}
          <Card className="rounded-[3rem] border-2 border-foreground/5 shadow-2xl bg-white overflow-hidden">
            <CardHeader className="p-8 border-b-2 border-muted/5 bg-muted/5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic mb-2">SYSTEM TELEMETRY</p>
              <CardTitle className="text-2xl font-black uppercase tracking-tighter">Live Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {[
                { icon: Users, label: "Applicant", desc: "New inquiry for Penthouse #4", time: "2h ago", color: "bg-blue-500/10 text-blue-600" },
                { icon: Calendar, label: "Payment", desc: "Rent received: Modern Loft", time: "5h ago", color: "bg-green-500/10 text-green-600" },
                { icon: Wallet, label: "Payout", desc: "Stripe transfer initiated", time: "1d ago", color: "bg-purple-500/10 text-purple-600" }
              ].map((item, i) => (
                <div key={i} className="flex gap-5 group items-start">
                  <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform", item.color)}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center gap-2">
                      <p className="text-[10px] font-black uppercase tracking-widest">{item.label}</p>
                      <span className="text-[8px] font-bold text-muted-foreground/40">{item.time}</span>
                    </div>
                    <p className="text-sm font-bold text-muted-foreground/80 leading-snug">{item.desc}</p>
                  </div>
                </div>
              ))}
              <Button variant="ghost" className="w-full h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-primary transition-colors">
                VIEW FULL TELEMETRY
              </Button>
            </CardContent>
          </Card>

          {/* Quick Promotion Card */}
          <div className="relative group overflow-hidden rounded-[3rem] bg-foreground text-white p-10 shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[5rem] -mr-8 -mt-8 transition-transform group-hover:scale-110" />
            <div className="relative z-10 space-y-6">
              <h3 className="text-2xl font-black leading-tight uppercase tracking-tight">CURATION <span className="text-primary italic">SUPPORT</span></h3>
              <p className="text-white/40 font-serif italic text-sm leading-relaxed">
                Need assistance scaling your portfolio or managing complex leases? Our specialists are on standby.
              </p>
              <Button className="w-full h-14 rounded-2xl bg-white text-foreground hover:bg-white/90 transition-all font-black text-xs uppercase tracking-widest">
                CONTACT SPECIALIST
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



