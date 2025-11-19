
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Building2, UserCog, MessageSquare, Search, FileText } from "lucide-react";
import { Badge } from "./ui/badge";
import { useUser } from "@/firebase";
import React from 'react';


const navLinks = [
    { href: "/student", label: "Dashboard", icon: LayoutDashboard },
    { href: "/student/tenancy", label: "My Tenancy", icon: Building2 },
    { href: "/student/properties", label: "Find a Property", icon: Search },
    { href: "/student/messages", label: "Messages", icon: MessageSquare },
    { href: "/student/leases", label: "Lease Agreements", icon: FileText },
    { href: "/student/account", label: "Account", icon: UserCog },
];

export default function StudentSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  
  if (!user) {
    return null; 
  }

  return (
    <>
      {navLinks.map((link) => {
        if (!link) return null;
        
        const isActive = (pathname === link.href) || 
                         (pathname.startsWith(link.href) && link.href !== '/student');
        
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
