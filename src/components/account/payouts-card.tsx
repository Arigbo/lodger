"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, BadgeCheck, Clock, ExternalLink, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiPost } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import type { UserProfile } from "@/types";

type Status = "incomplete" | "pending" | "active";
type StatusResult = { status: Status | "error"; message: string };

/** Stripe Connect onboarding and status for landlords. */
export function PayoutsCard({ profile }: { profile: UserProfile }) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<{ accountId: string; value: StatusResult } | null>(null);
  const [busy, setBusy] = useState<"connect" | "dashboard" | null>(null);
  const accountId = profile.stripeAccountId;

  // Returning from Stripe onboarding (the server already saved the account ID).
  const returned = searchParams.get("stripe_connect_success");
  useEffect(() => {
    if (!returned) return;
    toast({ title: "Welcome back from Stripe", description: "We're checking your payout status now." });
    router.replace("/landlord/account#payouts");
  }, [returned, router, toast]);

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    apiPost<StatusResult>("/api/stripe/account-status", {})
      .then((value) => !cancelled && setResult({ accountId, value }))
      .catch((error) => !cancelled && setResult({ accountId, value: { status: "error", message: getErrorMessage(error) } }));
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const open = async (kind: "connect" | "dashboard") => {
    setBusy(kind);
    try {
      const { url } = await apiPost<{ url: string }>(`/api/stripe/${kind}`, {});
      if (kind === "connect") window.location.href = url;
      else window.open(url, "_blank", "noopener");
    } catch (error) {
      toast({ variant: "destructive", title: "Stripe is unavailable", description: getErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const status: StatusResult | null = !accountId ? { status: "incomplete", message: "" } : result?.accountId === accountId ? result.value : null;

  if (!status) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking your Stripe account…
      </p>
    );
  }

  if (status.status === "active") {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-900">
          <BadgeCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-medium">Card payments are on</p>
            <p className="text-sm text-emerald-900/80">Rent paid by card goes straight to your bank account.</p>
          </div>
        </div>
        <Button variant="outline" className="rounded-lg" onClick={() => open("dashboard")} disabled={busy !== null}>
          {busy === "dashboard" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-1.5 h-4 w-4" />}
          Open Stripe dashboard
        </Button>
      </div>
    );
  }

  if (status.status === "error") {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-900">
        <AlertCircle aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-medium">We couldn&apos;t reach Stripe</p>
          <p className="text-sm text-red-900/80">{status.message}</p>
        </div>
      </div>
    );
  }

  if (accountId) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-amber-900">
          <Clock aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium">{status.status === "pending" ? "Stripe is verifying your details" : "Finish setting up Stripe"}</p>
            <p className="text-sm text-amber-900/80">{status.message}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-lg" onClick={() => open("connect")} disabled={busy !== null}>
            {busy === "connect" && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Continue setup
          </Button>
          <Button variant="outline" className="rounded-lg" onClick={() => open("dashboard")} disabled={busy !== null}>
            Open Stripe dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Wallet aria-hidden className="h-5 w-5" />
        </span>
        <div className="text-sm text-muted-foreground">
          <p>Let tenants pay rent by card, paid straight into your bank account. Setup takes about 5 minutes on Stripe.</p>
          <p className="mt-1">Without it, tenants can still pay by bank transfer, which you confirm in Lodger.</p>
        </div>
      </div>
      <Button className="rounded-lg" onClick={() => open("connect")} disabled={busy !== null}>
        {busy === "connect" && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Connect with Stripe
      </Button>
    </div>
  );
}
