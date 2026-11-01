#!/usr/bin/env node
/**
 * Wipes a Firebase project's DATA (not the project itself):
 *   - every Firestore collection and sub-collection
 *   - every Firebase Auth user
 *   - (optional, --storage) every file in the default Storage bucket
 *
 * Security rules, indexes, config and the project stay as they are, so you
 * can sign up again straight away.
 *
 * SAFE BY DEFAULT: without --yes it only prints what it WOULD delete.
 *
 *   # 1. Preview (deletes nothing)
 *   node scripts/reset-firebase.mjs --project studio-2267792175-c3d0d
 *
 *   # 2. Wipe Firestore + Auth
 *   node scripts/reset-firebase.mjs --project studio-2267792175-c3d0d --yes
 *
 *   # 3. ...and also Storage files
 *   node scripts/reset-firebase.mjs --project studio-2267792175-c3d0d --yes --storage
 *
 * Credentials (Admin SDK), any one of:
 *   - FIREBASE_SERVICE_ACCOUNT='{"project_id":...}'  (JSON string)
 *   - FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (+ FIREBASE_PROJECT_ID)
 *   - GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 * It also reads .env.local / .env if present.
 *
 * There is NO undo. Export first if you might need anything:
 *   firebase firestore:export   /   firebase auth:export users.json
 */
import { existsSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import admin from 'firebase-admin';

// ---------- args ----------
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const projectArg = option('project');
const confirmed = flag('yes');
const includeStorage = flag('storage');
const skipAuth = flag('skip-auth');
const skipFirestore = flag('skip-firestore');

if (!projectArg) {
  console.error('Refusing to run: pass --project <firebase-project-id> (it must match your credentials).');
  process.exit(1);
}
if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.log('ℹ Emulator variables detected — this will reset the local EMULATOR data, not production.');
}

// ---------- env files ----------
for (const file of ['.env.local', '.env']) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

// ---------- credentials ----------
function credential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
  }
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID || projectArg,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  }
  return admin.credential.applicationDefault();
}

admin.initializeApp({
  ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : { credential: credential() }),
  projectId: projectArg,
  storageBucket: option('bucket') || `${projectArg}.firebasestorage.app`,
});
const db = admin.firestore();
const auth = admin.auth();

// ---------- inventory ----------
async function countUsers() {
  let total = 0;
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    total += page.users.length;
    pageToken = page.pageToken;
  } while (pageToken);
  return total;
}

const collections = skipFirestore ? [] : await db.listCollections();
const collectionCounts = await Promise.all(
  collections.map(async (c) => [c.id, (await c.count().get()).data().count]),
);
const userCount = skipAuth ? 0 : await countUsers();
let files = [];
if (includeStorage) [files] = await admin.storage().bucket().getFiles();

console.log(`\nProject: ${projectArg}${process.env.FIRESTORE_EMULATOR_HOST ? ' (emulator)' : ''}`);
if (!skipFirestore) {
  console.log('\nFirestore collections (top-level docs; sub-collections are deleted too):');
  if (!collectionCounts.length) console.log('  (none)');
  for (const [id, n] of collectionCounts) console.log(`  - ${id}: ${n}`);
}
if (!skipAuth) console.log(`\nAuth users: ${userCount}`);
if (includeStorage) console.log(`\nStorage files: ${files.length}`);

if (!confirmed) {
  console.log('\nDry run only — nothing was deleted. Re-run with --yes to wipe the data above.\n');
  process.exit(0);
}

// ---------- final confirmation ----------
if (process.stdin.isTTY) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`\nType the project id (${projectArg}) to permanently delete this data: `);
  rl.close();
  if (answer.trim() !== projectArg) {
    console.log('Project id did not match. Aborted — nothing was deleted.');
    process.exit(1);
  }
}

// ---------- wipe ----------
for (const collection of collections) {
  process.stdout.write(`Deleting Firestore collection "${collection.id}"… `);
  await db.recursiveDelete(collection);
  console.log('done');
}

if (!skipAuth && userCount) {
  let deleted = 0;
  for (;;) {
    const page = await auth.listUsers(1000);
    if (!page.users.length) break;
    const result = await auth.deleteUsers(page.users.map((u) => u.uid));
    deleted += result.successCount;
    if (result.failureCount) console.warn(`  ${result.failureCount} users could not be deleted:`, result.errors.slice(0, 3));
    if (result.successCount === 0) break;
  }
  console.log(`Deleted ${deleted} Auth users.`);
}

if (includeStorage && files.length) {
  process.stdout.write(`Deleting ${files.length} Storage files… `);
  await admin.storage().bucket().deleteFiles({ force: true });
  console.log('done');
}

console.log('\n✔ Reset complete. Security rules and project settings were not changed — you can sign up again now.\n');
process.exit(0);
