"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { dashboardNav, isNavItemActive, mobileTabs, type DashboardRole } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./sidebar";

/** Thumb-friendly bottom navigation for phones, with a "More" sheet for everything else. */
export function MobileTabbar({ role }: { role: DashboardRole }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const tabs = mobileTabs[role].map((href) => dashboardNav[role].find((item) => item.href === href)!);
  const onMainTab = tabs.some((item) => isNavItemActive(item, pathname));

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden print:hidden"
      >
        <ul className="grid grid-cols-5">
          {tabs.map((item) => {
            const active = isNavItemActive(item, pathname);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span className={cn("rounded-full px-4 py-1 transition-colors", active && "bg-primary/10")}>
                    <Icon aria-hidden className="h-5 w-5" />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                "flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium",
                !onMainTab ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span className={cn("rounded-full px-4 py-1", !onMainTab && "bg-primary/10")}>
                <Menu aria-hidden className="h-5 w-5" />
              </span>
              More
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          <SheetHeader className="mb-4 text-left">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription className="sr-only">All dashboard pages</SheetDescription>
          </SheetHeader>
          <SidebarNav role={role} onNavigate={() => setMoreOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
