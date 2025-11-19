
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Building2, Users, Bell, Wrench, UserCog, DollarSign, MessageSquare, FileText } from "lucide-react";
import { Badge } from "./ui/badge";

const landlordNavLinks = [
  { href: "/landlord", label: "Overview", icon: LayoutDashboard },
  { href: "/landlord/properties", label: "Properties", icon: Building2 },
  { href: "/landlord/tenants", label: "Tenants", icon: Users },
  { href: "/landlord/messages", label: "Messages", icon: MessageSquare },
  { href: "/landlord/transactions", label: "Transactions", icon: DollarSign },
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
    <>
      {landlordNavLinks.map((link) => {
        const isActive = pathname.startsWith(link.href) && (pathname === link.href || pathname.startsWith(link.href + '/'));
        
        return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                isActive && "bg-muted text-primary"
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
              {link.badge && (
                <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">{link.badge}</Badge>
              )}
            </Link>
        )
      })}
    </>
  );
}
