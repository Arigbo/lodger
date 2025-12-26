
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Building2, Users, Bell, Wrench, UserCog, DollarSign, MessageSquare, FileText } from "lucide-react";
import { Badge } from "./ui/badge";

type NavLink = {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
};

const landlordNavLinks: NavLink[] = [
  { href: "/landlord", label: "Overview", icon: LayoutDashboard },
  { href: "/landlord/properties", label: "Properties", icon: Building2 },
  { href: "/landlord/tenants", label: "Tenants", icon: Users },
  { href: "/landlord/messages", label: "Messages", icon: MessageSquare },
  { href: "/landlord/transactions/", label: "Transactions", icon: DollarSign },
  {
    href: "/landlord/requests",
    label: "Rental Requests",
    icon: Bell,
  },
  { href: "/landlord/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/landlord/leases", label: "Lease Agreements", icon: FileText },
  { href: "/landlord/account", label: "Account", icon: UserCog },
];

export default function LandlordSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-1.5 p-2">
      {landlordNavLinks.map((link) => {
        const isActive = pathname.startsWith(link.href) && (pathname === link.href || pathname.startsWith(link.href + '/'));
        const Icon = link.icon;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300",
              isActive
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 translate-x-1"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:translate-x-1"
            )}
          >
            <Icon className={cn(
              "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
              isActive ? "text-primary-foreground" : "text-primary/70 group-hover:text-primary"
            )} />
            <span className="flex-1 tracking-tight">{link.label}</span>
            {link.badge && (
              <Badge className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full border-none p-0 text-[10px] font-bold",
                isActive ? "bg-white text-primary" : "bg-primary text-white"
              )}>
                {link.badge}
              </Badge>
            )}
          </Link>
        );
      })}
    </div>
  );
}


