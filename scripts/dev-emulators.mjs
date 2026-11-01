/**
 * Runs `next dev` against the local Firebase emulators (cross-platform).
 * Start the emulators first with `npm run emulators`, then `npm run seed`.
 */
import { spawn } from 'node:child_process';

const env = {
  ...process.env,
  NEXT_PUBLIC_USE_FIREBASE_EMULATORS: 'true',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
  GCLOUD_PROJECT: 'demo-lodger',
  // The Storage emulator is free, so local uploads never need Cloudinary keys.
  NEXT_PUBLIC_MEDIA_PROVIDER: 'firebase',
};

const args = ['next', process.argv[2] === 'start' ? 'start' : 'dev', ...process.argv.slice(3)];
const child = spawn('npx', args, { env, stdio: 'inherit', shell: process.platform === 'win32' });
child.on('exit', (code) => process.exit(code ?? 0));
