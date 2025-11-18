
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Building2, UserCog, MessageSquare, Search } from "lucide-react";
import { Badge } from "./ui/badge";
import { getUserById, getPropertiesByTenant } from "@/lib/data";

// Mock current user
const useUser = () => {
    // To test landlord view: 'user-1'
    // To test tenant view: 'user-3'
    const user = getUserById('user-3');
    return { user };
}

const studentNavLinks = [
    { href: "/student", label: "Dashboard", icon: LayoutDashboard },
    { href: "/student/tenancy", label: "My Tenancy", icon: Building2 },
    { href: "/student/properties", label: "Find a Property", icon: Search },
    { href: "/landlord/messages", label: "Messages", icon: MessageSquare }, // Shared for now
    { href: "/landlord/account", label: "Account", icon: UserCog }, // Shared for now
]

export default function StudentSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  
  if (!user || user.role !== 'student') return null;

  const rentedProperties = getPropertiesByTenant(user.id);
  const isTenant = rentedProperties.length > 0;

  // Hide the "My Tenancy" link if the student is not a tenant
  const filteredNavLinks = isTenant ? studentNavLinks : studentNavLinks.filter(link => link.href !== '/student/tenancy');

  return (
    <nav className="sticky top-24 flex flex-col gap-2">
      {filteredNavLinks.map((link) => {
        const isActive = pathname === link.href;

        return (
            <Button
            key={link.href}
            asChild
            variant={isActive ? "secondary" : "ghost"}
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
        )
      })}
    </nav>
  );
}
