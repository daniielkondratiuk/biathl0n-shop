// src/features/admin/inventory/server/inventory-admin.ts
// Admin inventory management service

import { prisma } from "@/server/db/prisma";
import type { Prisma, InventoryMovementType } from "@prisma/client";

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
  colorName: string;
  size: string;
  sku: string;
  onHand: number;
  reserved: number;
  available: number;
  updatedAt: Date;
}

export interface InventoryListResult {
  items: InventoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface InventorySummary {
  lowStockCount: number;
  outOfStockCount: number;
  totalSkus: number;
  totalAvailableUnits: number;
  totalReservedUnits: number;
  inventoryValue: number; // Total value of available inventory in cents
}

export interface InventoryMovement {
  id: string;
  date: Date;
  productName: string;
  sku: string;
  size: string;
  type: string;
  quantity: number;
  orderId: string | null;
  reason: string | null;
}

export interface InventoryMovementsResult {
  movements: InventoryMovement[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface InventoryTrendData {
  date: string;
  reserved: number;
  adjustments: number;
}

export async function listInventory(params: {
  q?: string;
  sort?: string; // e.g., "available.asc,reserved.desc"
  page?: number;
  pageSize?: number;
}): Promise<InventoryListResult> {
  const {
    q = "",
    sort = "available.asc",
    page = 1,
    pageSize = 25,
  } = params;

  const LOW_STOCK_THRESHOLD = 10;

  // Build where clause
  const where: Prisma.ProductSizeVariantWhereInput = {};

  // Search filter (product name or SKU)
  if (q) {
    where.OR = [
      { sku: { contains: q, mode: "insensitive" } },
      {
        colorVariant: {
          product: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { title: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      },
    ];
  }

  // Fetch all variants with relations
  const allVariants = await prisma.productSizeVariant.findMany({
    where,
    include: {
      colorVariant: {
        include: {
          product: {
            include: {
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
          color: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  // Transform and compute available
  const items: InventoryItem[] = allVariants.map((variant) => {
    const available = Math.max(0, variant.stock - variant.stockReserved);
    return {
      id: variant.id,
      productId: variant.colorVariant.product.id,
      productName: variant.colorVariant.product.title || variant.colorVariant.product.name,
      productSlug: variant.colorVariant.product.slug,
      productImage: null,
      colorName: variant.colorVariant.color.name,
      size: variant.size,
      sku: variant.sku,
      onHand: variant.stock,
      reserved: variant.stockReserved,
      available,
      updatedAt: variant.updatedAt,
    };
  });

  // Parse multi-sort string (e.g., "available.asc,reserved.desc" -> array of sort criteria)
  function parseSorts(sortStr: string): Array<{ field: string; dir: "asc" | "desc" }> {
    if (!sortStr) return [{ field: "available", dir: "asc" }]; // Default
    const parts = sortStr.split(",");
    const sorts: Array<{ field: string; dir: "asc" | "desc" }> = [];
    for (const part of parts) {
      const [field, dir] = part.trim().split(".");
      if (field && (dir === "asc" || dir === "desc")) {
        sorts.push({ field, dir });
      }
    }
    return sorts.length > 0 ? sorts : [{ field: "available", dir: "asc" }];
  }

  const sortCriteria = parseSorts(sort);

  // Multi-sort
  items.sort((a, b) => {
    for (const sort of sortCriteria) {
      let cmp = 0;
      if (sort.field === "available") {
        cmp = a.available - b.available;
      } else if (sort.field === "reserved") {
        cmp = a.reserved - b.reserved;
      } else if (sort.field === "status") {
        // Status sorting: group by status (out → low → in stock) using available
        // Out of stock (0) < Low stock (1-10) < In stock (>10)
        const aStatus = a.available === 0 ? 0 : a.available <= LOW_STOCK_THRESHOLD ? 1 : 2;
        const bStatus = b.available === 0 ? 0 : b.available <= LOW_STOCK_THRESHOLD ? 1 : 2;
        cmp = aStatus - bStatus;
        // If same status, sort by available within that status
        if (cmp === 0) {
          cmp = a.available - b.available;
        }
      } else if (sort.field === "sku") {
        cmp = a.sku.localeCompare(b.sku);
      }
      if (sort.dir === "desc") cmp = -cmp;
      
      // If this sort criteria produces a difference, return it
      if (cmp !== 0) return cmp;
    }
    
    // If all sort criteria are equal, use SKU for stability
    return a.sku.localeCompare(b.sku);
  });

  // Server-side pagination
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedItems = items.slice(startIndex, startIndex + pageSize);

  return {
    items: paginatedItems,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Source of truth for stock calculations:
 * - Products page (/admin/products) shows: SUM(ProductSizeVariant.stock) per product (raw on-hand stock)
 * - This function aligns with that source by using raw stock (not available = stock - reserved)
 * - All admin inventory numbers must use the same source: ProductSizeVariant.stock (raw on-hand)
 */
export function getStockSourceOfTruth() {
  return {
    source: "ProductSizeVariant.stock",
    description: "Raw on-hand stock from ProductSizeVariant, matching /admin/products Stock column",
  };
}

export async function getInventorySummary(params: {
  lowThreshold?: number;
}): Promise<InventorySummary> {
  const { lowThreshold = 10 } = params;

  // Use raw SQL aggregation to ensure accuracy and avoid any join issues
  // Source of truth: ProductSizeVariant.stock (raw on-hand) - matches /admin/products Stock column
  // Note: Prisma creates camelCase columns with quoted identifiers in Postgres
  const summaryResult = await prisma.$queryRaw<Array<{
    total_skus: bigint;
    total_stock: bigint;
    total_reserved: bigint;
    total_available: bigint;
  }>>`
    SELECT 
      COUNT(*) as total_skus,
      COALESCE(SUM("stock"), 0) as total_stock,
      COALESCE(SUM("stockReserved"), 0) as total_reserved,
      COALESCE(SUM(GREATEST("stock" - "stockReserved", 0)), 0) as total_available
    FROM "ProductSizeVariant"
  `;

  const summary = summaryResult[0];
  const totalSkus = Number(summary.total_skus);
  // Use raw stock (on-hand) to match Products page, not available stock
  // This ensures consistency: Products page shows SUM(stock) per product, Analytics shows SUM(stock) total
  const totalAvailableUnits = Number(summary.total_stock); // Changed from total_available to total_stock
  const totalReservedUnits = Number(summary.total_reserved);

  // Count low stock and out of stock SKUs
  const stockCounts = await prisma.$queryRaw<Array<{
    low_stock_count: bigint;
    out_of_stock_count: bigint;
  }>>`
    SELECT 
      COUNT(CASE WHEN GREATEST("stock" - "stockReserved", 0) > 0 AND GREATEST("stock" - "stockReserved", 0) <= ${lowThreshold} THEN 1 END) as low_stock_count,
      COUNT(CASE WHEN GREATEST("stock" - "stockReserved", 0) = 0 THEN 1 END) as out_of_stock_count
    FROM "ProductSizeVariant"
  `;

  const counts = stockCounts[0];
  const lowStockCount = Number(counts.low_stock_count);
  const outOfStockCount = Number(counts.out_of_stock_count);

  // Calculate inventory value: sum(on-hand stock * unitPrice) for each SKU
  // Uses same stock source as "Total Units in Stock" (raw on-hand stock, not available)
  // Uses same pricing logic as cart/products: basePrice + colorPriceDiff + sizePriceDiff
  const variantsForValue = await prisma.productSizeVariant.findMany({
    select: {
      stock: true,
      priceDiff: true,
      colorVariant: {
        select: {
          priceDiff: true,
          product: {
            select: {
              basePrice: true,
              price: true,
            },
          },
        },
      },
    },
  });

  let inventoryValue = 0;
  for (const variant of variantsForValue) {
    const onHandStock = variant.stock || 0;
    if (onHandStock > 0) {
      // Calculate unit price using same logic as cart/products: basePrice + colorPriceDiff + sizePriceDiff
      const basePrice = variant.colorVariant.product.basePrice || variant.colorVariant.product.price || 0;
      const colorPriceDiff = variant.colorVariant.priceDiff || 0;
      const sizePriceDiff = variant.priceDiff || 0;
      const unitPrice = basePrice + colorPriceDiff + sizePriceDiff;
      inventoryValue += onHandStock * unitPrice;
    }
  }

  return {
    lowStockCount,
    outOfStockCount,
    totalSkus,
    totalAvailableUnits,
    totalReservedUnits,
    inventoryValue,
  };
}

export async function getInventoryTrend(dateRange?: string): Promise<InventoryTrendData[]> {
  const now = new Date();
  let startDate: Date;

  if (!dateRange) {
    dateRange = "30d";
  }

  switch (dateRange) {
    case "7d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      startDate = d;
      break;
    }
    case "30d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      startDate = d;
      break;
    }
    case "90d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      startDate = d;
      break;
    }
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default: {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      startDate = d;
      break;
    }
  }

  // Get movements grouped by date
  const movements = await prisma.inventoryMovement.findMany({
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      createdAt: true,
      movementType: true,
      quantity: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Group by date
  const grouped = new Map<string, { reserved: number; adjustments: number }>();

  for (const movement of movements) {
    const dateKey = movement.createdAt.toISOString().split("T")[0];
    const existing = grouped.get(dateKey) || { reserved: 0, adjustments: 0 };

    if (movement.movementType === "RESERVED") {
      existing.reserved += Math.abs(movement.quantity);
    } else if (movement.movementType === "ADJUSTMENT") {
      existing.adjustments += Math.abs(movement.quantity);
    }

    grouped.set(dateKey, existing);
  }

  // Convert to array and fill gaps
  const result: InventoryTrendData[] = [];
  const endDate = new Date();

  for (
    let d = new Date(startDate);
    d <= endDate;
    d.setDate(d.getDate() + 1)
  ) {
    const dateKey = d.toISOString().split("T")[0];
    const data = grouped.get(dateKey) || { reserved: 0, adjustments: 0 };
    result.push({
      date: dateKey,
      reserved: data.reserved,
      adjustments: data.adjustments,
    });
  }

  return result;
}

export async function listInventoryMovements(params: {
  q?: string;
  type?: string;
  dateRange?: string;
  page?: number;
  pageSize?: number;
}): Promise<InventoryMovementsResult> {
  const {
    q = "",
    type,
    dateRange,
    page = 1,
    pageSize = 20,
  } = params;

  // Build where clause
  const where: Prisma.InventoryMovementWhereInput = {};

  // Search filter
  if (q) {
    where.OR = [
      {
        sizeVariant: {
          sku: { contains: q, mode: "insensitive" },
        },
      },
      {
        product: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { title: { contains: q, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  // Type filter
  if (type && type !== "all") {
    where.movementType = type as InventoryMovementType;
  }

  // Date range filter
  if (dateRange) {
    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case "7d":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "30d":
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case "90d":
        startDate = new Date(now.setDate(now.getDate() - 90));
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 30));
    }

    where.createdAt = {
      gte: startDate,
    };
  }

  // Fetch movements
  const [movements, total] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where,
      include: {
        product: {
          select: {
            name: true,
            title: true,
          },
        },
        sizeVariant: {
          select: {
            sku: true,
            size: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.inventoryMovement.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    movements: movements.map((m) => ({
      id: m.id,
      date: m.createdAt,
      productName: m.product.title || m.product.name,
      sku: m.sizeVariant?.sku || "N/A",
      size: m.sizeVariant?.size || "N/A",
      type: m.movementType,
      quantity: m.quantity,
      orderId: m.orderId,
      reason: m.reason,
    })),
    total,
    page,
    pageSize,
    totalPages,
  };
}

