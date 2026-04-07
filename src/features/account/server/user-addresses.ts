import { prisma } from "@/server/db/prisma";
import type { Address } from "./customer-profile";

/**
 * Get all saved addresses for a user (excluding order-linked addresses)
 */
export async function getUserAddresses(userId: string): Promise<Address[]> {
  return prisma.address.findMany({
    where: {
      userId,
      orderId: null, // Only get saved addresses
    },
    orderBy: [
      { isPrimary: "desc" },
      { createdAt: "desc" },
    ],
  });
}

export type { Address };
