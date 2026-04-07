import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { reserveStock, deductStockOnShipment, releaseStock } from "@/features/inventory";
import { createInvoiceForOrder, markInvoicePaid } from "@/features/invoices";

const bulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1),
  status: z.enum(["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELED"]),
});

export interface BulkUpdateOrderStatusesInput {
  ids: string[];
  status: "PENDING" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELED";
}

export interface BulkUpdateValidationError {
  status: number;
  body: {
    error: string;
    details: unknown;
  };
}

export function validateBulkUpdateInput(
  input: unknown
): BulkUpdateOrderStatusesInput | BulkUpdateValidationError {
  const parsed = bulkUpdateSchema.safeParse(input);
  if (!parsed.success) {
    // Ensure details are JSON-serializable by converting zod error to plain object
    const flattened = parsed.error.flatten();
    return {
      status: 400,
      body: {
        error: "Invalid input",
        details: {
          formErrors: flattened.formErrors,
          fieldErrors: flattened.fieldErrors,
        },
      },
    };
  }
  return parsed.data;
}

export interface BulkUpdateOrderResult {
  orderId: string;
  ok: boolean;
  message?: string;
}

export interface BulkUpdateOrderStatusesResult {
  ok: boolean;
  updatedCount: number;
  failedCount: number;
  results: BulkUpdateOrderResult[];
}

export interface BulkCancelOrdersInput {
  ids: string[];
}

export function validateBulkCancelInput(input: unknown): string[] {
  return z.array(z.string()).parse((input as Record<string, unknown>).ids);
}

export interface BulkCancelOrdersResult {
  success: true;
  deleted: number;
  errors?: string[];
}

export async function bulkUpdateOrderStatuses(
  input: BulkUpdateOrderStatusesInput
): Promise<BulkUpdateOrderStatusesResult> {
  const { ids, status } = input;

  // Get current orders to check status transitions
  const currentOrders = await prisma.order.findMany({
    where: {
      id: { in: ids },
    },
    select: {
      id: true,
      status: true,
    },
  });

  // Track which order IDs were found in the database
  const foundOrderIds = new Set(currentOrders.map((o) => o.id));
  
  // Add results for orders that weren't found
  const results: BulkUpdateOrderResult[] = [];
  for (const id of ids) {
    if (!foundOrderIds.has(id)) {
      results.push({
        orderId: id,
        ok: false,
        message: "Order not found",
      });
    }
  }

  let updatedCount = 0;
  let failedCount = results.length; // Start with count of not-found orders

  for (const order of currentOrders) {
    try {
      // Validate transition rules before starting transaction
      if (status === "SHIPPED" && order.status !== "SHIPPED") {
        // Check if order is eligible for shipping (must be PAID or PROCESSING)
        if (order.status !== "PAID" && order.status !== "PROCESSING") {
          results.push({
            orderId: order.id,
            ok: false,
            message: `Must be PAID or PROCESSING before it can be shipped. Current status: ${order.status}`,
          });
          failedCount++;
          continue; // Skip this order
        }
      }

      await prisma.$transaction(async (tx) => {
        // Update order status
        await tx.order.update({
          where: { id: order.id },
          data: { status },
        });

        // Handle inventory based on status transitions
        if (status !== order.status) {
          // Payment/Processing: Reserve stock (for manual admin mark-as-paid or processing)
          if ((status === "PAID" && order.status !== "PAID") ||
              (status === "PROCESSING" && order.status !== "PROCESSING")) {
            await reserveStock(order.id, tx);
          }
          
          // Shipment: Deduct physical stock
          if (status === "SHIPPED" && order.status !== "SHIPPED") {
            // Check if stock was reserved - if not, this is an error
            const existingReservations = await tx.inventoryMovement.findMany({
              where: {
                orderId: order.id,
                movementType: "RESERVED",
                quantity: { gt: 0 },
              },
            });

            if (existingReservations.length === 0) {
              throw new Error(
                `Cannot ship order ${order.id}: Stock must be reserved (order must be PAID or PROCESSING) before shipping.`,
              );
            }

            await deductStockOnShipment(order.id, tx);
          }

          // Cancellation: Release reserved stock
          if (status === "CANCELED" && order.status !== "CANCELED") {
            // Only release if order was previously PAID/PROCESSING (had reserved stock)
            if (order.status === "PAID" || order.status === "PROCESSING") {
              await releaseStock(order.id, tx);
            }
          }
        }
      });

      // Create and mark invoice as paid when order status changes to PAID (idempotent)
      if (status === "PAID" && order.status !== "PAID") {
        try {
          console.log(`[bulk-update] Ensuring invoice exists and is marked paid for order ${order.id}`);
          const createResult = await createInvoiceForOrder({ orderId: order.id });
          
          if ("status" in createResult) {
            // Log error but don't fail (idempotent - may already exist from previous run)
            console.error(`[bulk-update] Error creating invoice for order ${order.id}:`, createResult.error);
          } else {
            const invoice = createResult.invoice;
            console.log(`[bulk-update] Invoice ${invoice.id} ensured for order ${order.id}`);
            
            // Mark invoice as paid (idempotent - safe to call multiple times)
            const markPaidResult = await markInvoicePaid({
              invoiceId: invoice.id,
              paidAt: new Date(),
            });
            
            if ("status" in markPaidResult) {
              // Log error but don't fail (idempotent - may already be paid)
              console.error(`[bulk-update] Error marking invoice ${invoice.id} as paid:`, markPaidResult.error);
            } else {
              console.log(`[bulk-update] Invoice ${invoice.id} marked as paid for order ${order.id}`);
            }
          }
        } catch (error) {
          // Log but don't fail (idempotent operations - safe to retry)
          console.error(`[bulk-update] Error ensuring invoice for order ${order.id}:`, error);
        }
      }

      results.push({
        orderId: order.id,
        ok: true,
      });
      updatedCount++;
    } catch (error) {
      console.error(`Failed to update order ${order.id}:`, error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      results.push({
        orderId: order.id,
        ok: false,
        message: errorMessage,
      });
      failedCount++;
    }
  }

  return {
    ok: failedCount === 0,
    updatedCount,
    failedCount,
    results,
  };
}

export async function bulkCancelOrders(
  input: BulkCancelOrdersInput
): Promise<BulkCancelOrdersResult> {
  const { ids } = input;

  // Get current orders to check status before cancellation
  const currentOrders = await prisma.order.findMany({
    where: {
      id: { in: ids },
    },
    select: {
      id: true,
      status: true,
    },
  });

  // Cancel orders and release reserved stock
  let canceledCount = 0;
  const errors: string[] = [];

  for (const order of currentOrders) {
    try {
      await prisma.$transaction(async (tx) => {
        // Soft delete by setting status to CANCELED
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "CANCELED",
          },
        });

        // Release reserved stock if order was previously PAID/PROCESSING
        if (order.status === "PAID" || order.status === "PROCESSING") {
          await releaseStock(order.id, tx);
        }
      });
      canceledCount++;
    } catch (error) {
      console.error(`Failed to cancel order ${order.id}:`, error);
      errors.push(`Order ${order.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  if (canceledCount === 0 && errors.length > 0) {
    const error = new Error("Failed to cancel orders") as Error & { details?: string[] };
    error.details = errors;
    throw error;
  }

  return {
    success: true,
    deleted: canceledCount,
    errors: errors.length > 0 ? errors : undefined,
  };
}

