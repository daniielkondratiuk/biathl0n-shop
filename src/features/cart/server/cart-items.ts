import { prisma } from "@/server/db/prisma";
import { getOrCreateCart } from "./cart";

export async function addItemToCart(params: {
  userId?: string | null;
  anonymousToken?: string | null;
  productId: string;
  colorVariantId?: string | null;
  sizeVariantId?: string | null;
  selectedPatchIds?: string[];
  quantity: number;
}) {
  const { productId, colorVariantId, sizeVariantId, selectedPatchIds = [], quantity } = params;
  const cart = await getOrCreateCart(params);

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
    throw new Error("Product not found");
  }

  const sizeVariant = sizeVariantId
    ? await prisma.productSizeVariant.findUnique({
        where: { id: sizeVariantId },
        include: {
          colorVariant: true,
        },
      })
    : null;

  // Validate colorVariantId if provided
  if (colorVariantId && sizeVariant && sizeVariant.colorVariantId !== colorVariantId) {
    throw new Error("Size variant does not belong to the specified color variant");
  }

  // Calculate price: basePrice + colorVariant.priceDiff + sizeVariant.priceDiff + sum of patch prices
  const basePrice = product.basePrice || product.price || 0;
  const colorPriceDiff = sizeVariant?.colorVariant.priceDiff || 0;
  const sizePriceDiff = sizeVariant?.priceDiff || 0;
  const patchPrices = product.patches.map((pp) => pp.patch.price);
  const totalPatchPrice = patchPrices.reduce((sum, price) => sum + price, 0);
  const unitPrice = basePrice + colorPriceDiff + sizePriceDiff + totalPatchPrice;
  const finalPrice = unitPrice * quantity;

  // Check if item with same product, size variant, and patches already exists
  // For matching, we use productId, sizeVariantId, and selectedPatchIds
  const existingItem = cart.items.find(
    (item) =>
      item.productId === productId &&
      (sizeVariantId ? item.sizeVariantId === sizeVariantId : item.sizeVariantId === null) &&
      JSON.stringify((item.selectedPatchIds || []).sort()) === JSON.stringify(selectedPatchIds.sort()),
  );

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: {
        quantity: existingItem.quantity + quantity,
        finalPrice: unitPrice * (existingItem.quantity + quantity),
      },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        sizeVariantId: sizeVariantId ?? null,
        selectedPatchIds,
        quantity,
        unitPrice,
        finalPrice,
      },
    });
  }

  return getOrCreateCart(params);
}

export async function addCartItem(
  userId: string,
  data: {
    productId: string;
    colorVariantId?: string | null;
    sizeVariantId?: string | null;
    selectedPatchIds?: string[];
    quantity?: number;
  }
) {
  if (!data.productId) {
    throw new Error("productId is required");
  }

  if (!data.sizeVariantId) {
    throw new Error("sizeVariantId is required");
  }

  const safeQuantity = data.quantity && data.quantity > 0 ? data.quantity : 1;

  const cart = await addItemToCart({
    userId,
    anonymousToken: null,
    productId: data.productId,
    colorVariantId: data.colorVariantId || null,
    sizeVariantId: data.sizeVariantId,
    selectedPatchIds: data.selectedPatchIds || [],
    quantity: safeQuantity,
  });

  return { cart };
}

export async function updateCartItemQuantity(params: {
  cartItemId: string;
  quantity: number;
}) {
  if (!params.cartItemId) {
    throw new Error("Cart item ID is required");
  }

  if (params.quantity <= 0) {
    await prisma.cartItem.delete({
      where: { id: params.cartItemId },
    });
  } else {
    const item = await prisma.cartItem.findUnique({
      where: { id: params.cartItemId },
    });
    if (!item) {
      throw new Error("Cart item not found");
    }
    await prisma.cartItem.update({
      where: { id: params.cartItemId },
      data: { 
        quantity: params.quantity,
        finalPrice: item.unitPrice * params.quantity,
      },
    });
  }
}

export async function removeCartItem(params: { cartItemId: string }) {
  if (!params.cartItemId) {
    throw new Error("Cart item ID is required");
  }

  const item = await prisma.cartItem.findUnique({
    where: { id: params.cartItemId },
  });

  if (!item) {
    throw new Error("Cart item not found");
  }

  await prisma.cartItem.delete({
    where: { id: params.cartItemId },
  });
}
