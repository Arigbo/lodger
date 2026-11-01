import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingHero } from "@/components/marketing/landing-hero";
import { LandingFeatures } from "@/components/marketing/landing-features";
import { StatCard } from "@/components/marketing/stat-card";
import PropertyCarousel from "@/components/properties/property-carousel";
import { getAvailableProperties } from "@/lib/data/properties";

export const revalidate = 600;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const stats = [
  { label: "Verified listings", value: 2000, suffix: "+" },
  { label: "Student users", value: 15000, suffix: "+" },
  { label: "Verified landlords", value: 100, suffix: "%" },
  { label: "Happy move-ins", value: 5000, suffix: "+" },
];

const landlordBenefits = [
  "Reach students actively searching near your property",
  "Digital leases signed by both parties",
  "Rent paid online, straight to your account",
  "Track tenants, maintenance and payments in one place",
];

export default async function HomePage() {
  const featuredProperties = await getAvailableProperties(6);

  return (
    <>
      <LandingHero
        showSearch
        imageUrl="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2070&auto=format&fit=crop"
        title="Find your perfect student home"
        highlight={["perfect", "student"]}
        description="Browse verified rooms and apartments near your university, chat with landlords and sign your lease — all in one place."
      />

      <section aria-label="Lodger in numbers" className="border-y bg-background py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-4 sm:px-6 md:grid-cols-4 lg:px-8">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      <LandingFeatures />

      <section id="featured" aria-labelledby="featured-heading" className="bg-background py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 id="featured-heading" className="font-headline text-3xl font-bold tracking-tight sm:text-5xl">
              Homes available <span className="text-primary">right now</span>
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              A selection of listings from verified landlords, ready for move-in.
            </p>
          </div>

          {featuredProperties.length > 0 ? (
            <PropertyCarousel properties={featuredProperties} />
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed p-12 text-center text-muted-foreground">
              <Building2 aria-hidden className="h-8 w-8" />
              New listings are added every day — browse everything that is available.
            </div>
          )}

          <div className="mt-12 text-center">
            <Button asChild size="lg" variant="outline" className="h-12 rounded-xl px-8 font-semibold">
              <Link href="/properties">
                View all properties <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section aria-labelledby="landlord-heading" className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-foreground px-6 py-16 text-background sm:px-12 sm:py-20 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,hsl(var(--primary)/0.45),transparent_55%)]"
          />
          <div className="relative">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary-light">For landlords</p>
            <h2 id="landlord-heading" className="mt-3 font-headline text-3xl font-bold tracking-tight sm:text-5xl">
              Fill your rooms with reliable student tenants
            </h2>
            <p className="mt-4 max-w-lg text-base text-background/70 sm:text-lg">
              List in minutes and manage requests, leases and rent from a single dashboard.
            </p>
            <Button asChild size="lg" className="mt-8 h-12 rounded-xl px-8 font-semibold">
              <Link href="/auth/signup?type=landlord">
                Start listing for free <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
          <ul className="relative mt-10 space-y-4 lg:mt-0">
            {landlordBenefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-base text-background/85">
                <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary-light" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
