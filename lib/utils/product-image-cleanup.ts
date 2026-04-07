// lib/utils/product-image-cleanup.ts
import { rm, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { getProductImageDir } from "./image-utils";

export interface DeleteProductImagesResult {
  deleted: string[];
  failed: string[];
}

/**
 * Delete all images for a product
 * Returns list of deleted and failed file paths (for logging/debugging)
 */
export async function deleteProductImages(
  productId: string
): Promise<DeleteProductImagesResult> {
  const productDir = getProductImageDir(productId);
  const result: DeleteProductImagesResult = { deleted: [], failed: [] };

  if (!existsSync(productDir)) {
    return result; // Directory doesn't exist, nothing to delete
  }

  try {
    // List files in directory before deletion (for logging)
    const { readdir } = await import("fs/promises");
    const files = await readdir(productDir);
    const filePaths = files.map((file) => `${productDir}/${file}`);

    // Delete the entire directory
    await rm(productDir, { recursive: true, force: true });

    result.deleted = filePaths;
  } catch (error) {
    // If deletion fails, try to determine which files failed
    // In practice, if directory deletion fails, we can't easily determine individual failures
    // So we mark all as failed
    if (existsSync(productDir)) {
      try {
        const { readdir } = await import("fs/promises");
        const files = await readdir(productDir);
        result.failed = files.map((file) => `${productDir}/${file}`);
      } catch {
        // If we can't read directory, just note the directory path as failed
        result.failed = [productDir];
      }
    }
    throw error; // Re-throw to maintain existing error handling
  }

  return result;
}

/**
 * Delete a single product image file by URL.
 * Only allows deleting files within public/uploads/products/{productId}/
 * @param productId - Product ID
 * @param url - Image URL (must be /uploads/products/{productId}/{filename})
 * @returns true if deleted, false if not found
 */
export async function deleteProductImageFileByUrl(
  productId: string,
  url: string
): Promise<boolean> {
  // Validate URL format: must be /uploads/products/{productId}/{filename}
  const expectedPrefix = `/uploads/products/${productId}/`;
  if (!url.startsWith(expectedPrefix)) {
    // Security: don't delete files outside product directory
    throw new Error(`Invalid URL format: ${url} (must start with ${expectedPrefix})`);
  }

  // Extract filename from URL
  const filename = url.replace(expectedPrefix, "");
  if (!filename || filename.includes("/") || filename.includes("..")) {
    // Prevent path traversal
    throw new Error(`Invalid filename in URL: ${url}`);
  }

  // Build file path
  const productDir = getProductImageDir(productId);
  const filePath = join(productDir, filename);

  // Ensure file is within product directory (double-check)
  if (!filePath.startsWith(productDir)) {
    throw new Error(`Path traversal detected: ${filePath}`);
  }

  // Delete file if exists
  if (existsSync(filePath)) {
    await unlink(filePath);
    return true;
  }

  return false;
}