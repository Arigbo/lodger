// IMPORTANT: This file is only used on the server and should not be included in the client-side bundle.

import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { firebaseConfig } from './config';

// The service account key is retrieved from environment variables.
// This is a secure way to handle credentials on the server.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : undefined;

// Initialize the Firebase Admin SDK if it hasn't been already.
if (!getApps().length) {
  initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : undefined,
    databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`,
  });
}

// Export the initialized services for use in server-side functions (e.g., API routes, server components).
export const adminApp = getApp();
export const firestore = getFirestore(adminApp);
export const auth = getAuth(adminApp);
