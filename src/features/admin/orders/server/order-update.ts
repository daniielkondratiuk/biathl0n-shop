import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@prisma/client";
import { reserveStock, deductStockOnShipment, releaseStock } from "@/features/inventory";
import { createInvoiceForOrder, markInvoicePaid } from "@/features/invoices";

const updateOrderSchema = z.object({
  status: z.enum([
    "PENDING",
    "PAID",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELED",
  ]).optional(),
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
});

export interface UpdateAdminOrderInput {
  status?: "PENDING" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELED";
  trackingNumber?: string;
  carrier?: string;
}

export interface UpdateOrderValidationError {
  status: number;
  body: {
    error: string;
    details: unknown;
  };
}

export function validateUpdateOrderInput(
  input: unknown
): UpdateAdminOrderInput | UpdateOrderValidationError {
  const parsed = updateOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        error: "Invalid input",
        details: parsed.error.flatten(),
      },
    };
  }
  return parsed.data;
}

export async function updateAdminOrder(
  orderId: string,
  input: UpdateAdminOrderInput | UpdateOrderValidationError
) {
  if ("status" in input && typeof input.status === "number") {
    throw new Error("Validation error");
  }
  
  const validatedInput = input as UpdateAdminOrderInput;
  // Get current order to check status transitions
  const currentOrder = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });

  if (!currentOrder) {
    throw new Error("Order not found");
  }

  const updateData: Prisma.OrderUpdateInput = {};
  if (validatedInput.status !== undefined) {
    updateData.status = validatedInput.status;
  }
  if (validatedInput.trackingNumber !== undefined) {
    updateData.trackingNumber = validatedInput.trackingNumber;
  }
  if (validatedInput.carrier !== undefined) {
    updateData.carrier = validatedInput.carrier;
  }

  // Handle inventory changes based on status transitions
  const newStatus = validatedInput.status;
  const oldStatus = currentOrder.status;

  // Validate transition rules before starting transaction
  if (newStatus === "SHIPPED" && oldStatus !== "SHIPPED") {
    // Check if order is eligible for shipping (must be PAID or PROCESSING)
    if (oldStatus !== "PAID" && oldStatus !== "PROCESSING") {
      const error = new Error("Order must be PAID or PROCESSING before it can be shipped.") as Error & { details?: string };
      error.details = `Current status: ${oldStatus}`;
      throw error;
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Update order
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        items: true,
        address: true,
        payment: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Handle inventory based on status transitions
    if (newStatus && newStatus !== oldStatus) {
      console.log(`[order-update] Order ${orderId} status transition: ${oldStatus} -> ${newStatus}`);
      
      // Payment/Processing: Reserve stock (for manual admin mark-as-paid or processing)
      if ((newStatus === "PAID" && oldStatus !== "PAID") || 
          (newStatus === "PROCESSING" && oldStatus !== "PROCESSING")) {
        console.log(`[order-update] Calling reserveStock for order ${orderId} (status: ${newStatus})`);
        await reserveStock(orderId, tx);
        console.log(`[order-update] Successfully reserved stock for order ${orderId}`);
      }
      
      // Shipment: Deduct physical stock
      if (newStatus === "SHIPPED" && oldStatus !== "SHIPPED") {
        // Check if stock was reserved - if not, this is an error
        const existingReservations = await tx.inventoryMovement.findMany({
          where: {
            orderId: orderId,
            movementType: "RESERVED",
            quantity: { gt: 0 },
          },
        });

        if (existingReservations.length === 0) {
          throw new Error(
            `Cannot ship order ${orderId}: Stock must be reserved (order must be PAID or PROCESSING) before shipping.`,
          );
        }

        console.log(`[order-update] Calling deductStockOnShipment for order ${orderId}`);
        await deductStockOnShipment(orderId, tx);
        console.log(`[order-update] Successfully deducted stock for order ${orderId}`);
      }

      // Cancellation: Release reserved stock
      if (newStatus === "CANCELED" && oldStatus !== "CANCELED") {
        // Only release if order was previously PAID/PROCESSING (had reserved stock)
        if (oldStatus === "PAID" || oldStatus === "PROCESSING") {
          console.log(`[order-update] Calling releaseStock for order ${orderId}`);
          await releaseStock(orderId, tx);
          console.log(`[order-update] Successfully released stock for order ${orderId}`);
        } else {
          console.log(`[order-update] Order ${orderId} was ${oldStatus}, no stock to release`);
        }
      }
    }

    return updatedOrder;
  });

  // Create and mark invoice as paid when order status changes to PAID (idempotent)
  if (newStatus === "PAID" && oldStatus !== "PAID") {
    try {
      console.log(`[order-update] Ensuring invoice exists and is marked paid for order ${orderId}`);
      const createResult = await createInvoiceForOrder({ orderId });
      
      if ("status" in createResult) {
        // Log error but don't fail (idempotent - may already exist from previous run)
        console.error(`[order-update] Error creating invoice for order ${orderId}:`, createResult.error);
      } else {
        const invoice = createResult.invoice;
        console.log(`[order-update] Invoice ${invoice.id} ensured for order ${orderId}`);
        
        // Mark invoice as paid (idempotent - safe to call multiple times)
        const markPaidResult = await markInvoicePaid({
          invoiceId: invoice.id,
          paidAt: new Date(),
        });
        
        if ("status" in markPaidResult) {
          // Log error but don't fail (idempotent - may already be paid)
          console.error(`[order-update] Error marking invoice ${invoice.id} as paid:`, markPaidResult.error);
        } else {
          console.log(`[order-update] Invoice ${invoice.id} marked as paid for order ${orderId}`);
        }
      }
    } catch (error) {
      // Log but don't fail (idempotent operations - safe to retry)
      console.error(`[order-update] Error ensuring invoice for order ${orderId}:`, error);
    }
  }

  return updated;
}

