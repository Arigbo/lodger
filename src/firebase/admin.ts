import * as admin from 'firebase-admin';

// Refined Private Key Parsing
function formatPrivateKey(key: string | undefined) {
    if (!key) return undefined;
    return key.replace(/\\n/g, '\n').replace(/"/g, '');
}

// Lazy Initialization - only runs when actually needed
let initialized = false;

function initializeAdmin() {
    if (initialized || admin.apps.length > 0) return;

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
            });
            initialized = true;
        } else {
            if (process.env.NODE_ENV !== 'production') {
                console.warn("Firebase Admin: Missing credentials. Skipping initialization.");
            }
        }
    } catch (error) {
        console.error('Firebase admin initialization error:', error);
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
