
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
import { FirestorePermissionError, errorEmitter } from '@/firebase';
import type { UserProfile } from '@/lib/definitions';

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

/** Initiate Google sign-in. */
export function initiateGoogleSignIn(
  auth: Auth, 
  userType: 'student' | 'landlord',
  onSuccess: (uid: string, isNewUser: boolean) => void,
  toast: (options: any) => void
): void {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then(async (result) => {
      const user = result.user;
      const { firestore } = getSdks(auth.app);
      const userDocRef = doc(firestore, 'users', user.uid);
      
      try {
        const userDoc = await getDoc(userDocRef);
        const isNewUser = !userDoc.exists();

        if (isNewUser) {
          const newUserProfile: Partial<UserProfile> = {
            id: user.uid,
            name: user.displayName || 'Anonymous',
            email: user.email,
            role: userType,
            profileImageUrl: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
          };
          // Temporarily store profile for the login page to handle
          sessionStorage.setItem('newUserProfile', JSON.stringify(newUserProfile));
        }
        
        onSuccess(user.uid, isNewUser);

      } catch (error: any) {
        // This is the critical change: ensuring Firestore errors are caught
        // and re-emitted with proper context.
        if (error.code && (error.code.includes('permission-denied') || error.code.includes('unauthenticated'))) {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'get',
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
           console.error("Error during Google sign-in user setup:", error);
           toast({
               variant: "destructive",
               title: "Sign In Failed",
               description: "Could not set up your user profile. Please try again.",
           });
        }
      }
    })
    .catch((error) => {
      // This block handles popup errors, not Firestore errors.
      const errorCode = error.code;
      const errorMessage = error.message;
      console.error(`Google Sign-In Error (${errorCode}):`, errorMessage);
      toast({
          variant: "destructive",
          title: "Google Sign-In Failed",
          description: errorMessage,
      });
    });
}
