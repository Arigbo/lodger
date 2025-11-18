

"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/logo";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserById } from "@/lib/data";
import { getPropertiesByTenant } from "@/lib/data";

const navLinks = [
  { href: "/student/properties", label: "All Properties" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/landlord", label: "For Landlords" },
];

// Mock current user - replace with real auth
const useUser = () => {
  // To test a landlord, use 'user-1'. 
  // To test a student tenant, use 'user-3'.
  // To test a student non-tenant, use 'user-2'.
  // Set user to null to simulate logged-out state on landing page
  const user = getUserById('user-3'); 
  const rentedProperties = user ? getPropertiesByTenant(user.id) : [];
  const isTenant = user?.role === 'student' && rentedProperties.length > 0;
  
  return { user, isTenant, isAuthenticated: !!user };
}


export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isTenant, isAuthenticated } = useUser();
  const userAvatar = user?.avatarUrl;

  const getDashboardLink = () => {
      if (!user) return "/auth/login";
      if (user.role === 'landlord') return "/landlord";
      return "/student";
  }

  const getAccountLink = () => {
      if (!user) return "/auth/login";
      if (user.role === 'landlord') return "/landlord/account";
      return "/student/account";
  }


  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link href="/" onClick={() => setIsMenuOpen(false)}>
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={userAvatar} alt="User Avatar" />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href={getDashboardLink()}>Dashboard</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href={getAccountLink()}>Profile</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>
      {isMenuOpen && (
        <div
          className={cn(
            "md:hidden",
            "animate-in fade-in-20 slide-in-from-top-2"
          )}
        >
          <div className="flex flex-col items-center gap-6 bg-card p-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-lg font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 flex w-full flex-col gap-2">
              {isAuthenticated ? (
                 <>
                  <Button variant="ghost" asChild className="w-full"><Link href={getDashboardLink()}>Dashboard</Link></Button>
                  <Button variant="ghost" asChild className="w-full">
                    <Link href={getAccountLink()}>My Account</Link>
                  </Button>
                  <Button variant="outline" className="w-full">Log out</Button>
                 </>
              ) : (
                <>
                <Button variant="ghost" asChild className="w-full">
                    <Link href="/auth/login">Sign In</Link>
                </Button>
                <Button asChild className="w-full">
                    <Link href="/auth/signup">Sign Up</Link>
                </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
