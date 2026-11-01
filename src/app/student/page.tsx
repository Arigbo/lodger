"use client";

import Link from "next/link";
import { ArrowRight, Bell, Heart, Home, MessageSquare, Search, UserCog } from "lucide-react";
import { collection, query, where } from "firebase/firestore";
import PropertyCard from "@/components/properties/property-card";
import { EmptyState, PageHeader, StatCard, StatGrid } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import type { Property, RentalApplication } from "@/types";

export default function StudentDashboardPage() {
  const { user, profile } = useUser();
  const firestore = useFirestore();

  const rentedQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, "properties"), where("currentTenantId", "==", user.uid)) : null),
    [user, firestore],
  );
  const pendingQuery = useMemoFirebase(
    () =>
      user
        ? query(
            collection(firestore, "rentalApplications"),
            where("tenantId", "==", user.uid),
            where("status", "==", "pending"),
          )
        : null,
    [user, firestore],
  );

  const { data: rented, isLoading: rentedLoading } = useCollection<Property>(rentedQuery);
  const { data: pending, isLoading: pendingLoading } = useCollection<RentalApplication>(pendingQuery);

  const firstName = (profile?.name || user?.displayName || "").split(" ")[0];
  const savedCount = profile?.bookmarkedPropertyIds?.length ?? 0;
  const loading = rentedLoading || pendingLoading;

  return (
    <div className="space-y-10">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        description="Here's what's happening with your search and your home."
        actions={
          <Button asChild className="rounded-xl">
            <Link href="/student/properties">
              <Search className="mr-2 h-4 w-4" /> Find a home
            </Link>
          </Button>
        }
      />

      <StatGrid className="lg:grid-cols-3">
        <StatCard
          label="Current home"
          value={loading ? "—" : rented?.length ? rented.length : "None yet"}
          icon={Home}
          hint={rented?.length ? "Active tenancy" : "Apply to a listing to get started"}
          href="/student/tenancy"
        />
        <StatCard
          label="Pending requests"
          value={loading ? "—" : pending?.length ?? 0}
          icon={Bell}
          tone="warning"
          hint="Waiting for landlord approval"
          href="/student/requests"
        />
        <StatCard
          label="Saved homes"
          value={savedCount}
          icon={Heart}
          tone="danger"
          hint="Your shortlist"
          href="/student/bookmarks"
          className="col-span-2 lg:col-span-1"
        />
      </StatGrid>

      <div className="grid gap-8 lg:grid-cols-3">
        <section aria-labelledby="tenancies-heading" className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 id="tenancies-heading" className="text-lg font-semibold">
              Your home
            </h2>
            {!!rented?.length && (
              <Link href="/student/tenancy" className="text-sm font-medium text-primary hover:underline">
                Manage tenancy
              </Link>
            )}
          </div>

          {rented?.length ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {rented.map((property) => (
                <Link key={property.id} href={`/student/tenancy/${property.id}`} className="block">
                  <PropertyCard property={property} as="div" />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Home}
              title="You're not renting anywhere yet"
              description="Browse verified listings near your campus and send a request when you find the one."
              action={
                <Button asChild className="rounded-xl">
                  <Link href="/student/properties">Start searching</Link>
                </Button>
              }
            />
          )}
        </section>

        <aside aria-labelledby="quick-actions-heading" className="space-y-4">
          <h2 id="quick-actions-heading" className="text-lg font-semibold">
            Quick actions
          </h2>
          <ul className="divide-y rounded-2xl border bg-card">
            {[
              { href: "/student/messages", icon: MessageSquare, label: "Message a landlord" },
              { href: "/student/requests", icon: Bell, label: "Track your requests" },
              { href: "/student/leases", icon: Home, label: "View lease agreements" },
              {
                href: "/student/account",
                icon: UserCog,
                label: profile?.phone ? "Update your profile" : "Add your phone number",
              },
            ].map(({ href, icon: Icon, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-colors hover:bg-accent/50"
                >
                  <Icon aria-hidden className="h-4 w-4 text-primary" />
                  <span className="flex-1">{label}</span>
                  <ArrowRight
                    aria-hidden
                    className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
