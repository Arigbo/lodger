"use client";

import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";

type NavLinkProps = {
  item: NavItem;
  active: boolean;
  count?: number;
  collapsed?: boolean;
  onNavigate?: () => void;
};

/** A single sidebar destination with active indicator and optional count. */
export function NavLink({ item, active, count, collapsed, onNavigate }: NavLinkProps) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      {active && <span aria-hidden className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary" />}
      <Icon aria-hidden className={cn("h-[18px] w-[18px] shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!!count && (
        <span
          className={cn(
            "flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground",
            collapsed && "absolute right-1.5 top-1 h-4 min-w-4 px-1 text-[10px]",
          )}
        >
          {count > 99 ? "99+" : count}
          <span className="sr-only"> new</span>
        </span>
      )}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}
