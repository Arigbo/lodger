'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

/** Local development against `npm run emulators` (see README). */
const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
export const EMULATOR_PROJECT_ID = 'demo-lodger';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION (beyond the emulator branch)
export function initializeFirebase() {
  if (!getApps().length && USE_EMULATORS) {
    return getSdks(initializeApp({ ...firebaseConfig, projectId: EMULATOR_PROJECT_ID }));
  }
  if (!getApps().length) {
    // Important! initializeApp() is called without any arguments because Firebase App Hosting
    // integrates with the initializeApp() function to provide the environment variables needed to
    // populate the FirebaseOptions in production. It is critical that we attempt to call initializeApp()
    // without arguments.
    let firebaseApp;
    try {
      // Attempt to initialize via Firebase App Hosting environment variables
      firebaseApp = initializeApp();
    } catch (e) {
      // Silence the "no-options" warning during production build as it's expected behavior
      // when running on a platform that doesn't provide automatic config (like local build)
      const isNoOptionsError = (e as { code?: string } | null)?.code === 'app/no-options';
      if (process.env.NODE_ENV === "production" && !isNoOptionsError) {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }

    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

let emulatorsConnected = false;

export function getSdks(firebaseApp: FirebaseApp) {
  const sdks = {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp),
  };

  if (USE_EMULATORS && !emulatorsConnected) {
    emulatorsConnected = true;
    connectAuthEmulator(sdks.auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(sdks.firestore, '127.0.0.1', 8080);
    connectStorageEmulator(sdks.storage, '127.0.0.1', 9199);
  }

  return sdks;
}

export * from '@/firebase/provider';
export * from '@/firebase/client-provider';
export * from '@/firebase/firestore/use-collection';
export * from '@/firebase/firestore/use-doc';
export * from '@/firebase/non-blocking-updates';
export * from '@/firebase/non-blocking-login';
export * from '@/firebase/errors';
export * from '@/firebase/error-emitter';


