// lib/utils/product-helpers.ts
import type { ProductColorVariant, ProductImage } from "@/shared/types/prisma";

type ColorVariantWithImages = ProductColorVariant & {
  images: ProductImage[];
};

/**
 * Get MAIN image from a color variant
 */
export function getMainImage(colorVariant: ColorVariantWithImages | null | undefined): string | null {
  if (!colorVariant?.images) return null;
  const mainImage = colorVariant.images.find((img) => img.role === "MAIN");
  return mainImage?.url || null;
}

/**
 * Get MAIN_DETAIL image from a color variant
 */
export function getMainDetailImage(colorVariant: ColorVariantWithImages | null | undefined): string | null {
  if (!colorVariant?.images) return null;
  const mainDetailImage = colorVariant.images.find((img) => img.role === "MAIN_DETAIL");
  return mainDetailImage?.url || null;
}

/**
 * Get GALLERY images from a color variant (sorted by order)
 */
export function getGalleryImages(colorVariant: ColorVariantWithImages | null | undefined): string[] {
  if (!colorVariant?.images) return [];
  return colorVariant.images
    .filter((img) => img.role === "GALLERY")
    .sort((a, b) => a.order - b.order)
    .map((img) => img.url);
}

/**
 * Validate color variant structure
 */
export function validateColorVariantStructure(colorVariant: {
  images?: Array<{ url: string; role: string; order?: number }>;
}): { valid: boolean; error?: string } {
  if (!colorVariant.images || colorVariant.images.length === 0) {
    return { valid: true }; // No images is valid
  }

  const mainImages = colorVariant.images.filter((img) => img.role === "MAIN");
  const mainDetailImages = colorVariant.images.filter((img) => img.role === "MAIN_DETAIL");

  // Only one MAIN allowed
  if (mainImages.length > 1) {
    return { valid: false, error: "Only one MAIN image is allowed per color variant" };
  }

  // MAIN_DETAIL requires MAIN
  if (mainDetailImages.length > 0 && mainImages.length === 0) {
    return { valid: false, error: "MAIN_DETAIL image requires a MAIN image" };
  }

  // MAIN_DETAIL cannot equal MAIN
  if (mainImages.length === 1 && mainDetailImages.length > 0) {
    const mainUrl = mainImages[0].url;
    if (mainDetailImages.some((img) => img.url === mainUrl)) {
      return { valid: false, error: "MAIN_DETAIL image cannot be the same as MAIN image" };
    }
  }

  // Only one MAIN_DETAIL allowed
  if (mainDetailImages.length > 1) {
    return { valid: false, error: "Only one MAIN_DETAIL image is allowed per color variant" };
  }

  return { valid: true };
}

type FormattableProduct = Record<string, unknown> & {
  colorVariants?: ColorVariantWithImages[];
};

/**
 * Format product response for API
 */
export function formatProductResponse(product: FormattableProduct) {
  return {
    ...product,
    colorVariants: product.colorVariants?.map((cv) => ({
      ...cv,
      mainImage: getMainImage(cv),
      mainDetailImage: getMainDetailImage(cv),
      galleryImages: getGalleryImages(cv),
    })) || [],
  };
}

