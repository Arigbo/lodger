
"use client";

import Link from "next/link";
import { Menu, X, User } from "lucide-react";
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
import { useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "@/firebase/provider";


export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  return (
    <div className="flex h-full items-center justify-between">
        <Link href="/" onClick={() => setIsMenuOpen(false)}>
          <Logo />
        </Link>
    </div>
  );
}

const navLinks = [
  { href: "/student/properties", label: "All Properties" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/landlord", label: "For Landlords" },
];


