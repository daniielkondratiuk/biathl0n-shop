import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import type { ProductSizeVariant } from "@prisma/client";

const adjustStockSchema = z.object({
  variantId: z.string(),
  newStock: z.number().int().min(0),
  reason: z.enum(["restock", "correction", "damaged", "other"]),
  note: z.string().optional(),
});

export interface AdjustInventoryError {
  status: number;
  body: {
    error: string;
    details?: unknown;
  };
}

export async function adjustInventory(
  input: unknown
): Promise<{ variant: ProductSizeVariant } | AdjustInventoryError> {
  const parsed = adjustStockSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        error: "Invalid input",
        details: parsed.error.flatten(),
      },
    };
  }

  const { variantId, newStock, reason, note } = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    // Get current variant
    const variant = await tx.productSizeVariant.findUnique({
      where: { id: variantId },
      include: {
        colorVariant: {
          include: {
            product: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!variant) {
      throw new Error("Variant not found");
    }

    // Calculate delta
    const delta = newStock - variant.stock;

    if (delta === 0) {
      throw new Error("No change to stock");
    }

    // Update stock
    const updated = await tx.productSizeVariant.update({
      where: { id: variantId },
      data: {
        stock: newStock,
      },
    });

    // Create inventory movement
    // Use ADJUSTMENT type (already exists in enum)
    await tx.inventoryMovement.create({
      data: {
        productId: variant.colorVariant.product.id,
        sizeVariantId: variantId,
        quantity: delta, // Signed delta (positive for increase, negative for decrease)
        movementType: "ADJUSTMENT",
        reason: note || reason,
      },
    });

    return updated;
  });

  return { variant: result };
}

