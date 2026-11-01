"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { NotificationsMenu } from "@/components/notifications/notifications-menu";
import { Button } from "@/components/ui/button";
import { useUser } from "@/firebase";
import { getDashboardPageTitle, primaryAction, type DashboardRole } from "@/config/navigation";
import { CommandMenu } from "./command-menu";
import { UserMenu } from "./user-menu";

/** Sticky top bar: breadcrumb, search/command palette, primary action, notifications. */
export function Topbar({ role }: { role: DashboardRole }) {
  const pathname = usePathname();
  const { user } = useUser();
  const title = getDashboardPageTitle(role, pathname);
  const isHome = pathname === `/${role}`;
  const action = primaryAction[role];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <Link href={`/${role}`} aria-label="Dashboard home" className="md:hidden">
        <LogoMark />
      </Link>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1.5 text-sm">
          <li className="hidden sm:block">
            <Link href={`/${role}`} className="text-muted-foreground transition-colors hover:text-foreground">
              {role === "landlord" ? "Landlord" : "Student"}
            </Link>
          </li>
          {!isHome && (
            <li aria-hidden className="hidden text-muted-foreground/50 sm:block">
              <ChevronRight className="h-4 w-4" />
            </li>
          )}
          <li className="truncate font-semibold text-foreground">{isHome ? <span className="sm:hidden">Home</span> : title}</li>
        </ol>
      </nav>

      <CommandMenu role={role} />

      {pathname !== action.href && (
        <Button asChild size="sm" className="hidden h-9 rounded-xl sm:inline-flex">
          <Link href={action.href}>
            <action.icon className="mr-1.5 h-4 w-4" /> {action.label}
          </Link>
        </Button>
      )}

      {user && <NotificationsMenu userId={user.uid} role={role} />}

      <div className="md:hidden">
        <UserMenu role={role} variant="avatar" />
      </div>
    </header>
  );
}
