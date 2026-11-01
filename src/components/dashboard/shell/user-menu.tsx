"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { ChevronsUpDown, ExternalLink, LifeBuoy, LogOut, MessageCircle, Settings } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogoutModal } from "@/components/layout/logout-modal";
import { useAuth, useUser } from "@/firebase/provider";
import type { DashboardRole } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function UserAvatar({ className }: { className?: string }) {
  const { user, profile } = useUser();
  const name = profile?.name || user?.displayName || user?.email || "U";
  return (
    <Avatar className={cn("h-9 w-9", className)}>
      <AvatarImage src={profile?.profileImageUrl || user?.photoURL || ""} alt="" className="object-cover" />
      <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">{name.charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

type UserMenuProps = {
  role: DashboardRole;
  /** `card` shows name + email (sidebar footer); `avatar` is icon-only. */
  variant?: "card" | "avatar";
  collapsed?: boolean;
};

export function UserMenu({ role, variant = "card", collapsed = false }: UserMenuProps) {
  const { user, profile } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const name = profile?.name || user?.displayName || "Your account";

  const logout = async () => {
    await signOut(auth);
    router.push("/auth/login");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account menu"
          className={cn(
            "flex items-center gap-3 rounded-xl text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            variant === "card" ? "w-full p-2" : "rounded-full",
            collapsed && "justify-center",
          )}
        >
          <UserAvatar />
          {variant === "card" && !collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{name}</span>
                <span className="block truncate text-xs capitalize text-muted-foreground">{role}</span>
              </span>
              <ChevronsUpDown aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
            </>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={variant === "card" ? "start" : "end"} side={variant === "card" ? "top" : "bottom"} className="w-60 rounded-xl">
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href={`/${role}/account`}>
              <Settings className="mr-2 h-4 w-4" /> Account settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer">
            <a href={siteConfig.supportWhatsApp} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" /> Chat with support
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer">
            <a href={`mailto:${siteConfig.supportEmail}`}>
              <LifeBuoy className="mr-2 h-4 w-4" /> Email support
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/">
              <ExternalLink className="mr-2 h-4 w-4" /> Go to lodger.com
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setConfirmOpen(true)}
            className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <LogoutModal open={confirmOpen} onOpenChange={setConfirmOpen} onConfirm={logout} />
    </>
  );
}
