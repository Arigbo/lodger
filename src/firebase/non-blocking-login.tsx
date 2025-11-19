
'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  UserCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getSdks } from '.';
import type { Toast } from '@/hooks/use-toast';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance);
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): Promise<UserCredential> {
  return createUserWithEmailAndPassword(authInstance, email, password);
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(
    authInstance: Auth, 
    email: string, 
    password: string, 
    toast: (options: Toast) => void,
    router: AppRouterInstance
): void {
  signInWithEmailAndPassword(authInstance, email, password)
    .then(async (userCredential) => {
        const user = userCredential.user;
        const { firestore } = getSdks(authInstance.app);
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === 'landlord') {
                router.push('/landlord');
            } else {
                router.push('/student');
            }
        } else {
            // This case should ideally not happen in a sign-in flow,
            // but as a fallback, redirect to a generic student page.
            router.push('/student');
        }
    })
    .catch((error) => {
      console.error("Sign-in error:", error);
      let errorMessage = "An unknown error occurred. Please try again.";
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = "Please enter a valid email address.";
          break;
        case 'auth/user-disabled':
          errorMessage = "This user account has been disabled.";
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = "Invalid email or password. Please try again.";
          break;
        default:
          errorMessage = error.message;
          break;
      }
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: errorMessage,
      });
    });
}

/** Initiate Google sign-in (non-blocking). */
export function initiateGoogleSignIn(auth: Auth, userType: 'student' | 'landlord'): void {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then(async (result) => {
      const user = result.user;
      const { firestore } = getSdks(auth.app);
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const newUser = {
          id: user.uid,
          name: user.displayName || 'Anonymous',
          email: user.email,
          role: userType,
          profileImageUrl: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
        };
        await setDoc(userDocRef, newUser);
      }
      
      if(userType === 'landlord'){
        window.location.href = '/landlord';
      } else {
        window.location.href = '/student';
      }
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.error(`Google Sign-In Error (${errorCode}):`, errorMessage);
    });
}
