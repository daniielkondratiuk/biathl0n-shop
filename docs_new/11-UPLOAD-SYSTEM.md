# 11) Upload System

## Who this is for
This is for admins and developers who manage product images.

## What you will learn
1. What the upload system does.
2. Why files can go to a temp place first.
3. How temp upload works.
4. How commit upload works.
5. Where files are stored.
6. How image roles work.
7. How temp cleanup works.
8. Where uploads are used.
9. Where code files are.

## 1) What the Upload System is
The upload system handles image files.

It helps with:
1. Uploading images from admin screens.
2. Saving images in the correct folders.
3. Deleting temp files when needed.

## 2) Why there is a temporary upload step
A temp step lets the app upload and preview images before final save.

Simple flow:
1. User selects image files.
2. Files are processed and saved in a temp folder.
3. UI can preview these temp images.
4. Later, files can be moved to a product folder.

## 3) Temporary upload flow
Main temp endpoint used in product image uploader:
1. `POST /api/upload/temp-image`

How it works:
1. Admin auth is required.
2. Request accepts `files` (multiple) or `file` (single).
3. Server validates file type and size.
4. Server converts images to WebP and compresses them.
5. Server saves files in temp storage.
6. Response returns an array with fields like `id`, `url`, `filename`, `temp`.

Temp URL format from server result:
1. `/temp/{filename}`

If upload fails:
1. API returns an error response.
2. UI shows upload error state.

## 4) Commit upload flow
Commit endpoint:
1. `POST /api/upload/commit`

What this endpoint expects:
1. `productId`
2. `filenames` array

What it does:
1. Checks admin auth.
2. Verifies all temp files exist.
3. Copies files to product folder.
4. Returns final URLs like `/uploads/products/{productId}/{filename}`.
5. Tries to delete temp originals after copy.

When commit happens:
1. A helper exists: `commitTempImages(...)` in `components/admin/upload/gallery-upload.tsx`.
2. The exact trigger point in current product create/edit flow is Not verified in Phase 10.

## 5) Where files are stored (high-level)
Temp location:
1. `public/temp/`

Final product location:
1. `public/uploads/products/{productId}/`
2. Public URL format: `/uploads/products/{productId}/{filename}`

There is also a direct upload endpoint:
1. `POST /api/upload` stores files under `public/uploads/`.
2. Returned URL format is `/uploads/{filename}`.

## 6) Image roles
Verified roles:
1. `MAIN`
2. `MAIN_DETAIL`
3. `GALLERY`

Simple meaning:
1. `MAIN` is the primary product image.
2. `MAIN_DETAIL` is a special detail image.
3. `GALLERY` is a regular gallery image.

Role helpers ensure:
1. Exactly one `MAIN` image when images exist.
2. `MAIN_DETAIL` is valid only when a `MAIN` exists.
3. Image order is normalized.

## 7) Cleanup behavior
Temp delete endpoint:
1. `DELETE /api/upload/temp/{filename}`
2. Used to remove one temp file.

Temp cleanup endpoint:
1. `POST /api/upload/temp/cleanup`
2. Uses token header: `X-Temp-Cleanup-Token`.
3. Deletes old files from `public/temp/` (default older than 24 hours).

When cleanup runs automatically is Not verified in Phase 10.

## 8) Where uploads are used
Verified usage:
1. Admin product image uploader uses temp upload: `POST /api/upload/temp-image`.
2. Admin product image deletion can call temp delete for temp files.
3. Product image uploader supports role selection (`MAIN`, `MAIN_DETAIL`, `GALLERY`).

Other module usage is Not verified in Phase 10.

## 9) Where things live in the code
Upload APIs:
1. `app/api/upload/route.ts`
2. `app/api/upload/temp-image/route.ts`
3. `app/api/upload/commit/route.ts`
4. `app/api/upload/temp/[filename]/route.ts`
5. `app/api/upload/temp/cleanup/route.ts`

Upload server logic:
1. `src/features/upload/server/upload-file.ts`
2. `src/features/upload/server/temp-image.ts`
3. `src/features/upload/server/commit-upload.ts`
4. `src/features/upload/server/delete-temp-file.ts`
5. `src/features/upload/server/cleanup-temp-files.ts`

Product upload UI:
1. `src/features/admin/products/ui/upload/product-image-uploader.tsx`
2. `components/admin/upload/gallery-upload.tsx`
3. `components/admin/upload/image-upload.tsx`
4. `components/admin/upload/upload-zone.tsx`

Role and image helpers:
1. `lib/utils/image-role-helpers.ts`
2. `lib/utils/image-utils.ts`
3. `lib/utils/product-image-cleanup.ts`

## Common problems
- Upload returns `Unauthorized`. Log in as admin.
- Upload fails for file type. Use JPG, PNG, or WebP.
- Upload fails for file size. Keep file under 10MB.
- Temp image preview works, but final URL is missing. Commit step may not have run.
- Commit fails with temp file not found. Temp file may already be deleted.
- Temp cleanup endpoint returns `403`. Cleanup token may be wrong.
- Temp cleanup endpoint returns `404`. Cleanup token may not be configured.

## Related docs
- `docs_new/7-ADMIN-PRODUCTS.md`
- `docs_new/9-ADMIN-INVENTORY.md`
