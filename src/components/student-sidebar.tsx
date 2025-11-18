
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
    { href: "/student/messages", label: "Messages", icon: MessageSquare },
    { href: "/student/account", label: "Account", icon: UserCog },
]

export default function StudentSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  
  if (!user || user.role !== 'student') return null;

  const rentedProperties = getPropertiesByTenant(user.id);
  const isTenant = rentedProperties.length > 0;

  // Show "My Tenancy" if the student is a tenant, otherwise don't.
  // The link for "My Tenancy" will point to their specific property page.
  const navLinks = studentNavLinks.map(link => {
      if (link.href === '/student/tenancy') {
          if (isTenant) {
              return { ...link, href: `/student/properties/${rentedProperties[0].id}` };
          }
          return null; // Hide the link if not a tenant
      }
      return link;
  }).filter(Boolean);


  return (
    <nav className="sticky top-24 flex flex-col gap-2">
      {navLinks.map((link) => {
        if (!link) return null;
        
        // Check for active link. For the tenancy link, it should be active on the property detail page.
        const isActive = pathname === link.href || (link.label === "My Tenancy" && pathname.startsWith('/student/properties/'));
        
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
