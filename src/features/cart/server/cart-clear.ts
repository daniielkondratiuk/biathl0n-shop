import { prisma } from "@/server/db/prisma";
import { getCartForIdentifiers, getOrCreateCart } from "./cart";

export async function clearCart(params: {
  userId?: string | null;
  anonymousToken?: string | null;
}) {
  const cart = await getCartForIdentifiers(params);
  if (cart) {
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
  }
  return getOrCreateCart(params);
}
