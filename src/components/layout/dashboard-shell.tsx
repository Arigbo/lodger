"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import Header from "@/components/layout/header";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import LogoLoader from "@/components/layout/logo-loader";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUser } from "@/firebase";
import { getDashboardPageTitle, type DashboardRole } from "@/config/navigation";
import { siteConfig } from "@/config/site";

type DashboardShellProps = {
  role: DashboardRole;
  children: ReactNode;
};

/**
 * Authenticated application shell shared by the student and landlord areas:
 * role guard, header, responsive sidebar and contextual setup banners.
 */
export function DashboardShell({ role, children }: DashboardShellProps) {
  const { user, profile, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isAuthorized = !!user && profile?.role === role;

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
    } else if (profile && profile.role !== role) {
      // Signed in with the other role: send them to their own dashboard.
      router.replace(profile.role === "landlord" ? "/landlord" : profile.role === "student" ? "/student" : "/");
    }
  }, [isUserLoading, user, profile, role, router, pathname]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setMobileNavOpen(false), [pathname]);

  if (isUserLoading || !isAuthorized) return <LogoLoader />;

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <title>{`${getDashboardPageTitle(role, pathname)} | ${siteConfig.name}`}</title>
      <Header variant="app" onToggleNav={() => setMobileNavOpen((open) => !open)} />

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden border-r bg-background/60 backdrop-blur md:fixed md:bottom-0 md:top-16 md:flex md:w-64 md:flex-col lg:w-72">
          <div className="flex-1 overflow-y-auto pt-4">
            <SidebarNav role={role} />
          </div>
        </aside>

        {/* Mobile sidebar */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="border-b p-6 text-left">
              <SheetTitle className="text-base font-bold">Menu</SheetTitle>
              <SheetDescription className="sr-only">Dashboard navigation</SheetDescription>
            </SheetHeader>
            <div className="py-4">
              <SidebarNav role={role} onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <main id="main-content" className="flex-1 py-6 md:pl-64 lg:py-10 lg:pl-72">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SetupBanner role={role} />
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

/** Nudges users to finish the one setup step that blocks their main flow. */
function SetupBanner({ role }: { role: DashboardRole }) {
  const { profile } = useUser();
  const [dismissed, setDismissed] = useState(false);
  if (!profile || dismissed) return null;

  const banner =
    role === "student" && !profile.phone
      ? {
          title: "Add your phone number",
          body: "Landlords respond faster when they can reach you directly.",
          href: "/student/account",
          cta: "Update profile",
        }
      : role === "landlord" && (!profile.stripeAccountId || !profile.stripeDetailsSubmitted)
        ? {
            title: "Finish your payout setup",
            body: "Connect Stripe so tenants can pay rent online straight to your account.",
            href: "/landlord/account",
            cta: "Complete setup",
          }
        : null;

  if (!banner) return null;

  return (
    <div
      role="status"
      className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-50 p-4 text-amber-900 sm:flex-row sm:items-center"
    >
      <AlertTriangle aria-hidden className="h-5 w-5 shrink-0 text-amber-600" />
      <div className="flex-1 text-sm">
        <p className="font-semibold">{banner.title}</p>
        <p className="text-amber-800/90">{banner.body}</p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={banner.href}
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
        >
          {banner.cta} <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-full p-1.5 transition-colors hover:bg-amber-100"
          aria-label="Dismiss"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
