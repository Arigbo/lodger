
'use client';

import { FirebaseStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a profile image for a user and returns the download URL.
 * @param storage The Firebase Storage instance.
 * @param userId The ID of the user.
 * @param file The image file to upload.
 * @returns A promise that resolves with the public download URL of the uploaded image.
 */
export async function uploadProfileImage(storage: FirebaseStorage, userId: string, file: File): Promise<string> {
  // Use a fixed filename to avoid storage rule violations if wildcard paths aren't allowed
  // We'll rely on the download URL token change or client-side cache busting
  const storageRef = ref(storage, `users/${userId}/profile-picture`);

  // Upload the file
  const snapshot = await uploadBytes(storageRef, file);

  // Get the download URL
  const downloadURL = await getDownloadURL(snapshot.ref);

  return downloadURL;
}


