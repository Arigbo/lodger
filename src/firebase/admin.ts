import * as admin from 'firebase-admin';
import { firebaseConfig } from './config';

// Refined Private Key Parsing - handles multiple escape scenarios
function formatPrivateKey(key: string | undefined) {
    if (!key) return undefined;
    let privateKey = key.trim();

    // Remove literal quotes if present
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.substring(1, privateKey.length - 1);
    } else if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
        privateKey = privateKey.substring(1, privateKey.length - 1);
    }

    // Convert escaped \n back to real newlines, handle double-escaped as well
    privateKey = privateKey.replace(/\\n/g, '\n').replace(/\n/g, '\n');

    // Ensure the key has the proper header and footer if they are missing or malformed
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}`;
    }
    if (!privateKey.includes('-----END PRIVATE KEY-----')) {
        privateKey = `${privateKey}\n-----END PRIVATE KEY-----`;
    }

    return privateKey;
}

// Lazy Initialization - only runs when actually needed
let initialized = false;

function initializeAdmin() {
    if (initialized || admin.apps.length > 0) {
        initialized = true;
        return;
    }

    try {
        // Try the JSON blob first
        const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (serviceAccountVar) {
            try {
                const serviceAccount = JSON.parse(serviceAccountVar);
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    databaseURL: `https://${serviceAccount.projectId}.firebaseio.com`,
                });
                initialized = true;
                return;
            } catch (e) {
                console.warn("Firebase Admin: Failed to parse FIREBASE_SERVICE_ACCOUNT JSON fallback to individual vars.");
            }
        }

        // Fallback to individual variables
        const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

        if (privateKey && clientEmail) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
                databaseURL: `https://${projectId}.firebaseio.com`,
            });
            initialized = true;
        } else {
            if (!privateKey) console.warn("Firebase Admin: Missing FIREBASE_PRIVATE_KEY");
            if (!clientEmail) console.warn("Firebase Admin: Missing FIREBASE_CLIENT_EMAIL");
            console.warn(`Firebase Admin: Skipping initialization due to missing credentials for project ${projectId}`);
        }
    } catch (error: any) {
        console.error('Firebase admin initialization error:', error.message);
    }
}

// Getter functions
export function getAdminDb() {
    initializeAdmin();
    if (admin.apps.length === 0) {
        throw new Error("Firebase Admin SDK not initialized. Check your environment variables (FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL).");
    }
    return admin.firestore();
}

export function getAdminAuth() {
    initializeAdmin();
    if (admin.apps.length === 0) {
        throw new Error("Firebase Admin SDK not initialized. Check your environment variables (FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL).");
    }
    return admin.auth();
}

// Export specific instances for compatibility
export const db = new Proxy({} as admin.firestore.Firestore, {
    get: (_target, prop) => {
        const firestore = getAdminDb();
        // @ts-ignore
        const value = firestore[prop];
        return typeof value === 'function' ? value.bind(firestore) : value;
    }
});

export const auth = new Proxy({} as admin.auth.Auth, {
    get: (_target, prop) => {
        const authInstance = getAdminAuth();
        // @ts-ignore
        const value = authInstance[prop];
        return typeof value === 'function' ? value.bind(authInstance) : value;
    }
});

// Alias for server.ts compatibility
export const firestore = db;
