import * as admin from 'firebase-admin';

// Refined Private Key Parsing
function formatPrivateKey(key: string | undefined) {
    if (!key) return undefined;
    let privateKey = key;

    // Remove literal quotes if present
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.substring(1, privateKey.length - 1);
    }

    // Convert escaped \n back to real newlines
    return privateKey.replace(/\\n/g, '\n');
}

// Lazy Initialization - only runs when actually needed
let initialized = false;

function initializeAdmin() {
    if (initialized || admin.apps.length > 0) {
        initialized = true;
        return;
    }

    try {
        const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-2267792175-c3d0d';
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
            console.warn("Firebase Admin: Skipping initialization due to missing credentials.");
        }
    } catch (error: any) {
        console.error('Firebase admin initialization error:', error.message);
    }
}

// Getter functions instead of direct exports to prevent build-time execution
export function getAdminDb() {
    initializeAdmin();
    return admin.firestore();
}

export function getAdminAuth() {
    initializeAdmin();
    return admin.auth();
}

// For backward compatibility, export as db and auth but wrapped
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
