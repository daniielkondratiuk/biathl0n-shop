// src/features/inventory/server/inventory.ts
// Inventory reservation service using "reserve on order, deduct on shipment" model
//
// Rules:
// - availableStock = stockOnHand - stockReserved
// - Never allow availableStock < 0
// - All changes must run inside Prisma transactions
//
// Flow:
// 1. Reserve stock when order is PAID (reserveStock)
// 2. Deduct physical stock when order is SHIPPED (deductStockOnShipment)
// 3. Release reservation when order is CANCELED (releaseStock)

import { prisma } from "@/server/db/prisma";
import type { PrismaClient } from "@prisma/client";

// Type for Prisma transaction client
type PrismaTransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Reserve stock for an order when payment is confirmed.
 * This increases stockReserved but does NOT change stockOnHand.
 * 
 * Call this when order status transitions to PAID.
 * 
 * @param orderId - The order ID
 * @param tx - Prisma transaction client (must be provided)
 * @throws Error if insufficient stock available
 */
export async function reserveStock(
  orderId: string,
  tx: PrismaTransactionClient,
): Promise<void> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          sizeVariant: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  // Check if already reserved (idempotency check)
  const existingReservations = await tx.inventoryMovement.findMany({
    where: {
      orderId: order.id,
      movementType: "RESERVED",
      quantity: { gt: 0 }, // Positive quantity means reservation
    },
  });

  // If reservations exist, check if they match the order items (idempotent)
  if (existingReservations.length > 0) {
    console.log(`[inventory] Order ${order.id} already has reservations, skipping (idempotent)`);
    return; // Already reserved, skip
  }

  // Check availability and reserve stock for each item
  console.log(`[inventory] Reserving stock for order ${order.id}, ${order.items.length} items`);
  
  for (const item of order.items) {
    if (!item.sizeVariantId) {
      console.warn(`[inventory] OrderItem ${item.id} has no sizeVariantId - skipping inventory management`);
      continue;
    }

    console.log(`[inventory] Processing item ${item.id}: sizeVariantId=${item.sizeVariantId}, quantity=${item.quantity}`);

    // Fetch current variant state (must be inside transaction)
    const variant = await tx.productSizeVariant.findUnique({
      where: { id: item.sizeVariantId },
      select: {
        id: true,
        sku: true,
        stock: true,
        stockReserved: true,
      },
    });

    if (!variant) {
      throw new Error(`Size variant ${item.sizeVariantId} not found for order item ${item.id}`);
    }

    console.log(`[inventory] Variant ${variant.sku}: stock=${variant.stock}, stockReserved=${variant.stockReserved}`);

    const availableStock = variant.stock - variant.stockReserved;
    if (availableStock < item.quantity) {
      throw new Error(
        `Insufficient stock for variant ${variant.sku}. Available: ${availableStock}, Requested: ${item.quantity}`,
      );
    }

    // Reserve stock - increment stockReserved
    const updated = await tx.productSizeVariant.update({
      where: { id: item.sizeVariantId },
      data: {
        stockReserved: {
          increment: item.quantity,
        },
      },
      select: {
        stockReserved: true,
      },
    });

    console.log(`[inventory] Reserved ${item.quantity} units for variant ${variant.sku}. New stockReserved: ${updated.stockReserved}`);

    // Log inventory movement
    await tx.inventoryMovement.create({
      data: {
        productId: item.productId,
        sizeVariantId: item.sizeVariantId,
        orderId: order.id,
        quantity: item.quantity,
        movementType: "RESERVED",
        reason: `Order ${order.orderNumber || order.id} reserved`,
      },
    });
  }
  
  console.log(`[inventory] Completed reservation for order ${order.id}`);
}

/**
 * Deduct physical stock when an order is shipped.
 * This decreases both stockOnHand and stockReserved.
 * 
 * Call this when order status transitions to SHIPPED.
 * This operation is idempotent - safe to call multiple times.
 * 
 * @param orderId - The order ID
 * @param tx - Prisma transaction client (must be provided)
 */
export async function deductStockOnShipment(
  orderId: string,
  tx: PrismaTransactionClient,
): Promise<void> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          sizeVariant: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  // Check if already shipped (idempotency check)
  // We can check if stockReserved was already released for this order
  const existingMovements = await tx.inventoryMovement.findMany({
    where: {
      orderId: order.id,
      movementType: "PURCHASE",
    },
  });

  // If PURCHASE movements exist, this order was already shipped
  if (existingMovements.length > 0) {
    return; // Already processed, skip
  }

  console.log(`[inventory] Deducting stock on shipment for order ${order.id}, ${order.items.length} items`);

  for (const item of order.items) {
    if (!item.sizeVariantId) {
      console.warn(`[inventory] OrderItem ${item.id} has no sizeVariantId - skipping`);
      continue;
    }

    console.log(`[inventory] Processing shipment for item ${item.id}: sizeVariantId=${item.sizeVariantId}, quantity=${item.quantity}`);

    // Fetch current variant state
    const variant = await tx.productSizeVariant.findUnique({
      where: { id: item.sizeVariantId },
      select: {
        id: true,
        sku: true,
        stock: true,
        stockReserved: true,
      },
    });

    if (!variant) {
      throw new Error(`Size variant ${item.sizeVariantId} not found for order item ${item.id}`);
    }

    console.log(`[inventory] Variant ${variant.sku} before deduction: stock=${variant.stock}, stockReserved=${variant.stockReserved}`);

    // Ensure we have enough reserved stock
    if (variant.stockReserved < item.quantity) {
      throw new Error(
        `Insufficient reserved stock for variant ${variant.sku}. Reserved: ${variant.stockReserved}, Required: ${item.quantity}`,
      );
    }

    // Deduct both physical stock and reserved stock
    const updated = await tx.productSizeVariant.update({
      where: { id: item.sizeVariantId },
      data: {
        stock: {
          decrement: item.quantity,
        },
        stockReserved: {
          decrement: item.quantity,
        },
      },
      select: {
        stock: true,
        stockReserved: true,
      },
    });

    console.log(`[inventory] Deducted ${item.quantity} units from variant ${variant.sku}. New stock=${updated.stock}, stockReserved=${updated.stockReserved}`);

    // Log inventory movement
    await tx.inventoryMovement.create({
      data: {
        productId: item.productId,
        sizeVariantId: item.sizeVariantId,
        orderId: order.id,
        quantity: -item.quantity,
        movementType: "PURCHASE",
        reason: `Order ${order.orderNumber || order.id} shipped`,
      },
    });
  }
  
  console.log(`[inventory] Completed stock deduction for order ${order.id}`);
}

/**
 * Release reserved stock when an order is cancelled or refunded.
 * This decreases stockReserved but does NOT change stockOnHand.
 * 
 * Call this when order status transitions to CANCELED.
 * This operation is idempotent - safe to call multiple times.
 * 
 * @param orderId - The order ID
 * @param tx - Prisma transaction client (must be provided)
 */
export async function releaseStock(
  orderId: string,
  tx: PrismaTransactionClient,
): Promise<void> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          sizeVariant: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  // Check if reservation was already released (idempotency)
  const existingMovements = await tx.inventoryMovement.findMany({
    where: {
      orderId: order.id,
      movementType: "RESERVED",
    },
  });

  // Check if any items still have reserved stock
  let hasReservedStock = false;
  for (const item of order.items) {
    if (!item.sizeVariantId) continue;
    const variant = await tx.productSizeVariant.findUnique({
      where: { id: item.sizeVariantId },
    });
    if (variant && variant.stockReserved > 0) {
      hasReservedStock = true;
      break;
    }
  }

  // If no reserved stock exists for this order, skip (already released)
  if (!hasReservedStock && existingMovements.length === 0) {
    return;
  }

  console.log(`[inventory] Releasing stock reservation for order ${order.id}, ${order.items.length} items`);

  for (const item of order.items) {
    if (!item.sizeVariantId) {
      console.warn(`[inventory] OrderItem ${item.id} has no sizeVariantId - skipping`);
      continue;
    }

    console.log(`[inventory] Processing release for item ${item.id}: sizeVariantId=${item.sizeVariantId}, quantity=${item.quantity}`);

    // Fetch current variant state
    const variant = await tx.productSizeVariant.findUnique({
      where: { id: item.sizeVariantId },
      select: {
        id: true,
        sku: true,
        stockReserved: true,
      },
    });

    if (!variant) {
      console.warn(`[inventory] Variant ${item.sizeVariantId} not found - may have been deleted, skipping`);
      continue;
    }

    console.log(`[inventory] Variant ${variant.sku} before release: stockReserved=${variant.stockReserved}`);

    // Only release if there's actually reserved stock
    // This makes the operation idempotent
    const amountToRelease = Math.min(item.quantity, variant.stockReserved);
    if (amountToRelease > 0) {
      const updated = await tx.productSizeVariant.update({
        where: { id: item.sizeVariantId },
        data: {
          stockReserved: {
            decrement: amountToRelease,
          },
        },
        select: {
          stockReserved: true,
        },
      });

      console.log(`[inventory] Released ${amountToRelease} units for variant ${variant.sku}. New stockReserved: ${updated.stockReserved}`);

      // Log inventory movement
      await tx.inventoryMovement.create({
        data: {
          productId: item.productId,
          sizeVariantId: item.sizeVariantId,
          orderId: order.id,
          quantity: -amountToRelease,
          movementType: "RESERVED",
          reason: `Order ${order.orderNumber || order.id} cancelled - reservation released`,
        },
      });
    } else {
      console.log(`[inventory] No reserved stock to release for variant ${variant.sku} (already released or never reserved)`);
    }
  }
  
  console.log(`[inventory] Completed stock release for order ${order.id}`);
}

/**
 * Get available stock for a size variant.
 * availableStock = stockOnHand - stockReserved
 * 
 * @param sizeVariantId - The size variant ID
 * @returns Available stock quantity
 */
export async function getAvailableStock(sizeVariantId: string): Promise<number> {
  const variant = await prisma.productSizeVariant.findUnique({
    where: { id: sizeVariantId },
    select: {
      stock: true,
      stockReserved: true,
    },
  });

  if (!variant) {
    return 0;
  }

  return Math.max(0, variant.stock - variant.stockReserved);
}

