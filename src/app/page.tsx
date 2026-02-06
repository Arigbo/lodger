import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, Search, Building, UserCheck } from "lucide-react";
import PropertyCard from "@/components/property-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { firestore } from "@/firebase/admin";
import type { Property } from "@/types";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Lodger - Find Your Perfect Student Home",
  description: "The easiest way for university students to find and book their next rental property. Search thousands of listings near your campus.",
  alternates: {
    canonical: '/',
  },
};

async function getFeaturedProperties(): Promise<Property[]> {
  try {
    // Safely get the firestore instance, which might be undefined
    const db = firestore;
    if (!db) {
      console.warn("Firestore Admin SDK not available on the server. Skipping featured properties fetch.");
      return [];
    }

    const propertiesRef = db.collection('properties');
    const querySnapshot = await propertiesRef.where('status', '==', 'available').limit(6).get();
    const properties: Property[] = [];
    querySnapshot.forEach((doc: any) => {
      properties.push({ id: doc.id, ...doc.data() } as Property);
    });
    return properties;
  } catch (error: unknown) {
    console.error("Could not fetch featured properties (server-side):", error);
    // Gracefully return an empty array if Firestore isn't configured on the server.
    return [];
  }
}


import { LandingHero } from "@/components/landing-hero";
import { LandingFeatures } from "@/components/landing-features";
import { StatCard } from "@/components/stat-card";
import PropertyCarousel from "@/components/property-carousel";

export default async function Home() {
  const featuredProperties = await getFeaturedProperties();

  const stats = [
    { label: 'Verified Listings', value: 2000, suffix: '+' },
    { label: 'Student Users', value: 15000, suffix: '+' },
    { label: 'Verified Landlords', value: 100, suffix: '%' },
    { label: 'Happy Move-ins', value: 5000, suffix: '+' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Premium Hero Section */}
      <LandingHero
        imageUrl="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2070&auto=format&fit=crop"
        title="Find Your Perfect Student Home"
        description="The easiest way for university students to find and book their next rental property. Join the new standard of student living."
      />

      {/* Stats Section - Trust Builder */}
      <section className="py-16 sm:py-24 md:py-32 bg-background relative overflow-hidden border-y border-border/50">
        <div className="container relative z-10 mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-12 md:gap-24">
            {stats.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works Section - Modern Features */}
      <LandingFeatures />

      {/* Featured Properties Section */}
      <section id="featured" className="py-16 sm:py-24 md:py-32 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both">
            <h2 className="font-headline text-2xl sm:text-4xl md:text-5xl font-black mb-4 sm:mb-8">
              Handpicked <span className="text-primary">Properties</span>
            </h2>
            <p className="text-sm sm:text-base md:text-xl text-muted-foreground leading-relaxed">
              Check out some of the top-rated student homes available right now, verified for your safety.
            </p>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300 fill-mode-both">
            <PropertyCarousel properties={featuredProperties} />
          </div>

          <div className="mt-12 sm:mt-20 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500 fill-mode-both">
            <Button asChild size="lg" variant="outline" className="h-14 sm:h-16 px-6 sm:px-10 text-base sm:text-xl font-bold rounded-xl sm:rounded-2xl border-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all w-full sm:w-auto">
              <Link href="/student/properties" className="flex items-center">
                View All Properties <ArrowRight className="ml-2 h-6 w-6" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* High-Impact Landlord CTA Section */}
      <section className="py-16 sm:py-24 md:py-32 px-4 container mx-auto overflow-hidden">
        <div className="relative rounded-2xl sm:rounded-3xl md:rounded-[4rem] bg-foreground text-background px-4 sm:px-8 py-16 sm:py-24 md:py-40 shadow-2xl overflow-hidden text-center group animate-in fade-in zoom-in-95 duration-1000 fill-mode-both">
          <div className="absolute inset-0 z-0">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.4),transparent_50%)]" />
            <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_50%,rgba(147,51,234,0.4),transparent_50%)]" />
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-[10px] font-black uppercase tracking-[0.3em] mb-10">
              Propel Your Business
            </div>
            <h2 className="font-headline text-3xl sm:text-5xl md:text-8xl font-black tracking-tight mb-6 sm:mb-10 leading-[0.95]">
              Are You a <br /> <span className="text-primary italic animate-pulse">Landlord?</span>
            </h2>
            <p className="text-base sm:text-xl md:text-2xl text-muted-foreground mb-8 sm:mb-16 max-w-2xl mx-auto leading-relaxed">
              List your property on our state-of-the-art platform and connect with thousands of ambitious student tenants instantly.
            </p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-8">
              <Button size="lg" variant="default" className="h-16 sm:h-20 px-8 sm:px-12 text-lg sm:text-2xl font-black bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl sm:rounded-[2rem] shadow-2xl shadow-primary/50 hover:-translate-y-2 transition-all active:scale-95 w-full sm:w-auto" asChild>
                <Link href="/landlord" className="flex items-center">
                  Start Listing <ArrowRight className="ml-3 h-8 w-8" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
