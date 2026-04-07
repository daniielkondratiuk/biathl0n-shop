// src/features/orders/server/order-number.ts
import { prisma } from "@/server/db/prisma";

/**
 * Generates a sequential order number in the format UFO-000001
 * Uses PostgreSQL advisory locks to ensure uniqueness under concurrency.
 */
export async function generateOrderNumber(): Promise<string> {
  // Use a transaction with advisory lock to ensure atomic sequential generation
  return await prisma.$transaction(async (tx) => {
    // Acquire advisory lock (key 424242) - this blocks other concurrent calls
    // until this transaction completes, ensuring sequential numbering
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(424242)`;

    // Query the max existing numeric suffix from orders with UFO- prefix
    // Extract numeric part from orderNumber LIKE 'UFO-%'
    const result = await tx.$queryRaw<Array<{ max_num: bigint | null }>>`
      SELECT MAX(
        CAST(
          SUBSTRING("orderNumber" FROM '^UFO-([0-9]+)$') AS INTEGER
        )
      ) as max_num
      FROM "Order"
      WHERE "orderNumber" LIKE 'UFO-%'
    `;

    const maxNum = result[0]?.max_num;
    const nextNumber = maxNum ? Number(maxNum) + 1 : 1;

    // Format as UFO-000001 (6 digits zero-padded)
    return `UFO-${String(nextNumber).padStart(6, "0")}`;
  });
}

/**
 * Ensures an order has an orderNumber. Generates one if missing.
 * Idempotent and collision-safe with retry logic.
 */
export async function ensureOrderNumber(orderId: string): Promise<string> {
  // First check: if order already has orderNumber, return it (idempotent)
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true },
  });

  if (order?.orderNumber) {
    return order.orderNumber;
  }

  // Try to assign a generated number with collision handling
  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const orderNumber = await generateOrderNumber();

    try {
      // Use updateMany with where { id, orderNumber: null } to avoid race conditions
      // Only update if orderNumber is still null (atomic check-and-set)
      const result = await prisma.order.updateMany({
        where: {
          id: orderId,
          orderNumber: null,
        },
        data: { orderNumber },
      });

      // If update succeeded (count > 0), return the assigned number
      if (result.count > 0) {
        return orderNumber;
      }

      // If updateMany count is 0, another process already assigned a number
      // Re-fetch the order and return the existing orderNumber
      const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { orderNumber: true },
      });

      if (updatedOrder?.orderNumber) {
        return updatedOrder.orderNumber;
      }

      // If still null (shouldn't happen), retry with a new number
    } catch (error: unknown) {
      // Handle Prisma unique constraint error (P2002)
      const prismaErr = error as { code?: string; meta?: { target?: string[] } };
      if (prismaErr.code === "P2002" && prismaErr.meta?.target?.includes("orderNumber")) {
        // Collision detected: another order got this number first
        // Generate a new number and retry
        if (attempt < maxAttempts - 1) {
          continue; // Retry with new number
        }
        // Max attempts reached, throw error
        throw new Error(
          `Failed to assign order number after ${maxAttempts} attempts due to collisions`
        );
      }
      // Re-throw other errors
      throw error;
    }
  }

  // Fallback: re-fetch one more time in case of edge case
  const finalOrder = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true },
  });

  if (finalOrder?.orderNumber) {
    return finalOrder.orderNumber;
  }

  throw new Error(`Failed to assign order number for order ${orderId}`);
}

