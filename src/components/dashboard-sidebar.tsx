"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Building2, Users, Bell, Wrench } from "lucide-react";
import { Badge } from "./ui/badge";

const landlordNavLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/properties", label: "Properties", icon: Building2 },
  { href: "/dashboard/tenants", label: "Tenants", icon: Users },
  {
    href: "/dashboard/requests",
    label: "Rental Requests",
    icon: Bell,
    badge: 3,
  },
  { href: "/dashboard/maintenance", label: "Maintenance", icon: Wrench },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-24 flex flex-col gap-2">
      {landlordNavLinks.map((link) => (
        <Button
          key={link.href}
          asChild
          variant={pathname === link.href ? "secondary" : "ghost"}
          className="justify-start"
        >
          <Link href={link.href}>
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


