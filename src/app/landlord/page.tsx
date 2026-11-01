"use client";

import Link from "next/link";
import { ArrowRight, Bell, BookOpen, Building, CheckCircle2, Home, LifeBuoy, PlusCircle, Users, Wallet, Wrench, X } from "lucide-react";
import { collection, doc, query, updateDoc, where } from "firebase/firestore";
import PropertyCard from "@/components/properties/property-card";
import { EmptyState, PageHeader, StatCard, StatGrid } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { siteConfig } from "@/config/site";
import type { MaintenanceRequest, Property, RentalApplication } from "@/types";

export default function LandlordDashboardPage() {
  const { user, profile } = useUser();
  const firestore = useFirestore();

  const propertiesQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, "properties"), where("landlordId", "==", user.uid)) : null),
    [user, firestore],
  );
  const requestsQuery = useMemoFirebase(
    () =>
      user
        ? query(
            collection(firestore, "rentalApplications"),
            where("landlordId", "==", user.uid),
            where("status", "==", "pending"),
          )
        : null,
    [user, firestore],
  );
  const maintenanceQuery = useMemoFirebase(
    () =>
      user
        ? query(
            collection(firestore, "maintenanceRequests"),
            where("landlordId", "==", user.uid),
            where("status", "==", "Pending"),
          )
        : null,
    [user, firestore],
  );

  const { data: properties, isLoading: propsLoading } = useCollection<Property>(propertiesQuery);
  const { data: requests } = useCollection<RentalApplication>(requestsQuery);
  const { data: maintenance } = useCollection<MaintenanceRequest>(maintenanceQuery);

  const total = properties?.length ?? 0;
  const occupied = properties?.filter((p) => p.status === "occupied").length ?? 0;
  const available = total - occupied;
  const pendingRequests = requests?.length ?? 0;
  const openMaintenance = maintenance?.length ?? 0;

  const payoutsReady = !!profile?.stripeAccountId && !!profile?.stripeDetailsSubmitted;
  const showPayoutCard = !payoutsReady && !profile?.stripeBannerDismissed;

  const dismissPayoutCard = () => {
    if (user) updateDoc(doc(firestore, "users", user.uid), { stripeBannerDismissed: true }).catch(console.error);
  };

  const attention = [
    pendingRequests > 0 && {
      href: "/landlord/requests",
      icon: Bell,
      label: `${pendingRequests} rental request${pendingRequests === 1 ? "" : "s"} waiting for a reply`,
    },
    openMaintenance > 0 && {
      href: "/landlord/maintenance",
      icon: Wrench,
      label: `${openMaintenance} open maintenance issue${openMaintenance === 1 ? "" : "s"}`,
    },
  ].filter(Boolean) as { href: string; icon: typeof Bell; label: string }[];

  return (
    <div className="space-y-10">
      <PageHeader
        title={`Welcome back${profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}`}
        description="An overview of your properties, tenants and requests."
        actions={
          <>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/landlord/requests">
                <Users className="mr-2 h-4 w-4" /> View requests
              </Link>
            </Button>
            <Button asChild className="rounded-xl">
              <Link href="/landlord/properties/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Add property
              </Link>
            </Button>
          </>
        }
      />

      {showPayoutCard && (
        <section className="relative flex flex-col gap-4 rounded-2xl border border-amber-500/30 bg-amber-50 p-5 sm:flex-row sm:items-center">
          <div className="rounded-xl bg-amber-500/15 p-3 text-amber-700">
            <Wallet aria-hidden className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-amber-900">Set up payouts to get paid online</h2>
            <p className="text-sm text-amber-800/90">
              Connect Stripe so tenants can pay rent by card, straight into your bank account.
            </p>
          </div>
          <Button asChild className="rounded-xl bg-amber-600 text-white hover:bg-amber-700">
            <Link href="/landlord/account">Set up payouts</Link>
          </Button>
          <button
            type="button"
            onClick={dismissPayoutCard}
            aria-label="Dismiss"
            className="absolute right-3 top-3 rounded-full p-1.5 text-amber-700 transition-colors hover:bg-amber-100 sm:static"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </section>
      )}

      <StatGrid>
        <StatCard label="Properties" value={propsLoading ? "—" : total} icon={Building} href="/landlord/properties" />
        <StatCard label="Occupied" value={propsLoading ? "—" : occupied} icon={Users} tone="success" href="/landlord/tenants" />
        <StatCard label="Available" value={propsLoading ? "—" : available} icon={Home} tone="info" href="/landlord/properties" />
        <StatCard
          label="New requests"
          value={pendingRequests}
          icon={Bell}
          tone="warning"
          href="/landlord/requests"
        />
      </StatGrid>

      <section aria-labelledby="attention-heading" className="space-y-3">
        <h2 id="attention-heading" className="text-lg font-semibold">
          Needs your attention
        </h2>
        {attention.length ? (
          <ul className="divide-y rounded-2xl border bg-card">
            {attention.map(({ href, icon: Icon, label }) => (
              <li key={href}>
                <Link href={href} className="group flex items-center gap-3 px-4 py-3.5 text-sm font-medium hover:bg-accent/50">
                  <Icon aria-hidden className="h-4 w-4 text-amber-600" />
                  <span className="flex-1">{label}</span>
                  <ArrowRight aria-hidden className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 rounded-2xl border bg-card px-4 py-3.5 text-sm text-muted-foreground">
            <CheckCircle2 aria-hidden className="h-4 w-4 text-emerald-600" /> You&apos;re all caught up.
          </p>
        )}
      </section>

      <section aria-labelledby="properties-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="properties-heading" className="text-lg font-semibold">
            Your properties
          </h2>
          {total > 0 && (
            <Link href="/landlord/properties" className="text-sm font-medium text-primary hover:underline">
              See all
            </Link>
          )}
        </div>
        {total > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {properties!.slice(0, 3).map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          !propsLoading && (
            <EmptyState
              icon={Building}
              title="No properties yet"
              description="Add your first property to start receiving requests from students."
              action={
                <Button asChild className="rounded-xl">
                  <Link href="/landlord/properties/new">Add your first property</Link>
                </Button>
              }
            />
          )
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <a
          href={`mailto:${siteConfig.supportEmail}`}
          className="group flex items-start gap-4 rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40"
        >
          <LifeBuoy aria-hidden className="h-6 w-6 text-primary" />
          <div>
            <p className="font-semibold">Need help?</p>
            <p className="text-sm text-muted-foreground">Questions about listings or payments? Email our support team.</p>
          </div>
        </a>
        <a
          href={siteConfig.blogUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-4 rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40"
        >
          <BookOpen aria-hidden className="h-6 w-6 text-primary" />
          <div>
            <p className="font-semibold">Landlord tips</p>
            <p className="text-sm text-muted-foreground">Guides on pricing, listing photos and finding great tenants.</p>
          </div>
        </a>
      </section>
    </div>
  );
}
