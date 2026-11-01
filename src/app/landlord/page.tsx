"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Inbox,
  PenLine,
  Percent,
  Plus,
  UserPlus,
  Wallet,
  Wrench,
} from "lucide-react";
import { collection, query, where } from "firebase/firestore";
import { EmptyState, PageHeader, PageSkeleton, SectionCard, StatCard, StatGrid, StatusBadge } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { useAsyncResult } from "@/hooks/use-async-result";
import { fetchDocsByIds } from "@/lib/firestore-batch";
import { formatPrice } from "@/lib/utils";
import type { LeaseAgreement, MaintenanceRequest, Property, RentalApplication, UserProfile } from "@/types";

type InboxItem = {
  id: string;
  icon: typeof Inbox;
  tone: string;
  title: string;
  detail: string;
  when?: string;
  href: string;
  cta: string;
  priority: number;
};

function useLandlordCollection<T>(name: string, ...filters: [string, "==", unknown][]) {
  const { user } = useUser();
  const firestore = useFirestore();
  const key = JSON.stringify(filters);
  const q = useMemoFirebase(
    () => (user ? query(collection(firestore, name), where("landlordId", "==", user.uid), ...filters.map(([f, op, v]) => where(f, op, v))) : null),
    [user, firestore, name, key], // `key` stands in for `filters`
  );
  return useCollection<T>(q);
}

export default function LandlordHomePage() {
  const { profile } = useUser();
  const firestore = useFirestore();

  const { data: properties, isLoading: propertiesLoading } = useLandlordCollection<Property>("properties");
  const { data: requests } = useLandlordCollection<RentalApplication>("rentalApplications", ["status", "==", "pending"]);
  const { data: leases } = useLandlordCollection<LeaseAgreement>("leaseAgreements", ["status", "==", "pending"]);
  const { data: repairs } = useLandlordCollection<MaintenanceRequest>("maintenanceRequests", ["status", "==", "Pending"]);

  const tenantIds = [...(requests ?? []).map((r) => r.tenantId), ...(leases ?? []).map((l) => l.tenantId)];
  const idsKey = [...new Set(tenantIds)].sort().join(",");
  const { data: people } = useAsyncResult(idsKey || null, (key) => fetchDocsByIds<UserProfile>(firestore, "users", key.split(",")), {
    keepPrevious: true,
  });

  if (propertiesLoading) return <PageSkeleton variant="overview" />;

  const props = properties ?? [];
  const byId = new Map(props.map((p) => [p.id, p]));
  const occupied = props.filter((p) => p.status === "occupied");
  const occupancy = props.length ? Math.round((occupied.length / props.length) * 100) : 0;
  const currency = props[0]?.currency || profile?.currency || "USD";
  const rentRoll = occupied.filter((p) => p.currency === currency).reduce((sum, p) => sum + (p.price || 0), 0);
  const payoutsReady = !!profile?.stripeAccountId && !!profile?.stripeDetailsSubmitted;
  const name = (id: string) => people?.get(id)?.name ?? "A student";
  const title = (id: string) => byId.get(id)?.title ?? "your property";

  const inbox: InboxItem[] = [
    ...(leases ?? [])
      .filter((l) => l.paymentMethod === "offline" && !l.paymentConfirmed)
      .map((l) => ({
        id: `pay-${l.id}`,
        icon: Wallet,
        tone: "bg-emerald-50 text-emerald-700",
        title: `Confirm ${name(l.tenantId)}'s bank transfer`,
        detail: title(l.propertyId),
        href: "/landlord/requests",
        cta: "Confirm",
        priority: 0,
      })),
    ...(requests ?? []).map((r) => ({
      id: `req-${r.id}`,
      icon: UserPlus,
      tone: "bg-sky-50 text-sky-700",
      title: `${name(r.tenantId)} wants to rent`,
      detail: title(r.propertyId),
      when: r.applicationDate,
      href: "/landlord/requests",
      cta: "Review",
      priority: 1,
    })),
    ...(repairs ?? []).map((m) => ({
      id: `fix-${m.id}`,
      icon: Wrench,
      tone: m.priority === "High" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800",
      title: m.title,
      detail: `${title(m.propertyId)} · ${m.priority} priority`,
      when: m.requestDate,
      href: "/landlord/maintenance",
      cta: "Respond",
      priority: m.priority === "High" ? 0 : 2,
    })),
    ...(leases ?? [])
      .filter((l) => !l.landlordSigned)
      .map((l) => ({
        id: `sign-${l.id}`,
        icon: PenLine,
        tone: "bg-primary/10 text-primary",
        title: "Lease waiting for your signature",
        detail: `${name(l.tenantId)} · ${title(l.propertyId)}`,
        href: `/landlord/leases/${l.id}`,
        cta: "Sign",
        priority: 1,
      })),
  ].sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back${profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}`}
        description="Here's what needs your attention across your properties today."
        actions={
          <Button asChild className="rounded-xl sm:hidden">
            <Link href="/landlord/properties/new">
              <Plus className="mr-1.5 h-4 w-4" /> Add property
            </Link>
          </Button>
        }
      />

      <StatGrid>
        <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Occupancy</p>
            <Percent aria-hidden className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-1 text-2xl font-bold">{occupancy}%</p>
          <Progress value={occupancy} className="mt-3 h-1.5" aria-label={`${occupancy}% occupied`} />
          <p className="mt-2 text-xs text-muted-foreground">
            {occupied.length} of {props.length} homes let
          </p>
        </div>
        <StatCard label="Monthly rent roll" value={formatPrice(rentRoll, currency)} icon={Wallet} tone="success" hint="From occupied homes" />
        <StatCard label="New requests" value={requests?.length ?? 0} icon={Inbox} tone="info" href="/landlord/requests" hint="Waiting for a reply" />
        <StatCard label="Open repairs" value={repairs?.length ?? 0} icon={Wrench} tone="warning" href="/landlord/maintenance" hint="Reported by tenants" />
      </StatGrid>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="Action inbox"
          description={inbox.length ? `${inbox.length} item${inbox.length === 1 ? "" : "s"} need you` : "Nothing waiting on you"}
        >
          {inbox.length ? (
            <ul className="divide-y">
              {inbox.slice(0, 8).map((item) => (
                <li key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.tone}`}>
                    <item.icon aria-hidden className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.detail}
                      {item.when && ` · ${formatDistanceToNow(new Date(item.when), { addSuffix: true })}`}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="h-8 rounded-lg">
                    <Link href={item.href}>{item.cta}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              className="m-5 border-none bg-transparent py-10"
              icon={CheckCircle2}
              title="You're all caught up"
              description="New requests, payments to confirm and repairs will show up here."
            />
          )}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Payouts" bodyClassName="p-5">
            {payoutsReady ? (
              <div className="flex items-start gap-3">
                <BadgeCheck aria-hidden className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium">Online rent payments are on</p>
                  <p className="text-sm text-muted-foreground">Card payments go straight to your bank via Stripe.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Connect Stripe so tenants can pay rent by card, straight into your bank account.
                </p>
                <Button asChild size="sm" className="w-full rounded-lg">
                  <Link href="/landlord/account">Set up payouts</Link>
                </Button>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Your properties" action={props.length ? { href: "/landlord/properties", label: "Manage" } : undefined}>
            {props.length ? (
              <ul className="divide-y">
                {props.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <Link href={`/landlord/properties/${p.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-accent/50">
                      <Building2 aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.title}</span>
                        <span className="block text-xs text-muted-foreground">{formatPrice(p.price, p.currency)}/mo</span>
                      </span>
                      <StatusBadge status={p.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                className="m-5 border-none bg-transparent py-8"
                icon={Building2}
                title="No properties yet"
                action={
                  <Button asChild size="sm" className="rounded-lg">
                    <Link href="/landlord/properties/new">Add your first property</Link>
                  </Button>
                }
              />
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
