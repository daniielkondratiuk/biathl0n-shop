// lib/utils/image-role-helpers.ts

export type ImageRole = "MAIN" | "MAIN_DETAIL" | "GALLERY";

export interface ImageWithRole {
  url: string;
  role: ImageRole;
  order: number;
}

/**
 * Ensures exactly one MAIN image exists in the array.
 * If no MAIN exists and images are available, assigns MAIN to the first image.
 * If multiple MAIN exist, keeps only the first one.
 */
export function ensureMainImage(images: ImageWithRole[]): ImageWithRole[] {
  if (images.length === 0) return [];

  const mainImages = images.filter((img) => img.role === "MAIN");
  
  // If no MAIN exists, assign to first image
  if (mainImages.length === 0) {
    return images.map((img, idx) => ({
      ...img,
      role: idx === 0 ? "MAIN" : img.role,
    }));
  }

  // If multiple MAIN exist, keep only the first one
  if (mainImages.length > 1) {
    let foundFirst = false;
    return images.map((img) => {
      if (img.role === "MAIN") {
        if (!foundFirst) {
          foundFirst = true;
          return img; // Keep first MAIN
        }
        return { ...img, role: "GALLERY" }; // Convert others to GALLERY
      }
      return img;
    });
  }

  return images;
}

/**
 * Ensures MAIN_DETAIL can only exist if MAIN exists.
 * If MAIN is removed, MAIN_DETAIL is reset to GALLERY.
 */
export function validateMainDetail(images: ImageWithRole[]): ImageWithRole[] {
  const hasMain = images.some((img) => img.role === "MAIN");
  const mainDetailImages = images.filter((img) => img.role === "MAIN_DETAIL");

  // If no MAIN exists, reset all MAIN_DETAIL to GALLERY
  if (!hasMain) {
    return images.map((img) =>
      img.role === "MAIN_DETAIL" ? { ...img, role: "GALLERY" } : img
    );
  }

  // If multiple MAIN_DETAIL exist, keep only the first one
  if (mainDetailImages.length > 1) {
    let foundFirst = false;
    return images.map((img) => {
      if (img.role === "MAIN_DETAIL") {
        if (!foundFirst) {
          foundFirst = true;
          return img; // Keep first MAIN_DETAIL
        }
        return { ...img, role: "GALLERY" }; // Convert others to GALLERY
      }
      return img;
    });
  }

  return images;
}

/**
 * Sorts images in the correct order: MAIN → MAIN_DETAIL → GALLERY
 * Within each role, sorts by order field, then by URL (for stability)
 */
export function sortImagesByRole(images: ImageWithRole[]): ImageWithRole[] {
  const roleOrder: Record<ImageRole, number> = {
    MAIN: 0,
    MAIN_DETAIL: 1,
    GALLERY: 2,
  };

  return [...images].sort((a, b) => {
    const aOrder = roleOrder[a.role] ?? 2;
    const bOrder = roleOrder[b.role] ?? 2;
    
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    // Within same role, sort by order field
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    
    // If order is same, sort by URL for stability
    return a.url.localeCompare(b.url);
  });
}

/**
 * Normalizes image roles after any change:
 * - Ensures exactly one MAIN
 * - Validates MAIN_DETAIL (requires MAIN)
 * - Sorts images properly
 */
export function normalizeImageRoles(images: ImageWithRole[]): ImageWithRole[] {
  if (images.length === 0) return [];

  // Step 1: Ensure MAIN exists
  let normalized = ensureMainImage(images);

  // Step 2: Validate MAIN_DETAIL
  normalized = validateMainDetail(normalized);

  // Step 3: Sort by role
  normalized = sortImagesByRole(normalized);

  // Step 4: Update order field to match sorted position
  normalized = normalized.map((img, idx) => ({
    ...img,
    order: idx,
  }));

  return normalized;
}

/**
 * Handles image deletion:
 * - If MAIN is deleted and other images exist, auto-assign MAIN to first remaining image
 * - If MAIN is deleted and no other images exist, return empty array
 * - If MAIN_DETAIL is deleted, just remove it (no auto-reassign)
 */
export function handleImageDeletion(
  images: ImageWithRole[],
  deletedImage: ImageWithRole
): ImageWithRole[] {
  // Remove the deleted image
  const remaining = images.filter((img) => img.url !== deletedImage.url);

  if (remaining.length === 0) {
    return [];
  }

  // If MAIN was deleted, auto-assign MAIN to first remaining image
  if (deletedImage.role === "MAIN") {
    return normalizeImageRoles(
      remaining.map((img, idx) => ({
        ...img,
        role: idx === 0 ? "MAIN" : img.role === "MAIN_DETAIL" ? "GALLERY" : img.role,
      }))
    );
  }

  // If MAIN_DETAIL was deleted, just remove it (no auto-reassign)
  // If any other image was deleted, just remove it
  return normalizeImageRoles(remaining);
}

