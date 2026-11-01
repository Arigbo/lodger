"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight, Check, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard";
import { cn, formatPrice } from "@/lib/utils";
import type { LeaseAgreement, Property, UserProfile } from "@/types";

export type LeaseListItem = {
  lease: LeaseAgreement;
  /** The other party: the tenant for landlords, the landlord for students. */
  person: UserProfile | null;
  property: Property | null;
};

type Viewer = "student" | "landlord";

/** What the viewer should do next with this lease, if anything. */
function nextAction(lease: LeaseAgreement, viewer: Viewer): string | null {
  if (lease.status !== "pending") return null;
  if (viewer === "student") {
    if (!lease.tenantSigned) return "Review & sign";
    if (!lease.paymentMethod) return "Pay first rent";
    if (lease.paymentMethod === "offline" && !lease.paymentConfirmed) return null;
  } else {
    if (!lease.landlordSigned) return "Sign lease";
    if (lease.paymentMethod === "offline" && !lease.paymentConfirmed) return "Confirm payment";
  }
  return null;
}

function waitingOn(lease: LeaseAgreement, viewer: Viewer): string | null {
  if (lease.status !== "pending") return null;
  if (!lease.tenantSigned) return viewer === "student" ? null : "Waiting for tenant to sign";
  if (!lease.landlordSigned) return viewer === "landlord" ? null : "Waiting for landlord to sign";
  if (lease.paymentMethod === "offline" && !lease.paymentConfirmed)
    return viewer === "student" ? "Landlord is confirming your transfer" : null;
  if (!lease.paymentMethod) return viewer === "landlord" ? "Waiting for first payment" : null;
  return null;
}

function Signatures({ lease }: { lease: LeaseAgreement }) {
  return (
    <span className="flex items-center gap-3 text-xs text-muted-foreground">
      {[
        ["Landlord", lease.landlordSigned],
        ["Tenant", lease.tenantSigned],
      ].map(([who, signed]) => (
        <span key={who as string} className="inline-flex items-center gap-1">
          <span
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded-full",
              signed ? "bg-emerald-500 text-white" : "border border-dashed border-muted-foreground/50",
            )}
          >
            {signed && <Check aria-hidden className="h-3 w-3" />}
          </span>
          {who as string}
          <span className="sr-only">{signed ? " signed" : " not signed"}</span>
        </span>
      ))}
    </span>
  );
}

const fmt = (iso?: string) => (iso ? format(new Date(iso), "d MMM yyyy") : "—");

export function LeaseList({ items, viewer }: { items: LeaseListItem[]; viewer: Viewer }) {
  const base = `/${viewer}/leases`;

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* Desktop table */}
      <table className="hidden w-full text-sm md:table">
        <thead className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-5 py-3 font-medium">Property</th>
            <th className="px-5 py-3 font-medium">{viewer === "landlord" ? "Tenant" : "Landlord"}</th>
            <th className="px-5 py-3 font-medium">Term</th>
            <th className="px-5 py-3 font-medium">Signatures</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map(({ lease, person, property }) => {
            const action = nextAction(lease, viewer);
            const waiting = waitingOn(lease, viewer);
            return (
              <tr key={lease.id} className="transition-colors hover:bg-accent/40">
                <td className="px-5 py-4">
                  <p className="font-medium">{property?.title ?? "Unknown property"}</p>
                  {property && <p className="text-xs text-muted-foreground">{formatPrice(property.price, property.currency)}/mo</p>}
                </td>
                <td className="px-5 py-4">
                  <span className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={person?.profileImageUrl} alt="" />
                      <AvatarFallback className="text-xs">{person?.name?.[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                    {person?.name ?? "—"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                  {fmt(lease.startDate)} – {fmt(lease.endDate)}
                </td>
                <td className="px-5 py-4">
                  <Signatures lease={lease} />
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={lease.status} />
                  {waiting && <p className="mt-1 text-xs text-muted-foreground">{waiting}</p>}
                </td>
                <td className="px-5 py-4 text-right">
                  <Button asChild size="sm" variant={action ? "default" : "ghost"} className="rounded-lg">
                    <Link href={`${base}/${lease.id}`}>
                      {action ?? "View"} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile cards */}
      <ul className="divide-y md:hidden">
        {items.map(({ lease, person, property }) => {
          const action = nextAction(lease, viewer);
          const waiting = waitingOn(lease, viewer);
          return (
            <li key={lease.id}>
              <Link href={`${base}/${lease.id}`} className="block space-y-3 p-4 active:bg-accent/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="rounded-xl bg-primary/10 p-2 text-primary">
                      <FileText aria-hidden className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{property?.title ?? "Unknown property"}</p>
                      <p className="text-xs text-muted-foreground">
                        {person?.name ?? "—"} · {fmt(lease.startDate)} – {fmt(lease.endDate)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={lease.status} />
                </div>
                <div className="flex items-center justify-between">
                  <Signatures lease={lease} />
                  {action ? (
                    <span className="text-sm font-semibold text-primary">{action} →</span>
                  ) : (
                    waiting && <span className="text-xs text-muted-foreground">{waiting}</span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
