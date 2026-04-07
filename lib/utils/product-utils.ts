// lib/utils/product-utils.ts

export type Gender = "MEN" | "WOMEN" | "KIDS";
export type Size = "XS" | "S" | "M" | "L" | "XL" | "XXL";

export interface VariantInput {
  gender: Gender;
  size: Size;
  priceDiff: number; // in cents
  stock: number;
  image?: string;
}

/**
 * Generate SKU for a variant
 * Format: {productSlug}-{size}
 * Example: "custom-tee-M"
 */
export function generateVariantSKU(
  productSlug: string,
  size: Size
): string {
  return `${productSlug}-${size}`.toUpperCase();
}

/**
 * Calculate final price for a product with color variant, size variant, and patches
 */
export function calculateFinalPrice(
  basePrice: number, // in cents
  colorPriceDiff: number, // in cents
  sizePriceDiff: number, // in cents
  patchPrices: number[] // array of patch prices in cents
): number {
  return basePrice + colorPriceDiff + sizePriceDiff + patchPrices.reduce((sum, price) => sum + price, 0);
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use calculateFinalPrice with colorPriceDiff and sizePriceDiff
 */
export function calculateFinalPriceLegacy(
  basePrice: number,
  variantPriceDiff: number,
  patchPrices: number[]
): number {
  return calculateFinalPrice(basePrice, 0, variantPriceDiff, patchPrices);
}

/**
 * Format price from cents to dollars
 */
export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

