// src/features/cart/server/cart-weight.ts
/**
 * Server-side helper to compute total cart weight in grams
 */

import { getCartForIdentifiers } from "@/features/cart";

// Fallback used only when a product has no weightGrams set.
// (A future refinement could add a per-size weight on ProductSizeVariant.)
export const FALLBACK_WEIGHT_GRAMS_PER_ITEM = 250;

/**
 * Compute total cart weight in grams
 * Priority: sizeVariant.weightGrams > product.weightGrams > fallback
 */
export async function getCartTotalWeightGrams(params: {
  userId?: string | null;
  anonymousToken?: string | null;
}): Promise<number> {
  const cart = await getCartForIdentifiers(params);
  
  if (!cart || cart.items.length === 0) {
    return 0;
  }

  let totalGrams = 0;

  for (const item of cart.items) {
    // Use the product's real weight when set, otherwise the shared fallback.
    const productWeight = item.product?.weightGrams;
    const itemWeightGrams =
      typeof productWeight === "number" && productWeight > 0
        ? productWeight
        : FALLBACK_WEIGHT_GRAMS_PER_ITEM;
    totalGrams += itemWeightGrams * item.quantity;
  }

  return totalGrams;
}
