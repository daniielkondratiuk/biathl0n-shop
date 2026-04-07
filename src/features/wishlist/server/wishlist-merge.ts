import { getUserWishlist, addToWishlist } from "./wishlist";

/**
 * Merge guest wishlist into user wishlist on login
 */
export async function mergeGuestWishlistIntoUser(
  userId: string,
  guestItems: Array<{
    productId: string;
    colorVariantId?: string | null;
    sizeVariantId?: string | null;
  }>,
) {
  for (const item of guestItems) {
    try {
      await addToWishlist(userId, item.productId, item.colorVariantId, item.sizeVariantId);
    } catch {
      // Skip duplicates or invalid items silently
    }
  }

  return getUserWishlist(userId);
}

export async function mergeWishlist(
  userId: string,
  items: Array<{
    productId: string;
    colorVariantId?: string | null;
    sizeVariantId?: string | null;
  }>
) {
  const wishlist = await mergeGuestWishlistIntoUser(userId, items);
  
  return {
    items: wishlist.map(item => ({
      id: item.id,
      productId: item.productId,
      colorVariantId: item.colorVariantId,
      sizeVariantId: item.sizeVariantId,
      createdAt: item.createdAt,
    })),
  };
}
