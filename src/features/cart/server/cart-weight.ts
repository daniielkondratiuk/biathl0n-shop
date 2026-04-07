// src/features/cart/server/cart-weight.ts
/**
 * Server-side helper to compute total cart weight in grams
 */

import { getCartForIdentifiers } from "@/features/cart";

// TODO: Replace with real weight fields from Prisma schema (product.weightGrams, sizeVariant.weightGrams)
// This is a temporary fallback ONLY used when weight data is not available in the database
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
    // Try to get weight from sizeVariant (if weightGrams field exists in future)
    // For now, use fallback since schema doesn't have weightGrams yet
    const itemWeightGrams = FALLBACK_WEIGHT_GRAMS_PER_ITEM;
    totalGrams += itemWeightGrams * item.quantity;
  }

  return totalGrams;
}
