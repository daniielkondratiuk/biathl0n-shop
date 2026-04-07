// src/features/admin/products/server/product-image-commit.ts
import { basename } from "path";
import { commitUpload } from "@/features/upload/server/commit-upload";

export interface ImageWithRole {
  url: string;
  role: "MAIN" | "MAIN_DETAIL" | "GALLERY";
  order?: number;
}

/**
 * Commits temp images to product directory before saving to DB.
 * Detects images with url starting with "/temp/" and commits them.
 * Returns array with committed URLs (replacing temp URLs).
 */
export async function commitTempImagesIfNeeded(params: {
  productId: string;
  images: ImageWithRole[];
}): Promise<ImageWithRole[]> {
  const { productId, images } = params;

  // Find all temp images
  const tempImages = images.filter((img) => img.url.startsWith("/temp/"));
  
  if (tempImages.length === 0) {
    // No temp images to commit, return as-is
    return images;
  }

  // Extract filenames from temp URLs and sanitize
  const tempImageData: Array<{ filename: string; isMain: boolean; originalUrl: string }> = [];
  
  for (const img of tempImages) {
    // Extract filename from "/temp/<filename>"
    // Sanitize: use basename to prevent path traversal
    const urlPath = img.url.replace("/temp/", "");
    const filename = basename(urlPath); // Only gets filename, no path traversal
    
    // Determine isMain: MAIN role means isMain=true
    const isMain = img.role === "MAIN";
    
    tempImageData.push({
      filename,
      isMain,
      originalUrl: img.url,
    });
  }

  // Commit temp images
  const commitResult = await commitUpload({
    productId,
    images: tempImageData.map((d) => ({ filename: d.filename, isMain: d.isMain })),
  });

  if ("status" in commitResult) {
    throw new Error(`Failed to commit temp images: ${commitResult.error}`);
  }

  // Build map: original temp URL -> committed URL
  const urlMap = new Map<string, string>();
  for (let i = 0; i < tempImageData.length; i++) {
    const originalUrl = tempImageData[i].originalUrl;
    const committedImage = commitResult.images[i];
    if (committedImage) {
      urlMap.set(originalUrl, committedImage.url);
    }
  }

  // Replace temp URLs with committed URLs in result
  const result: ImageWithRole[] = images.map((img) => {
    if (img.url.startsWith("/temp/")) {
      const committedUrl = urlMap.get(img.url);
      if (!committedUrl) {
        throw new Error(`Failed to get committed URL for temp image: ${img.url}`);
      }
      return {
        ...img,
        url: committedUrl,
      };
    }
    // Non-temp images are unchanged
    return img;
  });

  return result;
}
