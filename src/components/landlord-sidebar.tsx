

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Building2, Users, Bell, Wrench, UserCog, DollarSign, MessageSquare } from "lucide-react";
import { Badge } from "./ui/badge";
import { getUserById } from "@/lib/data";

// Mock current user
const useUser = () => {
    // To test landlord view: 'user-1'
    // To test tenant view: 'user-3'
    const user = getUserById('user-1');
    return { user };
}

const landlordNavLinks = [
  { href: "/landlord", label: "Overview", icon: LayoutDashboard },
  { href: "/landlord/properties", label: "Properties", icon: Building2 },
  { href: "/landlord/tenants", label: "Tenants", icon: Users },
  { href: "/landlord/messages", label: "Messages", icon: MessageSquare, badge: 1 },
  { href: "/landlord/transactions", label: "Transactions", icon: DollarSign },
  {
    href: "/landlord/requests",
    label: "Rental Requests",
    icon: Bell,
    badge: 3,
  },
  { href: "/landlord/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/landlord/account", label: "Account", icon: UserCog },
];

const tenantNavLinks = [
    { href: "/landlord/tenants/[id]", label: "My Tenancy", icon: LayoutDashboard },
    { href: "/landlord/maintenance", label: "Maintenance", icon: Wrench },
    { href: "/landlord/messages", label: "Messages", icon: MessageSquare },
    { href: "/landlord/account", label: "Account", icon: UserCog },
]

export default function LandlordSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  
  if (!user) return null;

  const isLandlord = user.role === 'landlord';
  const navLinks = isLandlord ? landlordNavLinks : tenantNavLinks;

  const getHref = (href: string) => {
    if (href.includes('[id]')) {
        return href.replace('[id]', user.id);
    }
    return href;
  }

  return (
    <nav className="sticky top-24 flex flex-col gap-2">
      {navLinks.map((link) => (
        <Button
          key={link.href}
          asChild
          variant={pathname === getHref(link.href) ? "secondary" : "ghost"}
          className="justify-start"
        >
          <Link href={getHref(link.href)}>
            <link.icon className="mr-2 h-4 w-4" />
            {link.label}
            {link.badge && (
              <Badge className="ml-auto">{link.badge}</Badge>
            )}
          </Link>
        </Button>
      ))}
    </nav>
  );
}
