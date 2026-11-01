import { format } from "date-fns";
import { CheckCircle2, Circle } from "lucide-react";
import { JourneyStepper } from "@/components/dashboard";
import { cn, formatPrice } from "@/lib/utils";
import type { LeaseAgreement, Property, UserProfile } from "@/types";

const fmt = (iso?: string) => (iso ? format(new Date(iso), "d MMMM yyyy") : "—");

/** Where a lease is in its lifecycle: 0 sent, 1 signed, 2 paid, 3 active. */
export function leaseStage(lease: LeaseAgreement): number {
  if (lease.status === "active" || lease.status === "terminating" || lease.status === "expired") return 4;
  if (lease.paymentMethod === "offline" && !lease.paymentConfirmed) return 2;
  if (lease.tenantSigned && lease.landlordSigned) return 2;
  if (lease.tenantSigned || lease.landlordSigned) return 1;
  return 0;
}

export function LeaseProgress({ lease, className }: { lease: LeaseAgreement; className?: string }) {
  return (
    <JourneyStepper
      className={className}
      steps={["Lease sent", "Both signed", "First rent", "Active"]}
      current={Math.min(leaseStage(lease) === 2 && lease.paymentMethod === "offline" ? 2 : leaseStage(lease), 4)}
    />
  );
}

type LeaseDocumentProps = {
  lease: LeaseAgreement;
  property: Property | null;
  landlord: UserProfile | null;
  tenant: UserProfile | null;
};

/** The agreement rendered as a printable document. */
export function LeaseDocument({ lease, property, landlord, tenant }: LeaseDocumentProps) {
  const parties = [
    { role: "Landlord", person: landlord, signed: lease.landlordSigned },
    { role: "Tenant", person: tenant, signed: lease.tenantSigned },
  ];

  return (
    <article id="lease-document" className="overflow-hidden rounded-2xl border bg-card shadow-sm print:border-0 print:shadow-none">
      <header className="border-b bg-muted/30 px-6 py-6 sm:px-10 print:bg-transparent">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Residential tenancy agreement</p>
        <h2 className="mt-1 font-headline text-xl font-bold sm:text-2xl">{property?.title ?? "Property"}</h2>
        <p className="text-sm text-muted-foreground">
          {[property?.location?.address, property?.location?.city, property?.location?.state].filter(Boolean).join(", ")}
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          {[
            ["Starts", fmt(lease.startDate)],
            ["Ends", fmt(lease.endDate)],
            ["Monthly rent", property ? formatPrice(property.price, property.currency) : "—"],
            ["Reference", lease.id.slice(0, 8).toUpperCase()],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="max-h-[70vh] overflow-y-auto px-6 py-8 sm:px-10 print:max-h-none print:overflow-visible">
        <div className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-foreground/90">{lease.leaseText}</div>
      </div>

      <footer className="grid gap-4 border-t px-6 py-6 sm:grid-cols-2 sm:px-10">
        {parties.map(({ role, person, signed }) => (
          <div key={role} className={cn("rounded-xl border p-4", signed ? "border-emerald-200 bg-emerald-50/60" : "border-dashed")}>
            <p className="text-xs font-medium text-muted-foreground">{role}</p>
            <p className={cn("mt-1 text-lg", signed ? "font-serif italic" : "text-muted-foreground")}>
              {signed ? person?.legalName || person?.name || role : "Not signed yet"}
            </p>
            <p className={cn("mt-2 flex items-center gap-1.5 text-xs", signed ? "text-emerald-700" : "text-muted-foreground")}>
              {signed ? <CheckCircle2 aria-hidden className="h-3.5 w-3.5" /> : <Circle aria-hidden className="h-3.5 w-3.5" />}
              {signed ? "Signed electronically" : "Awaiting signature"}
            </p>
          </div>
        ))}
      </footer>
    </article>
  );
}

/** Downloads the agreement text as a .txt file. */
export function downloadLeaseText(lease: LeaseAgreement, property: Property | null) {
  const blob = new Blob([lease.leaseText], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Lease-${(property?.title ?? "agreement").replace(/[^\w-]+/g, "_")}-${format(new Date(), "yyyy-MM-dd")}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}
