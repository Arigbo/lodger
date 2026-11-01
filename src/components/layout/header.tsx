"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, LogOut, Menu, User, X } from "lucide-react";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Logo from "@/components/layout/logo";
import { LogoutModal } from "@/components/layout/logout-modal";
import { NotificationsMenu } from "@/components/notifications/notifications-menu";
import { useAuth, useUser } from "@/firebase/provider";
import { marketingNav } from "@/config/navigation";
import { cn } from "@/lib/utils";

type HeaderProps = {
  /** `marketing` shows public navigation; `app` is the compact dashboard bar. */
  variant?: "marketing" | "app";
  /** Called by the mobile menu button in the `app` variant. */
  onToggleNav?: () => void;
};


export default function Header({ variant = "marketing", onToggleNav }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user, profile, role, isUserLoading } = useUser();
  const dashboardHref = role === "landlord" ? "/landlord" : "/student";

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on navigation (state adjusted during render).
  const [menuPathname, setMenuPathname] = useState(pathname);
  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    setMobileMenuOpen(false);
  }

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/auth/login");
  };

  const isMarketing = variant === "marketing";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/85 backdrop-blur-xl transition-shadow duration-300",
        isScrolled ? "border-border/60 shadow-sm" : "border-transparent",
      )}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          {!isMarketing && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onToggleNav}
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <Link href="/" aria-label="Lodger home" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Logo />
          </Link>
        </div>

        {isMarketing && (
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {marketingNav.map((link) => {
              const active = !("external" in link) && pathname.startsWith(link.href.split("?")[0]);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  {...("external" in link ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {isMarketing && (
                <Button asChild size="sm" variant="outline" className="hidden rounded-full sm:inline-flex">
                  <Link href={dashboardHref}>
                    <LayoutDashboard className="mr-1.5 h-4 w-4" /> Dashboard
                  </Link>
                </Button>
              )}
              <NotificationsMenu userId={user.uid} role={role} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 w-10 rounded-full p-0" aria-label="Account menu">
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={profile?.profileImageUrl || user.photoURL || ""}
                        alt=""
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                        {(profile?.name || user.displayName || user.email || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 rounded-2xl p-2">
                  <DropdownMenuLabel className="px-3 py-2">
                    <p className="truncate text-sm font-semibold">{profile?.name || user.displayName}</p>
                    <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                    <Link href={dashboardHref}>
                      <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                    <Link href={`${dashboardHref}/account`}>
                      <User className="mr-2 h-4 w-4" /> My account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => setShowLogoutModal(true)}
                    className="cursor-pointer rounded-lg text-destructive focus:bg-destructive/10 focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            !isUserLoading && (
              <div className="hidden items-center gap-2 md:flex">
                <Button asChild variant="ghost" size="sm" className="rounded-full">
                  <Link href="/auth/login">Sign in</Link>
                </Button>
                <Button asChild size="sm" className="rounded-full px-5 shadow-md shadow-primary/20">
                  <Link href="/auth/signup">Get started</Link>
                </Button>
              </div>
            )
          )}

          {isMarketing && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          )}
        </div>
      </div>

      {isMarketing && mobileMenuOpen && (
        <div id="mobile-menu" className="border-t bg-background px-4 pb-6 pt-2 shadow-lg md:hidden animate-in slide-in-from-top-2">
          <nav aria-label="Mobile" className="flex flex-col">
            {marketingNav.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                {...("external" in link ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="rounded-xl px-3 py-3 text-base font-medium hover:bg-muted"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 grid gap-2 border-t pt-4">
            {user ? (
              <Button asChild className="rounded-xl">
                <Link href={dashboardHref}>Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline" className="rounded-xl">
                  <Link href="/auth/login">Sign in</Link>
                </Button>
                <Button asChild className="rounded-xl">
                  <Link href="/auth/signup">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <LogoutModal open={showLogoutModal} onOpenChange={setShowLogoutModal} onConfirm={handleLogout} />
    </header>
  );
}
