
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
      // Clean the private key: handle escaped newlines and ensure it's not wrapped in literal quotes
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      // Remove literal quotes if present
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.substring(1, privateKey.length - 1);
      }

      // Convert escaped \n back to real newlines
      privateKey = privateKey.replace(/\\n/g, '\n');

      serviceAccount = {
        projectId: firebaseConfig.projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      };
    }

    if (serviceAccount) {
      try {
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`,
        });
        firestoreInstance = getFirestore(adminApp);
        authInstance = getAuth(adminApp);
      } catch (initError: any) {
        console.error("Firebase Admin SDK initialization failed with valid looking credentials:", initError.message);
        // Fallback to undefined if cert parsing failed
        adminApp = undefined;
      }
    } else {
      console.warn("Firebase Admin SDK not initialized. Missing credentials or invalid format.");
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


