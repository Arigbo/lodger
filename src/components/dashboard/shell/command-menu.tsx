"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Globe, LogOut, Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useAuth } from "@/firebase/provider";
import { dashboardNavGroups, primaryAction, type DashboardRole } from "@/config/navigation";
import { cn } from "@/lib/utils";

/** ⌘K / Ctrl+K palette for jumping between pages and running common actions. */
export function CommandMenu({ role, className }: { role: DashboardRole; className?: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  const action = primaryAction[role];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-9 items-center gap-2 rounded-xl border bg-muted/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          className,
        )}
      >
        <Search aria-hidden className="h-4 w-4" />
        <span className="hidden lg:inline">Search or jump to…</span>
        <span className="sr-only lg:hidden">Search</span>
        <kbd className="pointer-events-none ml-4 hidden rounded border bg-background px-1.5 font-mono text-[10px] font-medium lg:inline">⌘K</kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a page or action…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Quick actions">
            <CommandItem onSelect={() => go(action.href)}>
              <action.icon /> {action.label}
            </CommandItem>
            {role === "landlord" && (
              <CommandItem onSelect={() => go("/properties")}>
                <Globe /> View public listings
              </CommandItem>
            )}
          </CommandGroup>
          {dashboardNavGroups[role].map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.items.map((item) => (
                <CommandItem key={item.href} value={`${group.label} ${item.label}`} onSelect={() => go(item.href)}>
                  <item.icon /> {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading="Account">
            <CommandItem
              onSelect={async () => {
                setOpen(false);
                await signOut(auth);
                router.push("/auth/login");
              }}
            >
              <LogOut /> Sign out
              <CommandShortcut />
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
