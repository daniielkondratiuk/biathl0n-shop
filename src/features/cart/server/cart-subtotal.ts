// src/features/cart/server/cart-subtotal.ts
/**
 * Server-side helper to compute cart subtotal in cents
 */

import { getCartForIdentifiers } from "@/features/cart";

/**
 * Compute cart subtotal in cents (sum of all item unitPrice * quantity)
 */
export async function getCartSubtotalCents(params: {
  userId?: string | null;
  anonymousToken?: string | null;
}): Promise<number> {
  const cart = await getCartForIdentifiers(params);
  
  if (!cart || cart.items.length === 0) {
    return 0;
  }

  return cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}
