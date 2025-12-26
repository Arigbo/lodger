'use client';

import { useEffect, useState } from 'react';
import StudentSidebar from "@/components/student-sidebar";
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import Loading from '@/app/loading';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';

export default function StudentLayout({
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
    // If user profile is loaded and the role is not student, redirect.
    if (!isProfileLoading && userProfile && userProfile.role !== 'student') {
      router.replace('/auth/login');
    }
  }, [isUserLoading, user, isProfileLoading, userProfile, router]);


  // Show loading state while we verify the user and their role
  if (isUserLoading || isProfileLoading) {
    return <Loading />;
  }

  // If user is verified as a student, render the layout
  if (user && userProfile && userProfile.role === 'student') {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        {/* Desktop Sidebar (Fixed) */}
        <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col lg:w-72">
          <div className="flex min-h-0 flex-1 flex-col border-r border-white/40 bg-white/40 backdrop-blur-xl">
            <div className="flex flex-1 flex-col overflow-y-auto pt-20 custom-scrollbar">
              <nav className="flex-1 px-4 space-y-1">
                <StudentSidebar />
              </nav>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar (Sheet) */}
        <div className="md:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetContent side="left" className="w-72 p-0 border-none bg-white/80 backdrop-blur-2xl">
              <div onClick={() => setMobileMenuOpen(false)} className="pt-20 pb-8">
                <StudentSidebar />
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
              {!userProfile.phone && (
                <Alert variant="destructive" className="mb-8 overflow-hidden rounded-2xl border-amber-500/20 bg-amber-50/50 backdrop-blur-md text-amber-900 shadow-xl shadow-amber-500/5 animate-in slide-in-from-top duration-500">
                  <div className="flex gap-4">
                    <div className="rounded-xl bg-amber-500/10 p-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <AlertTitle className="font-bold text-amber-800 tracking-tight">Profile Incomplete</AlertTitle>
                      <AlertDescription className="mt-1 text-sm font-medium text-amber-700/90 leading-relaxed">
                        To help landlords reach you faster, please <Link href="/student/account" className="font-bold underline decoration-amber-500/30 underline-offset-4 hover:text-amber-900 hover:decoration-amber-500 transition-all">add your phone number</Link> to your account settings.
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              )}

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
