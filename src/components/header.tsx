"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, User, Bell } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/logo";
import { cn } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser, useAuth } from "@/firebase/provider";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { LogoutModal } from "./logout-modal";
import { useNotifications } from "@/hooks/useNotifications";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/types";



export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, role } = useUser();
  const { notifications, unreadCount, markAsRead } = useNotifications(user?.uid || null);

  // Fetch user profile from Firestore
  const userDocRef = useMemoFirebase(() =>
    user ? doc(firestore, 'users', user.uid) : null,
    [user, firestore]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push("/auth/login");
    }
  };

  const isLanding = pathname === '/' || pathname === '/about';

  // Links for the Landing Page
  const landingLinks = [
    { href: "/student/properties", label: "See Listed Properties" },
    { href: "/about", label: "About Us" },
    { href: "/auth/signup?type=landlord", label: "List Property" }, // Direct to signup for new landlords
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link href="/" onClick={() => setIsMenuOpen(false)}>
            <Logo />
          </Link>
        </div>

        {/* LANDING PAGE HEADER CONTENT */}
        {isLanding ? (
          <>
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {landingLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
              {!user && (
                <div className="flex items-center gap-2 ml-4">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/auth/login">Sign In</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/auth/signup">Sign Up</Link>
                  </Button>
                </div>
              )}
              {user && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={role === "student" ? "/student" : "/landlord"}>Dashboard</Link>
                </Button>
              )}
            </nav>

            {/* Mobile Menu Toggle (Landing Only) */}
            <button
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </>
        ) : (
          /* AUTHENTICATED / APP PAGES HEADER CONTENT */
          <div className="flex items-center gap-4">
            {/* Notification Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="sr-only">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-600 border-2 border-background" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Notifications</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      You have {unreadCount} new messages
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className={cn(
                          "flex flex-col items-start gap-1 p-3 cursor-pointer",
                          !notification.read && "bg-muted/50"
                        )}
                        onClick={() => {
                          markAsRead(notification.id);
                          if (notification.link) router.push(notification.link);
                        }}
                      >
                        <div className="flex w-full justify-between items-center">
                          <span className="font-medium text-sm">{notification.title}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(notification.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Profile Dropdown */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full">
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                      <AvatarImage
                        src={userProfile?.profileImageUrl || user.photoURL || ""}
                        alt={userProfile?.name || user.displayName || "User"}
                        className="object-cover"
                      />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{userProfile?.name || user.displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={role === "student" ? "/student/account" : "/landlord/account"}>Account</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowLogoutModal(true)}>
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {!user && (
              /* Fallback if somehow on non-landing page without user (e.g. public property view) */
              <Button size="sm" asChild>
                <Link href="/auth/login">Sign In</Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Mobile Menu (Landing Page Only) */}
      {isLanding && isMenuOpen && (
        <div className="md:hidden border-t p-4 bg-background">
          <nav className="flex flex-col space-y-4">
            {landingLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="text-base font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t flex flex-col gap-2">
              {user ? (
                <Button asChild onClick={() => setIsMenuOpen(false)}>
                  <Link href="/student">Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button variant="outline" asChild onClick={() => setIsMenuOpen(false)}>
                    <Link href="/auth/login">Sign In</Link>
                  </Button>
                  <Button asChild onClick={() => setIsMenuOpen(false)}>
                    <Link href="/auth/signup">Sign Up</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}

      <LogoutModal
        open={showLogoutModal}
        onOpenChange={setShowLogoutModal}
        onConfirm={handleLogout}
      />
    </header>
  );
}
