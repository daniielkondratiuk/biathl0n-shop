import { prisma } from "@/server/db/prisma";

type WishlistResolvedItem = {
  id: string;
  productId: string;
  title: string | null;
  slug: string;
  categoryName: string;
  basePrice: number;
  badge: string | null;
  imageUrl: string | null;
  colorVariantId: string | null;
  sizeVariantId: string | null;
  colorName: string | null;
  colorHex: string | null;
  sizeLabel: string | null;
  colorVariants: Array<{
    id: string;
    color: { id: string; name: string; nameFr: string | null; hex: string } | null;
  }>;
  product: Record<string, unknown>;
};

/**
 * Resolve wishlist items with full product data
 * Returns images from the selected colorVariant only
 */
export async function resolveWishlistItems(
  items: Array<{
    productId: string;
    colorVariantId?: string | null;
    sizeVariantId?: string | null;
  }>,
) {
  const productIds = [...new Set(items.map(i => i.productId))];
  
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
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
  });

  const resolved: WishlistResolvedItem[] = [];

  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    if (!product) continue;

    // Find the selected color variant (required for correct images)
    const selectedColorVariant = item.colorVariantId
      ? product.colorVariants.find(cv => cv.id === item.colorVariantId)
      : product.colorVariants[0];

    if (!selectedColorVariant) continue;

    const sizeVariant = item.sizeVariantId
      ? selectedColorVariant.sizes.find(s => s.id === item.sizeVariantId)
      : null;

    // Get ONLY MAIN image from the selected color variant (no hover swapping)
    const mainImage = selectedColorVariant.images.find(img => img.role === "MAIN");
    const imageUrl = mainImage?.url || selectedColorVariant.images[0]?.url || null;

    resolved.push({
      id: `${item.productId}:${item.colorVariantId || "none"}:${item.sizeVariantId || "none"}`,
      productId: product.id,
      title: product.title || product.name,
      slug: product.slug,
      categoryName: product.category.name,
      basePrice: product.basePrice || product.price || 0,
      badge: product.badge,
      imageUrl,
      colorVariantId: item.colorVariantId || null,
      sizeVariantId: item.sizeVariantId || null,
      colorName: selectedColorVariant.color.name || null,
      colorHex: selectedColorVariant.color.hex || null,
      sizeLabel: sizeVariant ? sizeVariant.size : null,
      colorVariants: product.colorVariants.map(cv => ({
        id: cv.id,
        color: cv.color ? {
          id: cv.color.id,
          name: cv.color.name,
          nameFr: cv.color.nameFr ?? null,
          hex: cv.color.hex,
        } : null,
      })),
      product,
    });
  }

  return resolved;
}

export async function resolveWishlist(
  items: Array<{
    productId: string;
    colorVariantId?: string | null;
    sizeVariantId?: string | null;
  }>
) {
  const resolved = await resolveWishlistItems(items);
  return { items: resolved };
}
