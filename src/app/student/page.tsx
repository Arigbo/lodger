"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, Heart, Home, KeyRound, MessageSquare, PenLine, Search, Send, Wallet, Wrench } from "lucide-react";
import { collection, query, where } from "firebase/firestore";
import { EmptyState, JourneyStepper, PageHeader, PageSkeleton, SectionCard, StatusBadge } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { useAsyncResult } from "@/hooks/use-async-result";
import { fetchDocsByIds } from "@/lib/firestore-batch";
import { formatPrice } from "@/lib/utils";
import type { LeaseAgreement, Property, RentalApplication } from "@/types";

const STEPS = ["Find a home", "Send a request", "Sign lease", "Pay rent", "Move in"];

type NextStep = {
  index: number;
  eyebrow: string;
  title: string;
  body: string;
  cta: { href: string; label: string };
  icon: typeof Search;
};

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export default function StudentHomePage() {
  const { user, profile } = useUser();
  const firestore = useFirestore();

  const requestsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, "rentalApplications"), where("tenantId", "==", user.uid)) : null),
    [user, firestore],
  );
  const leasesQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, "leaseAgreements"), where("tenantId", "==", user.uid)) : null),
    [user, firestore],
  );
  const { data: requests, isLoading: requestsLoading } = useCollection<RentalApplication>(requestsQuery);
  const { data: leases, isLoading: leasesLoading } = useCollection<LeaseAgreement>(leasesQuery);

  // Property details for everything shown on the page, fetched in one batch.
  const propertyIds = [...(requests ?? []).map((r) => r.propertyId), ...(leases ?? []).map((l) => l.propertyId)];
  const idsKey = [...new Set(propertyIds)].sort().join(",");
  const { data: properties } = useAsyncResult(idsKey || null, (key) => fetchDocsByIds<Property>(firestore, "properties", key.split(",")), {
    keepPrevious: true,
  });

  if (requestsLoading || leasesLoading) return <PageSkeleton variant="overview" />;

  const activeLease = leases?.find((l) => l.status === "active" || l.status === "terminating");
  const pendingLease = leases?.find((l) => l.status === "pending");
  const pendingRequests = (requests ?? []).filter((r) => r.status === "pending");
  const home = activeLease ? properties?.get(activeLease.propertyId) : undefined;

  const next: NextStep = activeLease
    ? {
        index: STEPS.length,
        eyebrow: "You're all set",
        title: home ? `Welcome home to ${home.title}` : "Your tenancy is active",
        body: "Pay rent, report a maintenance issue or message your landlord from your tenancy page.",
        cta: { href: `/student/tenancy/${activeLease.propertyId}`, label: "Manage tenancy" },
        icon: KeyRound,
      }
    : pendingLease && !pendingLease.tenantSigned
      ? {
          index: 2,
          eyebrow: "Action needed",
          title: "Review and sign your lease",
          body: "Your request was accepted. Read the agreement carefully, then sign it to secure the home.",
          cta: { href: `/student/leases/${pendingLease.id}`, label: "Review lease" },
          icon: PenLine,
        }
      : pendingLease
        ? {
            index: 3,
            eyebrow: "Almost there",
            title: "Pay your first rent to move in",
            body: pendingLease.paymentMethod === "offline"
              ? "Your bank transfer is waiting for the landlord to confirm it."
              : "Your lease is signed. Complete the first payment to activate your tenancy.",
            cta: { href: `/student/leases/${pendingLease.id}`, label: pendingLease.paymentMethod === "offline" ? "View status" : "Pay now" },
            icon: Wallet,
          }
        : pendingRequests.length
          ? {
              index: 1,
              eyebrow: "Waiting on landlords",
              title: `${pendingRequests.length} request${pendingRequests.length === 1 ? "" : "s"} awaiting a reply`,
              body: "Landlords usually reply within a few days. Keep browsing in the meantime — you can request more than one home.",
              cta: { href: "/student/requests", label: "Track requests" },
              icon: Send,
            }
          : {
              index: 0,
              eyebrow: "Get started",
              title: "Find a home you love",
              body: "Browse verified listings near your campus, save favourites and send a request when you're ready.",
              cta: { href: "/student/properties", label: "Browse homes" },
              icon: Search,
            };

  const recentRequests = [...(requests ?? [])]
    .sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime())
    .slice(0, 4);
  const firstName = (profile?.name || user?.displayName || "").split(" ")[0];
  const savedCount = profile?.bookmarkedPropertyIds?.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
        description={new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
      />

      {/* Next step */}
      <section
        aria-labelledby="next-step-title"
        className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
      >
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex gap-4">
            <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground sm:flex">
              <next.icon aria-hidden className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">{next.eyebrow}</p>
              <h2 id="next-step-title" className="mt-1 font-headline text-xl font-bold tracking-tight sm:text-2xl">
                {next.title}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">{next.body}</p>
              <Button asChild className="mt-5 rounded-xl">
                <Link href={next.cta.href}>
                  {next.cta.label} <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          <JourneyStepper steps={STEPS} current={next.index} className="w-full lg:w-[440px]" />
        </div>
      </section>

      {/* Current home */}
      {activeLease && home && (
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Monthly rent", value: formatPrice(home.price, home.currency), icon: Wallet },
            { label: "Lease ends", value: new Date(activeLease.endDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }), icon: Home },
            { label: "Need a repair?", value: "Report an issue", icon: Wrench, href: `/student/tenancy/${activeLease.propertyId}` },
          ].map(({ label, value, icon: Icon, href }) => {
            const body = (
              <div className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/40">
                <span className="rounded-xl bg-primary/10 p-2.5 text-primary">
                  <Icon aria-hidden className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm text-muted-foreground">{label}</span>
                  <span className="block font-semibold">{value}</span>
                </span>
              </div>
            );
            return href ? <Link key={label} href={href}>{body}</Link> : <div key={label}>{body}</div>;
          })}
        </section>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="Your requests"
          description="Homes you've asked to rent"
          action={requests?.length ? { href: "/student/requests", label: "View all" } : undefined}
        >
          {recentRequests.length ? (
            <ul className="divide-y">
              {recentRequests.map((request) => {
                const property = properties?.get(request.propertyId);
                return (
                  <li key={request.id}>
                    <Link
                      href={`/student/properties/${request.propertyId}`}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-accent/50"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <Home aria-hidden className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{property?.title ?? "Loading…"}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {property ? `${formatPrice(property.price, property.currency)}/mo · ` : ""}
                          Sent {formatDistanceToNow(new Date(request.applicationDate), { addSuffix: true })}
                        </span>
                      </span>
                      <StatusBadge status={request.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              className="m-5 border-none bg-transparent py-10"
              icon={Send}
              title="No requests yet"
              description="When you find a place you like, send the landlord a request from the listing page."
              action={
                <Button asChild variant="outline" className="rounded-xl">
                  <Link href="/student/properties">Browse homes</Link>
                </Button>
              }
            />
          )}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Saved homes" action={{ href: "/student/bookmarks", label: "Open" }} bodyClassName="p-5">
            <div className="flex items-center gap-4">
              <span className="rounded-xl bg-red-50 p-3 text-red-500">
                <Heart aria-hidden className="h-5 w-5 fill-current" />
              </span>
              <div>
                <p className="text-2xl font-bold">{savedCount}</p>
                <p className="text-sm text-muted-foreground">{savedCount === 1 ? "home on your shortlist" : "homes on your shortlist"}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Shortcuts">
            <ul className="divide-y">
              {[
                { href: "/student/messages", icon: MessageSquare, label: "Messages" },
                { href: "/student/leases", icon: PenLine, label: "Lease agreements" },
                { href: "/student/account", icon: KeyRound, label: profile?.phone ? "Account settings" : "Add your phone number" },
              ].map(({ href, icon: Icon, label }) => (
                <li key={href}>
                  <Link href={href} className="group flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors hover:bg-accent/50">
                    <Icon aria-hidden className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{label}</span>
                    <ArrowRight aria-hidden className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
