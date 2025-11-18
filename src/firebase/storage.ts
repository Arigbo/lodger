
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
  // Create a storage reference
  const storageRef = ref(storage, `profileImages/${userId}/${file.name}`);

  // Upload the file
  const snapshot = await uploadBytes(storageRef, file);

  // Get the download URL
  const downloadURL = await getDownloadURL(snapshot.ref);

  return downloadURL;
}
