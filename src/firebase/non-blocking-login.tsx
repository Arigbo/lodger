
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

/** Initiate email/password sign-in. Returns a promise that resolves on success or rejects on error. */
export function initiateEmailSignIn(
    authInstance: Auth, 
    email: string, 
    password: string, 
): Promise<UserCredential> {
  return signInWithEmailAndPassword(authInstance, email, password);
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
