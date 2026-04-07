import { rename } from "fs/promises";
import { join, extname, basename as pathBasename } from "path";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import { getTempFilePath, getProductImageDir, generateImagePath, ensureDir } from "@/lib/utils/image-utils";

export interface CommitUploadInput {
  productId: string;
  images: Array<{ filename: string; isMain: boolean }>;
}

export interface CommitUploadResult {
  images: Array<{ url: string; isMain: boolean }>;
}

export interface CommitUploadError {
  status: number;
  error: string;
}

export async function commitUpload(
  input: CommitUploadInput
): Promise<CommitUploadResult | CommitUploadError> {
  const { productId, images } = input;

  if (!productId || !Array.isArray(images)) {
    return {
      status: 400,
      error: "productId and images array are required",
    };
  }

  // Ensure product image directory exists
  const productDir = getProductImageDir(productId);
  ensureDir(productDir);

  const committedImages: Array<{ url: string; isMain: boolean }> = [];

  // Move each temp file to product directory
  for (const image of images) {
    const tempPath = getTempFilePath(image.filename);
    
    if (!existsSync(tempPath)) {
      console.warn(`Temp file not found: ${image.filename}`);
      continue;
    }

    // Sanitize filename (prevent path traversal)
    const sanitizedFilename = pathBasename(image.filename);
    
    // Check for name collision and generate unique name if needed
    let finalFilename = sanitizedFilename;
    let finalPath = join(productDir, finalFilename);
    
    if (existsSync(finalPath)) {
      // Collision: generate new filename with UUID but preserve extension
      const ext = extname(sanitizedFilename);
      const base = pathBasename(sanitizedFilename, ext);
      finalFilename = `${base}-${randomUUID()}${ext}`;
      finalPath = join(productDir, finalFilename);
    }

    // Move file from temp to product directory
    await rename(tempPath, finalPath);

    const url = generateImagePath(productId, finalFilename);
    committedImages.push({
      url,
      isMain: image.isMain,
    });
  }

  return {
    images: committedImages,
  };
}

