import { prisma } from "@/server/db/prisma";
import { unstable_cache } from "next/cache";

/**
 * Get user's wishlist with full product and color variant data
 */
export async function getUserWishlist(userId: string) {
  const getUserWishlistCached = unstable_cache(
    async () =>
      prisma.wishlistItem.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          category: true,
          colorVariants: {
            where: { isActive: true },
            include: {
              color: {
                select: {
                  id: true,
                  name: true,
                  nameFr: true,
                  hex: true,
                },
              },
              images: {
                select: {
                  id: true,
                  url: true,
                  role: true,
                  order: true,
                },
                orderBy: [{ role: "asc" }, { order: "asc" }],
              },
              sizes: {
                select: {
                  id: true,
                  size: true,
                  stock: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
      }),
    ["wishlist", userId],
    {
      revalidate: 120,
      tags: [`wishlist:${userId}`],
    }
  );

  return getUserWishlistCached();
}

/**
 * Add item to wishlist
 * Unique key: productId + colorVariantId
 */
export async function addToWishlist(
  userId: string,
  productId: string,
  colorVariantId?: string | null,
  sizeVariantId?: string | null,
) {
  // Check if already exists
  const existing = await prisma.wishlistItem.findFirst({
    where: {
      userId,
      productId,
      colorVariantId: colorVariantId || null,
      sizeVariantId: sizeVariantId || null,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.wishlistItem.create({
    data: {
      userId,
      productId,
      colorVariantId: colorVariantId || null,
      sizeVariantId: sizeVariantId || null,
    },
  });
}

/**
 * Remove item from wishlist
 */
export async function removeFromWishlist(
  userId: string,
  productId: string,
  colorVariantId?: string | null,
  sizeVariantId?: string | null,
) {
  return prisma.wishlistItem.deleteMany({
    where: {
      userId,
      productId,
      colorVariantId: colorVariantId || null,
      sizeVariantId: sizeVariantId || null,
    },
  });
}
