"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { ShellSkeleton } from "@/components/dashboard/skeletons";
import { useUser } from "@/firebase";
import { useLocalStorageFlag } from "@/hooks/use-local-storage-flag";
import { getDashboardPageTitle, type DashboardRole } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { AppSidebar } from "./sidebar";
import { MobileTabbar } from "./mobile-tabbar";
import { Topbar } from "./topbar";

type DashboardShellProps = { role: DashboardRole; children: ReactNode };

/**
 * Authenticated app frame shared by the student and landlord areas:
 * role guard, collapsible sidebar, top bar with ⌘K search, mobile tab bar.
 */
export function DashboardShell({ role, children }: DashboardShellProps) {
  const { user, profile, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useLocalStorageFlag("lodger:sidebar-collapsed", false);

  const isAuthorized = !!user && profile?.role === role;

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
    } else if (profile && profile.role !== role) {
      router.replace(profile.role === "landlord" ? "/landlord" : profile.role === "student" ? "/student" : "/");
    }
  }, [isUserLoading, user, profile, role, router, pathname]);

  if (isUserLoading || !isAuthorized) return <ShellSkeleton />;

  return (
    <div className="min-h-screen bg-muted/40">
      <title>{`${getDashboardPageTitle(role, pathname)} · ${siteConfig.name}`}</title>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <AppSidebar role={role} collapsed={collapsed} onToggleCollapsed={() => setCollapsed(!collapsed)} />

      <div className={cn("transition-[padding] duration-200 print:pl-0", collapsed ? "md:pl-[76px]" : "md:pl-[260px]")}>
        <Topbar role={role} />
        <main id="main-content" className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 md:pb-12 lg:px-8 lg:pt-8">
          <SetupBanner role={role} />
          <div key={pathname} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
            {children}
          </div>
        </main>
      </div>

      <MobileTabbar role={role} />
    </div>
  );
}

/** Nudges users to finish the one setup step that blocks their main flow. */
function SetupBanner({ role }: { role: DashboardRole }) {
  const { profile } = useUser();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  if (!profile || dismissed) return null;

  const banner =
    role === "student" && !profile.phone
      ? {
          title: "Add your phone number",
          body: "Landlords respond faster when they can reach you directly.",
          href: "/student/account",
          cta: "Add phone",
        }
      : role === "landlord" &&
          pathname !== "/landlord" &&
          !profile.stripeBannerDismissed &&
          (!profile.stripeAccountId || !profile.stripeDetailsSubmitted)
        ? {
            title: "Set up payouts",
            body: "Connect Stripe so tenants can pay rent online straight to your bank.",
            href: "/landlord/account",
            cta: "Set up",
          }
        : null;

  if (!banner || pathname === banner.href) return null;

  return (
    <div role="status" className="mb-6 flex items-center gap-3 rounded-2xl border bg-card p-3 pr-2 shadow-sm sm:p-4 print:hidden">
      <span className="hidden rounded-xl bg-primary/10 p-2 text-primary sm:block">
        <Sparkles aria-hidden className="h-5 w-5" />
      </span>
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-semibold">{banner.title}.</span>{" "}
        <span className="text-muted-foreground">{banner.body}</span>
      </p>
      <Link
        href={banner.href}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {banner.cta} <ArrowRight aria-hidden className="h-3.5 w-3.5" />
      </Link>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent"
        aria-label="Dismiss"
      >
        <X aria-hidden className="h-4 w-4" />
      </button>
    </div>
  );
}
