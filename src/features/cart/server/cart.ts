import type { Cart, CartItem, ProductSizeVariant, Product } from "@/shared/types/prisma";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

type ResolveProduct = {
  title?: string | null;
  name: string;
  slug: string;
  basePrice?: number | null;
  price?: number | null;
  badge?: string | null;
  category?: { name: string } | null;
  patches?: Array<{ patch: { price: number } }>;
};

type ResolveSizeVariant = {
  id: string;
  size: string;
  priceDiff: number | null;
  colorVariant: {
    id: string;
    priceDiff: number | null;
    color: { name: string; nameFr?: string | null; hex: string };
    images?: Array<{ url: string }>;
  };
};

export type CartWithItems = Cart & {
  items: (CartItem & {
    product: Product;
    sizeVariant: ProductSizeVariant | null;
  })[];
};

export type ResolvedCartItem = {
  id: string;
  productId: string;
  title: string;
  slug: string;
  categoryName?: string;
  colorName: string;
  colorNameFr?: string | null;
  colorHex: string;
  colorVariantId: string;
  sizeLabel: string;
  sizeVariantId: string;
  quantity: number;
  unitPrice: number; // in cents
  totalPrice: number; // in cents (unitPrice * quantity)
  imageUrl: string | null; // MAIN image for this color
  badge?: string | null; // Product badge
  selectedPatchIds?: string[];
};

export async function getCartForIdentifiers(params: {
  userId?: string | null;
  anonymousToken?: string | null;
}) {
  const { userId, anonymousToken } = params;

  const where: Prisma.CartWhereInput = {};
  if (userId) {
    where.userId = userId;
  } else if (anonymousToken) {
    where.anonymousToken = anonymousToken;
  } else {
    return null;
  }

  return prisma.cart.findFirst({
    where,
    include: {
      items: {
        include: {
          product: {
            include: {
              category: true,
            },
          },
          sizeVariant: {
            include: {
              colorVariant: {
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
                    where: { role: "MAIN" },
                    take: 1,
                    orderBy: { order: "asc" },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function getOrCreateCart(params: {
  userId?: string | null;
  anonymousToken?: string | null;
}): Promise<CartWithItems> {
  const existing = await getCartForIdentifiers(params);
  if (existing) return existing;

  const data: { userId?: string; anonymousToken?: string } = {};
  if (params.userId) {
    data.userId = params.userId;
  } else if (params.anonymousToken) {
    data.anonymousToken = params.anonymousToken;
  }

  const cart = await prisma.cart.create({
    data,
    include: {
      items: {
        include: {
          product: {
            include: {
              category: true,
            },
          },
          sizeVariant: {
            include: {
              colorVariant: {
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
                    where: { role: "MAIN" },
                    take: 1,
                    orderBy: { order: "asc" },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return cart;
}

export async function resolveCartItems(
  items: Array<{
    id: string;
    productId: string;
    sizeVariantId: string | null;
    quantity: number;
    unitPrice?: number;
    finalPrice?: number;
    selectedPatchIds?: string[];
    product?: ResolveProduct | null;
    sizeVariant?: ResolveSizeVariant | null;
  }>
): Promise<ResolvedCartItem[]> {
  const resolvedItems: ResolvedCartItem[] = [];

  for (const item of items) {
    // If we already have product and sizeVariant from includes, use them
    let product = item.product;
    let sizeVariant = item.sizeVariant;

    // Otherwise, fetch them
    if (!product) {
      product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { 
          category: true,
          patches: {
            where: { patchId: { in: item.selectedPatchIds || [] } },
            include: { patch: true },
          },
        },
      });
    }

    if (!product) {
      console.warn(`Product ${item.productId} not found, skipping cart item`);
      continue;
    }

    if (item.sizeVariantId && !sizeVariant) {
      sizeVariant = await prisma.productSizeVariant.findUnique({
        where: { id: item.sizeVariantId },
        include: {
          colorVariant: {
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
                where: { role: "MAIN" },
                take: 1,
                orderBy: { order: "asc" },
              },
            },
          },
        },
      });
    }

    if (!sizeVariant || !sizeVariant.colorVariant) {
      console.warn(`Size variant ${item.sizeVariantId} not found, skipping cart item`);
      continue;
    }

    const colorVariant = sizeVariant.colorVariant;
    const color = colorVariant.color;
    const mainImage = colorVariant.images?.[0] || null;

    // Calculate unit price if not provided (for guest cart items)
    let unitPrice = item.unitPrice;
    if (!unitPrice) {
      const basePrice = product.basePrice || product.price || 0;
      const colorPriceDiff = colorVariant.priceDiff || 0;
      const sizePriceDiff = sizeVariant.priceDiff || 0;
      const patchPrices = (product.patches || []).map((pp: { patch: { price: number } }) => pp.patch.price);
      const totalPatchPrice = patchPrices.reduce((sum: number, price: number) => sum + price, 0);
      unitPrice = basePrice + colorPriceDiff + sizePriceDiff + totalPatchPrice;
    }

    const safeUnitPrice = unitPrice || 0;
    unitPrice = safeUnitPrice;
    const totalPrice = item.finalPrice || safeUnitPrice * item.quantity;

    resolvedItems.push({
      id: item.id,
      productId: item.productId,
      title: product.title || product.name,
      slug: product.slug,
      categoryName: product.category?.name,
      colorName: color.name,
      colorNameFr: color.nameFr ?? null,
      colorHex: color.hex,
      colorVariantId: colorVariant.id,
      sizeLabel: sizeVariant.size,
      sizeVariantId: sizeVariant.id,
      quantity: item.quantity,
      unitPrice,
      totalPrice,
      imageUrl: mainImage?.url || null,
      badge: product.badge || null,
      selectedPatchIds: item.selectedPatchIds || [],
    });
  }

  return resolvedItems;
}

export async function getCart(userId: string) {
  const cart = await getCartForIdentifiers({
    userId,
    anonymousToken: null,
  });

  if (!cart) {
    return {
      cart: null,
      resolvedItems: [],
    };
  }

  // Resolve cart items with all display data
  const resolvedItems = await resolveCartItems(cart.items);

  return {
    cart,
    resolvedItems,
  };
}
