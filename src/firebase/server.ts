// IMPORTANT: This file is only used on the server and should not be included in the client-side bundle.

import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import { firebaseConfig } from './config';

let adminApp: App;
let firestore: Firestore;
let auth: Auth;

// The service account key is retrieved from environment variables.
// This is a secure way to handle credentials on the server.
try {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : undefined;

  // Initialize the Firebase Admin SDK only if it hasn't been already and service account is available.
  if (!getApps().length) {
    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount),
        databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`,
      });
    } else {
      // In a server environment, we might want to throw an error or handle this case explicitly
      // if server-side Firebase features are critical. For now, we'll just not initialize.
      console.warn("Firebase Admin SDK not initialized. FIREBASE_SERVICE_ACCOUNT env var is missing.");
    }
  }

} catch (error) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT or initialize Firebase Admin SDK.", error);
}


// A function to get the initialized services, which might be undefined if initialization failed.
const getFirebaseAdmin = () => {
    if (!adminApp) {
        try {
            adminApp = getApp();
            firestore = getFirestore(adminApp);
            auth = getAuth(adminApp);
        } catch (e) {
            // This will catch if getApp() is called and no app is initialized.
            // We can treat this as a silent failure in contexts where admin sdk is not required.
        }
    }
    return { adminApp, firestore, auth };
};

// We now export functions that will attempt to get the services.
// This delays the potential error until the services are actually used.
function getSafeFirestore(): Firestore {
    const { firestore } = getFirebaseAdmin();
    if (!firestore) {
        throw new Error("Firestore Admin SDK is not available. Check server environment configuration.");
    }
    return firestore;
}

function getSafeAuth(): Auth {
     const { auth } = getFirebaseAdmin();
    if (!auth) {
        throw new Error("Auth Admin SDK is not available. Check server environment configuration.");
    }
    return auth;
}


// Exporting getters instead of direct instances
export { getSafeFirestore as firestore, getSafeAuth as auth };
