import { prisma } from "@/server/db/prisma";
import { getOrCreateCart } from "./cart";

export type GuestCartItem = {
  productId: string;
  colorVariantId: string;
  sizeVariantId: string;
  quantity: number;
};

export async function mergeGuestCartIntoUserCart(params: {
  userId: string;
  guestItems: GuestCartItem[];
}) {
  const { userId, guestItems } = params;
  const cart = await getOrCreateCart({ userId });

  for (const guestItem of guestItems) {
    const { productId, sizeVariantId, quantity } = guestItem;
    const selectedPatchIds: string[] = []; // Guest cart items don't have patches

    // Validate sizeVariantId belongs to colorVariantId
    if (sizeVariantId) {
      const sizeVariant = await prisma.productSizeVariant.findUnique({
        where: { id: sizeVariantId },
        include: { colorVariant: true },
      });

      if (!sizeVariant || sizeVariant.colorVariantId !== guestItem.colorVariantId) {
        console.warn(`Skipping invalid guest item: sizeVariant ${sizeVariantId} does not belong to colorVariant ${guestItem.colorVariantId}`);
        continue;
      }
    }

    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true },
      include: {
        patches: {
          where: { patchId: { in: selectedPatchIds } },
          include: { patch: true },
        },
      },
    });

    if (!product) {
      console.warn(`Skipping invalid guest item: product ${productId} not found`);
      continue;
    }

    const sizeVariant = sizeVariantId
      ? await prisma.productSizeVariant.findUnique({
          where: { id: sizeVariantId },
          include: { colorVariant: true },
        })
      : null;

    // Calculate price
    const basePrice = product.basePrice || product.price || 0;
    const colorPriceDiff = sizeVariant?.colorVariant.priceDiff || 0;
    const sizePriceDiff = sizeVariant?.priceDiff || 0;
    const patchPrices = product.patches.map((pp) => pp.patch.price);
    const totalPatchPrice = patchPrices.reduce((sum, price) => sum + price, 0);
    const unitPrice = basePrice + colorPriceDiff + sizePriceDiff + totalPatchPrice;

    // Check if item already exists
    const existingItem = cart.items.find(
      (item) =>
        item.productId === productId &&
        (sizeVariantId ? item.sizeVariantId === sizeVariantId : item.sizeVariantId === null) &&
        JSON.stringify((item.selectedPatchIds || []).sort()) === JSON.stringify(selectedPatchIds.sort()),
    );

    if (existingItem) {
      // Merge quantities
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
          finalPrice: unitPrice * (existingItem.quantity + quantity),
        },
      });
    } else {
      // Create new item
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          sizeVariantId: sizeVariantId ?? null,
          selectedPatchIds,
          quantity,
          unitPrice,
          finalPrice: unitPrice * quantity,
        },
      });
    }
  }

  return getOrCreateCart({ userId });
}

export async function mergeCart(
  userId: string,
  guestItems: GuestCartItem[]
) {
  if (!Array.isArray(guestItems)) {
    throw new Error("guestItems must be an array");
  }

  const cart = await mergeGuestCartIntoUserCart({
    userId,
    guestItems,
  });

  return { cart };
}
