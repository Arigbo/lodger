'use client';

import { useEffect, useState } from 'react';
import StudentSidebar from "@/components/student-sidebar";
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import Loading from '@/app/loading';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
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
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <div className="hidden border-r bg-muted/40 md:block">
          <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
              <span className="font-semibold">Student Dashboard</span>
            </div>
            <div className="flex-1">
              <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                <StudentSidebar />
              </nav>
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <nav className="grid gap-2 text-lg font-medium">
                  <div className="flex h-14 items-center border-b px-4 mb-4">
                    <span className="font-semibold">Menu</span>
                  </div>
                  <div onClick={() => setMobileMenuOpen(false)}>
                    <StudentSidebar />
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
            <div className="flex-1">
              {/* Global Header handles title/logo */}
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            {!userProfile.phone && (
              <Alert variant="destructive" className="bg-amber-50 border-amber-500 text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Account Incomplete</AlertTitle>
                <AlertDescription className="text-amber-700">
                  Please <Link href="/student/account" className="font-bold underline hover:text-amber-900">add your phone number</Link> to your profile to ensure landlords can reach you easily.
                </AlertDescription>
              </Alert>
            )}
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Render loading state as a fallback while redirects are happening
  return <Loading />;
}
