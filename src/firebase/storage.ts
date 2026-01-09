"use client";

import {
  FirebaseStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

/**
 * Type definition for image moderation analysis results
 */
export interface ModerationAnalysis {
  safety: "SAFE" | "UNSAFE";
  context: "RELEVANT" | "IRRELEVANT";
  labels?: string[];
  reason?: string;
  cached?: boolean;
}

/**
 * Result of moderation and upload operation
 */
export interface ModerationUploadResult {
  success: boolean;
  downloadURL?: string;
  analysis?: ModerationAnalysis;
  error?: string;
  blocked?: boolean;
}

/**
 * Moderates an image using the API before uploading
 * @param imageFile The image file to moderate and upload
 * @returns Moderation analysis result
 */
export async function moderateImage(
  imageFile: File
): Promise<ModerationAnalysis> {
  // Convert file to base64
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(imageFile);
  });

  // Call moderation API
  const response = await fetch('/api/moderate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: base64,
      mimeType: imageFile.type
    })
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please wait and try again.');
    }
    throw new Error('Moderation check failed');
  }

  return await response.json();
}

/**
 * Moderates and uploads an image to Firebase Storage
 * @param storage The Firebase Storage instance
 * @param path The storage path for the image
 * @param file The image file to upload
 * @param options Optional configuration
 * @returns Result object with download URL or error
 */
export async function moderateAndUpload(
  storage: FirebaseStorage,
  path: string,
  file: File,
  options?: {
    allowIrrelevant?: boolean; // Allow upload even if context is IRRELEVANT
    skipModeration?: boolean; // Skip moderation entirely (not recommended)
  }
): Promise<ModerationUploadResult> {
  try {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      return {
        success: false,
        error: "Invalid file type. Please upload an image file.",
      };
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return {
        success: false,
        error: "File is too large. Maximum size is 5MB.",
      };
    }

    // Skip moderation if explicitly requested (not recommended for production)
    if (options?.skipModeration) {
      const storageRef = ref(storage, path);
      const metadata = {
        contentType: file.type,
        cacheControl: 'public, max-age=3600'
      };
      const snapshot = await uploadBytes(storageRef, file, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return { success: true, downloadURL };
    }

    // Moderate the image
    const analysis = await moderateImage(file);

    // Block UNSAFE images
    if (analysis.safety === "UNSAFE") {
      return {
        success: false,
        blocked: true,
        analysis,
        error: analysis.reason || "Image contains inappropriate content and cannot be uploaded.",
      };
    }

    // Optionally block IRRELEVANT images
    if (analysis.context === "IRRELEVANT" && !options?.allowIrrelevant) {
      return {
        success: false,
        blocked: false,
        analysis,
        error: analysis.reason || "Image may not be relevant to property listings.",
      };
    }

    // Upload the image
    const storageRef = ref(storage, path);
    const metadata = {
      contentType: file.type,
      cacheControl: 'public, max-age=3600',
      customMetadata: {
        moderationSafety: analysis.safety,
        moderationContext: analysis.context,
      }
    };

    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      success: true,
      downloadURL,
      analysis,
    };
  } catch (error: any) {
    console.error("Moderation and upload error:", error);
    return {
      success: false,
      error: error.message || "Upload failed. Please try again.",
    };
  }
}

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

    if (file.size > 5 * 1024 * 1024) { // Increased limit to 5MB based on typical user behavior
      throw new Error("File is too large. Maximum size is 5MB.");
    }

    // Use a fixed filename but include metadata to ensure correct MIME type
    const storageRef = ref(storage, `users/${userId}/profile-picture`);

    const metadata = {
      contentType: file.type,
      cacheControl: 'public, max-age=3600'
    };

    // Upload the file
    console.log(
      `Starting upload for user ${userId}, file: ${file.name}, size: ${file.size}, type: ${file.type}`
    );
    const snapshot = await uploadBytes(storageRef, file, metadata);
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
