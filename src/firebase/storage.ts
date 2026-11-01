"use client";

import {
  FirebaseStorage,
} from "firebase/storage";
import { authHeaders } from "@/lib/api-client";
import { describeUploadError } from "@/lib/errors";
import { uploadMedia } from "@/lib/media/upload-media";

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
    headers: await authHeaders(),
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
 * Optionally checks an image with the moderation API, then uploads it via the
 * configured media provider. If the check is unavailable (not configured,
 * rate limited, offline) the image is uploaded anyway: moderation is a
 * safeguard, not a gate that should block landlords from editing listings.
 */
export async function moderateAndUpload(
  _storage: FirebaseStorage | null,
  path: string,
  file: File,
  options?: {
    allowIrrelevant?: boolean; // Allow upload even if context is IRRELEVANT
    skipModeration?: boolean;
  }
): Promise<ModerationUploadResult> {
  if (!file.type.startsWith("image/")) {
    return { success: false, error: "Please choose an image file (JPG, PNG or WebP)." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: "That photo is over 10 MB. Please choose a smaller one." };
  }

  let analysis: ModerationAnalysis | undefined;
  if (!options?.skipModeration) {
    try {
      analysis = await moderateImage(file);
    } catch {
      analysis = undefined; // check unavailable: continue without it
    }
  }

  if (analysis?.safety === "UNSAFE") {
    return {
      success: false,
      blocked: true,
      analysis,
      error: analysis.reason || "This image looks inappropriate for a listing.",
    };
  }
  if (analysis?.context === "IRRELEVANT" && !options?.allowIrrelevant) {
    return { success: false, blocked: false, analysis, error: analysis.reason || "This image doesn't look like part of a home." };
  }

  try {
    const downloadURL = await uploadMedia(file, path);
    return { success: true, downloadURL, analysis };
  } catch (error) {
    console.error("Upload failed:", error);
    return { success: false, error: describeUploadError(error).description };
  }
}

/** Uploads (and replaces) a user's profile picture; returns its public URL. */
export async function uploadProfileImage(_storage: FirebaseStorage | null, userId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (JPG, PNG or WebP).");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("That photo is over 10 MB. Please choose a smaller one.");
  }
  // Fixed path: a new picture replaces the old one instead of using more storage.
  return uploadMedia(file, `users/${userId}/profile-picture`);
}
