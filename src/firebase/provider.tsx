"use client";

import React, {
  DependencyList,
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useState,
  useEffect,
} from "react";
import { FirebaseApp } from "firebase/app";
import { Firestore, doc, onSnapshot } from "firebase/firestore";
import { Auth, User, onAuthStateChanged } from "firebase/auth";
import { FirebaseErrorListener } from "@/components/shared/firebase-error-listener";
import type { UserProfile } from "@/types";

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

type Role = Exclude<UserProfile["role"], "admin"> | null;

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  profile: WithId<UserProfile> | null;
  role: Role;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState extends UserAuthState {
  areServicesAvailable: boolean; // True if core services (app, firestore, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser extends UserAuthState {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// Return type for useUser() - specific to user auth state
export type UserHookResult = UserAuthState;

type WithId<T> = T & { id: string };

const SIGNED_OUT: UserAuthState = {
  user: null,
  profile: null,
  role: null,
  isUserLoading: false,
  userError: null,
};

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(
  undefined,
);

/**
 * FirebaseProvider manages Firebase services and the signed-in user's state.
 * The user's Firestore profile is subscribed to in real time so every
 * component reading `useUser()` sees profile edits immediately, without each
 * one opening its own listener.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    ...SIGNED_OUT,
    isUserLoading: true, // Start loading until first auth event
  });

  useEffect(() => {
    if (!auth) {
      setUserAuthState({ ...SIGNED_OUT, userError: new Error("Auth service not provided.") });
      return;
    }

    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribeProfile?.();
        unsubscribeProfile = undefined;

        if (!user) {
          setUserAuthState(SIGNED_OUT);
          return;
        }

        setUserAuthState((prev) => ({ ...prev, user, isUserLoading: true }));

        unsubscribeProfile = onSnapshot(
          doc(firestore, "users", user.uid),
          (snap) => {
            const profile = snap.exists()
              ? ({ ...(snap.data() as UserProfile), id: snap.id } as WithId<UserProfile>)
              : null;

            if (profile?.banned && window.location.pathname !== "/auth/banned") {
              window.location.href = "/auth/banned";
              return;
            }

            const role: Role =
              profile?.role === "student" || profile?.role === "landlord" ? profile.role : null;

            setUserAuthState({ user, profile, role, isUserLoading: false, userError: null });
          },
          (error) => {
            console.error("Error loading user profile:", error);
            setUserAuthState({ user, profile: null, role: null, isUserLoading: false, userError: error });
          },
        );
      },
      (error) => setUserAuthState({ ...SIGNED_OUT, userError: error }),
    );

    return () => {
      unsubscribeProfile?.();
      unsubscribeAuth();
    };
  }, [auth, firestore]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      ...userAuthState,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if core services are not available or used outside provider.
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error("useFirebase must be used within a FirebaseProvider.");
  }

  if (
    !context.areServicesAvailable ||
    !context.firebaseApp ||
    !context.firestore ||
    !context.auth
  ) {
    throw new Error(
      "Firebase core services not available. Check FirebaseProvider props.",
    );
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    profile: context.profile,
    role: context.role,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoFirebase<T> = T & { __memo?: boolean };

export function useMemoFirebase<T>(
  factory: () => T,
  deps: DependencyList,
): T | MemoFirebase<T> {
  const memoized = useMemo(factory, deps);

  if (typeof memoized !== "object" || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;

  return memoized;
}

/**
 * Hook specifically for accessing the authenticated user's state.
 * Provides the Firebase User, their live Firestore profile, role, loading
 * status and any auth errors.
 */
export const useUser = (): UserHookResult => {
  const { user, profile, role, isUserLoading, userError } = useFirebase();
  return { user, profile, role, isUserLoading, userError };
};
