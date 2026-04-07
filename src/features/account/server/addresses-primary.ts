import { prisma } from "@/server/db/prisma";
import type { Address } from "./customer-profile";

/**
 * Set an address as primary (unsets any existing primary address)
 */
export async function setPrimaryAddress(userId: string, addressId: string): Promise<{ address: Address }> {
  const address = await prisma.$transaction(async (tx) => {
    // First verify the address belongs to the user
    const foundAddress = await tx.address.findFirst({
      where: {
        id: addressId,
        userId,
        orderId: null, // Can't set order-linked addresses as primary
      },
    });

    if (!foundAddress) {
      throw new Error("Address not found or cannot be set as primary");
    }

    // Unset any existing primary address
    await tx.address.updateMany({
      where: {
        userId,
        isPrimary: true,
        orderId: null,
      },
      data: {
        isPrimary: false,
      },
    });

    // Set this address as primary
    return tx.address.update({
      where: { id: addressId },
      data: { isPrimary: true },
    });
  });

  return { address };
}
