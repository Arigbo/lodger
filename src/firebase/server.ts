
// IMPORTANT: This file is only used on the server and should not be included in the client-side bundle.

import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import { firebaseConfig } from './config';

let adminApp: App | undefined;
let firestoreInstance: Firestore | undefined;
let authInstance: Auth | undefined;

// The service account key is retrieved from environment variables.
// This is a secure way to handle credentials on the server.
try {
  if (!getApps().length) {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    let serviceAccount = serviceAccountVar ? JSON.parse(serviceAccountVar) : undefined;

    // Fallback to individual variables (useful for Firebase App Hosting secrets)
    if (!serviceAccount && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      serviceAccount = {
        projectId: firebaseConfig.projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      };
    }

    if (serviceAccount) {
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`,
      });
      firestoreInstance = getFirestore(adminApp);
      authInstance = getAuth(adminApp);
    } else {
      console.warn("Firebase Admin SDK not initialized. Missing FIREBASE_SERVICE_ACCOUNT or individual credentials.");
    }
  } else {
    adminApp = getApp();
    firestoreInstance = getFirestore(adminApp);
    authInstance = getAuth(adminApp);
  }
} catch (error) {
  console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT or initialize Firebase Admin SDK.", error);
}

// Export the instances directly. They will be undefined if initialization failed.
// Code that uses these exports on the server MUST handle the undefined case.
export const firestore: Firestore | undefined = firestoreInstance;
export const auth: Auth | undefined = authInstance;


