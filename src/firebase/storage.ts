"use client";

import {
  FirebaseStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

/**
 * Uploads a profile image for a user and returns the download URL.
 * @param storage The Firebase Storage instance.
 * @param userId The ID of the user.
 * @param file The image file to upload.
 * @returns A promise that resolves with the public download URL of the uploaded image.
 */
export async function uploadProfileImage(
  storage: FirebaseStorage,
  userId: string,
  file: File
): Promise<string> {
  try {
    // Validate file before upload
    if (!file.type.startsWith("image/")) {
      throw new Error("Invalid file type. Please upload an image file.");
    }

    if (file.size > 1 * 1024 * 1024) {
      throw new Error("File is too large. Maximum size is 1MB.");
    }

    // Use a fixed filename to avoid storage rule violations if wildcard paths aren't allowed
    // We'll rely on the download URL token change or client-side cache busting
    const storageRef = ref(storage, `users/${userId}/profile-picture`);

    // Upload the file
    console.log(
      `Starting upload for user ${userId}, file: ${file.name}, size: ${file.size}`
    );
    const snapshot = await uploadBytes(storageRef, file);
    console.log("Upload successful, retrieving download URL...");

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log("Download URL retrieved successfully");

    return downloadURL;
  } catch (error: any) {
    console.error("Profile image upload error:", {
      code: error.code,
      message: error.message,
      serverResponse: error.serverResponse,
      fullError: error,
    });
    throw new Error(`Upload failed: ${error.message || "Unknown error"}`);
  }
}
