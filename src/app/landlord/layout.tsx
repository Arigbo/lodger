
'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/header';
import LandlordSidebar from "@/components/landlord-sidebar";
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import Loading from '@/app/loading';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default function LandlordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    // If auth state is determined and there's no user, redirect to login.
    if (!isUserLoading && !user) {
      router.replace('/auth/login');
    }
    // If user profile is loaded and the role is not landlord, redirect.
    if (!isProfileLoading && userProfile && userProfile.role !== 'landlord') {
      router.replace('/auth/login');
    }
  }, [isUserLoading, user, isProfileLoading, userProfile, router]);


  // Show loading state while we verify the user and their role
  if (isUserLoading || isProfileLoading) {
    return <Loading />;
  }

  // If user is verified as a landlord, render the layout
  if (user && userProfile && userProfile.role === 'landlord') {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        {/* Desktop Sidebar (Fixed) */}
        <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col lg:w-72">
          <div className="flex min-h-0 flex-1 flex-col border-r border-white/40 bg-white/40 backdrop-blur-xl">
            <div className="flex h-16 shrink-0 items-center border-b border-white/40 px-6 lg:h-20">
              <span className="font-headline text-xl font-extrabold tracking-tighter text-primary italic">LODGER</span>
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary tracking-widest uppercase">Landlord</span>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto pt-4 custom-scrollbar">
              <nav className="flex-1 px-4 space-y-1">
                <LandlordSidebar />
              </nav>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar (Sheet) */}
        <div className="md:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetContent side="left" className="w-72 p-0 border-none bg-white/80 backdrop-blur-2xl">
              <SheetHeader className="p-6 border-b border-white/40">
                <SheetTitle className="flex items-center gap-2">
                  <span className="font-headline text-xl font-extrabold tracking-tighter text-primary italic">LODGER</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary tracking-widest uppercase">Landlord</span>
                </SheetTitle>
              </SheetHeader>
              <div onClick={() => setMobileMenuOpen(false)} className="py-4">
                <LandlordSidebar />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col md:pl-64 lg:pl-72">
          {/* Mobile Navigation Header */}
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-white/40 bg-white/60 px-4 shadow-sm backdrop-blur-xl sm:gap-x-6 sm:px-6 lg:px-8 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="-m-2.5 p-2.5 text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open sidebar</span>
            </Button>
            <div className="flex-1 flex justify-center">
              <span className="font-headline font-bold text-primary text-lg italic">LODGER</span>
            </div>
          </header>

          <main className="flex-1 py-6 lg:py-10">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Render loading state as a fallback while redirects are happening
  return <Loading />;
}


