
'use client';

import { useEffect } from 'react';
import Header from '@/components/header';
import StudentSidebar from "@/components/student-sidebar";
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import Loading from '@/app/loading';


export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

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
              <Header />
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
            <Header />
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Render loading state as a fallback while redirects are happening
  return <Loading />;
}


