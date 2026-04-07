import { prisma } from "@/server/db/prisma";

export type ResolvedCartItem = {
  id: string;
  productId: string;
  title: string;
  slug: string;
  categoryName?: string;
  colorName: string;
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

export type ResolveCartHandlerInput = {
  userId?: string | null;
  anonymousToken?: string | null;
  items: Array<{
    id: string;
    productId: string;
    colorVariantId: string;
    sizeVariantId: string;
    quantity: number;
    unitPrice?: number;
    finalPrice?: number;
    selectedPatchIds?: string[];
  }>;
};

export async function resolveCartHandler(
  input: ResolveCartHandlerInput
): Promise<{ status: number; body: { error?: string; resolvedItems?: ResolvedCartItem[] } }> {
  const { items } = input;

  if (!Array.isArray(items)) {
    return {
      status: 400,
      body: { error: "items must be an array" },
    };
  }

  const resolvedItems: ResolvedCartItem[] = [];

  for (const item of items) {
    try {
      // Fetch product with category
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          category: true,
          patches: item.selectedPatchIds && item.selectedPatchIds.length > 0
            ? {
                where: { patchId: { in: item.selectedPatchIds } },
                include: { patch: true },
              }
            : false,
        },
      });

      if (!product) {
        console.warn(`Product ${item.productId} not found, skipping cart item`);
        continue;
      }

      // Fetch size variant with color variant
      const sizeVariant = item.sizeVariantId
        ? await prisma.productSizeVariant.findUnique({
            where: { id: item.sizeVariantId },
            include: {
              colorVariant: {
                include: {
                  color: true,
                  images: {
                    where: { role: "MAIN" },
                    take: 1,
                    orderBy: { order: "asc" },
                  },
                },
              },
            },
          })
        : null;

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
        const patchPrices = ((product as unknown as { patches?: Array<{ patch: { price: number } }> }).patches || []).map((pp) => pp.patch.price);
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
    } catch (error) {
      console.error(`Error resolving cart item ${item.id}:`, error);
      // Continue with other items
    }
  }

  return {
    status: 200,
    body: { resolvedItems },
  };
}

