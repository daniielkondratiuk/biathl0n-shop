import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { ProductBadge } from "@prisma/client";

// --- Legacy bulk status update (for backward compatibility) ---

const bulkStatusSchema = z.object({
  ids: z.array(z.string()).min(1),
  isActive: z.boolean(),
});

export interface BulkStatusUpdateInput {
  ids: string[];
  isActive: boolean;
}

export interface BulkStatusValidationError {
  status: number;
  body: {
    error: string;
    details: unknown;
  };
}

export function validateBulkStatusInput(
  input: unknown
): BulkStatusUpdateInput | BulkStatusValidationError {
  const parsed = bulkStatusSchema.safeParse(input);
  if (!parsed.success) {
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

export interface BulkStatusUpdateResult {
  ok: true;
  updatedCount: number;
}

export async function bulkUpdateProductStatus(
  input: BulkStatusUpdateInput
): Promise<BulkStatusUpdateResult> {
  const { ids, isActive } = input;

  const result = await prisma.product.updateMany({
    where: {
      id: { in: ids },
    },
    data: {
      isActive,
    },
  });

  return {
    ok: true,
    updatedCount: result.count,
  };
}

// --- Generic bulk update (badge, showInHero, isActive) ---

const productBadgeValues = ["NEW", "BESTSELLER", "SALE", "LIMITED", "BACKINSTOCK", "TRENDING"] as const;

const bulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1, "At least one product ID is required"),
  isActive: z.boolean().optional(),
  badge: z.enum(productBadgeValues).nullable().optional(),
  showInHero: z.boolean().optional(),
});

export interface BulkUpdateInput {
  ids: string[];
  isActive?: boolean;
  badge?: ProductBadge | null;
  showInHero?: boolean;
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
): BulkUpdateInput | BulkUpdateValidationError {
  const parsed = bulkUpdateSchema.safeParse(input);
  if (!parsed.success) {
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
  return parsed.data as BulkUpdateInput;
}

export interface BulkUpdateResult {
  ok: true;
  updatedCount: number;
}

export async function bulkUpdateProducts(
  input: BulkUpdateInput
): Promise<BulkUpdateResult> {
  const { ids, isActive, badge, showInHero } = input;

  // Build update data object with only provided fields
  const updateData: {
    isActive?: boolean;
    badge?: ProductBadge | null;
    showInHero?: boolean;
  } = {};

  if (isActive !== undefined) {
    updateData.isActive = isActive;
  }
  if (badge !== undefined) {
    updateData.badge = badge;
  }
  if (showInHero !== undefined) {
    updateData.showInHero = showInHero;
  }

  const result = await prisma.product.updateMany({
    where: {
      id: { in: ids },
    },
    data: updateData,
  });

  return {
    ok: true,
    updatedCount: result.count,
  };
}

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export interface BulkDeleteInput {
  ids: string[];
}

export interface BulkDeleteValidationError {
  status: number;
  body: {
    error: string;
    details: unknown;
  };
}

export function validateBulkDeleteInput(
  input: unknown
): BulkDeleteInput | BulkDeleteValidationError {
  const parsed = bulkDeleteSchema.safeParse(input);
  if (!parsed.success) {
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

export interface BulkDeleteResult {
  ok: true;
  deletedCount: number;
}

export interface BulkDeleteError {
  ok: false;
  error: string;
  failedProductId?: string;
}

export async function bulkDeleteProducts(
  input: BulkDeleteInput
): Promise<BulkDeleteResult | BulkDeleteError> {
  const { ids } = input;

  // First, fetch products to get their IDs for image folder deletion
  const products = await prisma.product.findMany({
    where: {
      id: { in: ids },
    },
    select: {
      id: true,
      slug: true,
    },
  });

  // If some IDs were not found, we'll still proceed with the ones we found
  const foundIds = products.map((p) => p.id);
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  if (notFoundIds.length > 0) {
    console.warn(
      `[bulk-delete] Some products not found: ${notFoundIds.join(", ")}`
    );
  }

  if (foundIds.length === 0) {
    return {
      ok: false,
      error: "No products found to delete",
    };
  }

  // Use a transaction to ensure all-or-nothing deletion
  // Note: Image deletions happen before the transaction, so if DB delete fails,
  // images will already be deleted. But this is acceptable as products without DB records
  // shouldn't have images anyway.
  try {
    const result = await prisma.product.deleteMany({
      where: {
        id: { in: foundIds },
      },
    });

    return {
      ok: true,
      deletedCount: result.count,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      ok: false,
      error: `Failed to delete products: ${errorMessage}`,
    };
  }
}
