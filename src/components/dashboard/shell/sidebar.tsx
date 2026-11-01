"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Logo, { LogoMark } from "@/components/layout/logo";
import { dashboardNavGroups, isNavItemActive, type DashboardRole } from "@/config/navigation";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { cn } from "@/lib/utils";
import { NavLink } from "./nav-link";
import { UserMenu } from "./user-menu";

type SidebarNavProps = { role: DashboardRole; collapsed?: boolean; onNavigate?: () => void };

/** Grouped navigation list (used by the desktop sidebar and the mobile "More" sheet). */
export function SidebarNav({ role, collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const badges = useNavBadges(role);

  return (
    <nav aria-label="Dashboard" className="space-y-6">
      {dashboardNavGroups[role].map((group) => (
        <div key={group.label}>
          {collapsed ? (
            <div aria-hidden className="mx-3 mb-2 border-t first:hidden" />
          ) : (
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{group.label}</p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <NavLink
                  item={item}
                  active={isNavItemActive(item, pathname)}
                  count={item.badge ? badges[item.badge] : undefined}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

type AppSidebarProps = { role: DashboardRole; collapsed: boolean; onToggleCollapsed: () => void };

export function AppSidebar({ role, collapsed, onToggleCollapsed }: AppSidebarProps) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r bg-card transition-[width] duration-200 md:flex print:hidden",
        collapsed ? "w-[76px]" : "w-[260px]",
      )}
    >
      <div className={cn("flex h-16 shrink-0 items-center border-b", collapsed ? "justify-center px-2" : "justify-between px-4")}>
        <Link href={`/${role}`} aria-label="Dashboard home" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {collapsed ? <LogoMark /> : <Logo />}
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Collapse sidebar"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <SidebarNav role={role} collapsed={collapsed} />
      </div>

      <div className="shrink-0 space-y-2 border-t p-3">
        {collapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Expand sidebar"
            className="flex h-9 w-full items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
        <UserMenu role={role} collapsed={collapsed} />
      </div>
    </aside>
  );
}
