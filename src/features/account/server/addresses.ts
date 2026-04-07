import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import type { Address } from "./customer-profile";

const addressSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(3),
  line1: z.string().min(1),
  line2: z.string().optional().nullable(),
  city: z.string().min(1),
  state: z.string().optional().nullable(),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  isPrimary: z.boolean().optional(),
});

export interface CreateAddressError {
  status: number;
  body: {
    error: string;
    details?: unknown;
  };
}

/**
 * Create a new address for a user
 */
export async function createAddress(
  userId: string,
  input: unknown
): Promise<{ address: Address } | CreateAddressError> {
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        error: "Invalid input",
        details: parsed.error.flatten(),
      },
    };
  }

  const address = await prisma.$transaction(async (tx) => {
    // If this is being set as primary, unset any existing primary address
    if (parsed.data.isPrimary) {
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
    }

    return tx.address.create({
      data: {
        userId,
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        line1: parsed.data.line1,
        line2: parsed.data.line2 ?? null,
        city: parsed.data.city,
        state: parsed.data.state ?? null,
        postalCode: parsed.data.postalCode,
        country: parsed.data.country,
        isPrimary: parsed.data.isPrimary ?? false,
      },
    });
  });

  return { address };
}

/**
 * Delete an address (only if it's not linked to an order)
 */
export async function deleteAddress(userId: string, addressId: string): Promise<{ success: true }> {
  const address = await prisma.address.findFirst({
    where: {
      id: addressId,
      userId,
      orderId: null, // Can't delete order-linked addresses
    },
  });

  if (!address) {
    throw new Error("Address not found or cannot be deleted");
  }

  await prisma.address.delete({
    where: { id: addressId },
  });

  return { success: true };
}
