// lib/utils/sku-generator.ts

/**
 * Generate SKU for a size variant
 * Format: {productSlug}-{colorSlug}-{size}
 * Example: "classic-hoodie-red-m"
 */
export function generateSizeVariantSKU(
  productSlug: string,
  colorSlug: string,
  size: string
): string {
  return `${productSlug}-${colorSlug}-${size.toLowerCase()}`;
}

/**
 * Calculate final price for a product with color and size variants
 */
export function calculateFinalPrice(
  basePrice: number, // in cents
  colorPriceDiff: number, // in cents
  sizePriceDiff: number, // in cents
  patchPrices: number[] // array of patch prices in cents
): number {
  return basePrice + colorPriceDiff + sizePriceDiff + patchPrices.reduce((sum, price) => sum + price, 0);
}

