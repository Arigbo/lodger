# Profile Image Upload Fix - Debugging Guide

## Changes Made

### 1. **Enhanced Error Logging** (`src/firebase/storage.ts`)
- Added file type validation before upload
- Added file size check before upload
- Added detailed console logging at each step for easier debugging
- Better error messages with specific error codes

### 2. **Improved Error Handling** (Both student and landlord account pages)
- **Student**: `src/app/student/account/page.tsx`
- **Landlord**: `src/app/landlord/account/page.tsx`

Added client-side file type validation:
- Checks that file is an image before attempting upload
- Shows user-friendly error message if not a valid image type

### 3. **Better User Feedback**
- More descriptive error messages
- File validation happens before upload attempt
- Clearer error descriptions in toast notifications

---

## How to Debug the Issue

### Step 1: Check Browser Console
1. Open DevTools (F12 or Right-click → Inspect)
2. Go to **Console** tab
3. Try uploading a profile image
4. Look for these log messages:
   ```
   Starting upload for user [userId], file: [filename], size: [size]
   Profile image upload error: {...}
   ```

### Step 2: Check Network Tab
1. Go to **Network** tab in DevTools
2. Try uploading an image
3. Look for requests to `storage.googleapis.com`
4. Check for failed requests (red X)
5. Click on the failed request and check:
   - **Headers** tab: Verify auth token is present
   - **Response** tab: Check for error message

### Step 3: Common Issues & Solutions

#### Issue: "Permission denied" or "Insufficient permissions"
**Solution**: 
- Verify user is logged in
- Check `storage.rules` allows writes to `users/{userId}/profile-picture` path
- Current rule: `allow write: if request.auth != null && request.auth.uid == userId && request.resource.size < 1 * 1024 * 1024;`

#### Issue: CORS error ("No 'Access-Control-Allow-Origin' header")
**Solution**:
- The CORS configuration in `cors.json` only includes `http://localhost:3000`
- For production, update `cors.json` with production URL:
  ```json
  {
      "origin": [
          "http://localhost:3000",
          "https://yourdomain.com"
      ],
      "method": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "maxAgeSeconds": 3600
  }
  ```
- Apply CORS config to Firebase Storage:
  ```bash
  gsutil cors set cors.json gs://studio-2267792175-c3d0d.appspot.com
  ```

#### Issue: File upload succeeds but image doesn't display
**Solution**:
- Check that the `profileImageUrl` is being saved to Firestore correctly
- Verify Firestore rules allow writing to `users/{userId}` document
- Check that the image URL in the database is correct and valid

#### Issue: "File is too large"
**Solution**:
- Maximum file size is 1MB
- Compress image before uploading
- Use online image compressor or image software

---

## Storage Rules Verification

Current storage rules in `storage.rules`:

```plaintext
match /users/{userId}/{allPaths=**} {
  allow read: if true;
  allow write: if request.auth != null && request.auth.uid == userId && request.resource.size < 1 * 1024 * 1024;
}
```

This rule:
- ✅ Allows anyone to read user profile images
- ✅ Allows authenticated users to write to their own folder only
- ✅ Enforces 1MB file size limit

---

## Testing Steps

1. **Clear cache** (Ctrl+Shift+Delete or Cmd+Shift+Delete)
2. **Log out and log back in**
3. **Try uploading a small image** (< 1MB, JPG/PNG)
4. **Check browser console** for error messages
5. **Check network tab** for failed requests
6. **Verify Firebase project settings**:
   - Go to Firebase Console
   - Check if Storage is enabled
   - Check Storage rules are published
   - Verify CORS configuration

---

## Firestore Rules Check

For the profile image to save correctly, verify Firestore rules allow writing:

```plaintext
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == userId;
}
```

---

## Production Checklist

- [ ] Update `cors.json` with production domain
- [ ] Apply CORS to production Firebase Storage bucket
- [ ] Verify Storage rules are published
- [ ] Verify Firestore rules allow user document writes
- [ ] Test with actual production users
- [ ] Monitor browser console for errors
- [ ] Monitor Firebase Storage quotas

---

## Quick Fix Checklist

1. ✅ **File validation added** - checks file type and size
2. ✅ **Better error messages** - more descriptive toasts
3. ✅ **Enhanced logging** - debug info in console
4. ✅ **Same validation for both student and landlord** - consistent behavior

If the issue persists after these fixes, it's likely:
- CORS configuration issue
- Firebase project configuration
- Authentication token expiration
- Storage quota exceeded
