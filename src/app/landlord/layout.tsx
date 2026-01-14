'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/header';
import LandlordSidebar from "@/components/landlord-sidebar";
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import Loading from '@/app/loading';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, AlertCircle, ArrowRight, X } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function LandlordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isStripeWarningDismissed, setIsStripeWarningDismissed] = useState(false);
  const pathname = usePathname();

  // Dynamic Title Logic
  const getPageTitle = (path: string) => {
    if (path.includes('/landlord/properties')) return 'My Properties';
    if (path.includes('/landlord/requests')) return 'Lease Requests';
    if (path.includes('/landlord/messages')) return 'Messages';
    if (path.includes('/landlord/account')) return 'Account Settings';
    if (path.includes('/landlord/tenants')) return 'My Tenants';
    if (path.includes('/landlord/maintenance')) return 'Maintenance';
    if (path.includes('/landlord/transactions')) return 'Financials';
    return 'Landlord Dashboard';
  };

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    const handleToggle = () => setMobileMenuOpen(prev => !prev);
    window.addEventListener('toggle-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-sidebar', handleToggle);
  }, []);

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
    const showStripeWarning = !userProfile.stripeAccountId || !userProfile.stripeDetailsSubmitted;

    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col">
        <title>{`Lodger | ${getPageTitle(pathname)}`}</title>

        {/* Stripe Onboarding Warning */}
        {showStripeWarning && !isStripeWarningDismissed && (
          <div className="bg-amber-600 text-white px-4 py-3 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center sm:text-left animate-in fade-in slide-in-from-top duration-500 sticky top-0 z-50 shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-xs sm:text-sm font-black uppercase tracking-tight">
                Stripe Setup Required <span className="hidden sm:inline opacity-60">•</span>
              </p>
            </div>
            <p className="text-[10px] sm:text-xs font-bold opacity-90 max-w-lg">
              You must finish your Stripe onboarding to accept payments from tenants.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/landlord/account"
                className="flex items-center gap-2 bg-white text-amber-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-amber-50 transition-colors shadow-sm"
              >
                Complete Setup <ArrowRight className="h-3 w-3" />
              </Link>
              <button
                onClick={() => setIsStripeWarningDismissed(true)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Dismiss warning"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Layout with Sidebar */}
        <div className="flex flex-1 pt-0">
          {/* Desktop Sidebar (Fixed) */}
          <aside className="hidden md:fixed md:top-20 md:bottom-0 md:flex md:w-64 md:flex-col lg:w-72 border-r border-white/40">
            <div className="flex min-h-0 flex-1 flex-col bg-white/40 backdrop-blur-xl">
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
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation Menu</SheetTitle>
                  <SheetDescription>Access landlord dashboard navigation</SheetDescription>
                </SheetHeader>
                <SheetHeader className="p-6 border-b border-white/40 text-left">
                  <SheetTitle className="text-lg font-black uppercase tracking-tight">Navigation</SheetTitle>
                </SheetHeader>
                <div onClick={() => setMobileMenuOpen(false)} className="py-4">
                  <LandlordSidebar />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Main Content Area */}
          <div className="flex flex-col flex-1 md:pl-64 lg:pl-72">
            <main className="flex-1 py-6 lg:py-10">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
                  {children}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  // Render loading state as a fallback while redirects are happening
  return <Loading />;
}


