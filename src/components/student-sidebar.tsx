
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Building2, UserCog, MessageSquare, Search, FileText } from "lucide-react";
import { Badge } from "./ui/badge";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Property } from "@/lib/definitions";
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
    // You might want to return null or a skeleton loader while user is loading
    return null; 
  }

  return (
    <nav className="sticky top-24 flex flex-col gap-2">
      {navLinks.map((link) => {
        if (!link) return null;
        
        // Special handling for dynamic routes
        const isActive = (pathname === link.href) || (link.href === '/student/properties' && pathname.startsWith('/student/properties/'));
        
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
