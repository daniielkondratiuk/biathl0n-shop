import { prisma } from "@/server/db/prisma";
import type { OrderStatus } from "@/shared/types/prisma";
import {
  getInventorySummary,
  getInventoryTrend,
} from "@/features/admin/inventory";

function getDateRangeFilter(range?: string): { createdAt?: { gte: Date } } {
  if (!range) {
    // Default to last 30 days
    range = "30d";
  }

  const now = new Date();
  let startDate: Date;

  switch (range) {
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

  return {
    createdAt: {
      gte: startDate,
    },
  };
}

export interface TimeSeriesData {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  id: string;
  name: string;
  slug: string;
  quantity: number;
  revenue: number;
}

export async function getTimeSeriesData(dateRange?: string): Promise<TimeSeriesData[]> {
  const dateFilter = getDateRangeFilter(dateRange);
  const paidStatusFilter = {
    status: {
      in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as OrderStatus[],
    },
  };

  const orders = await prisma.order.findMany({
    where: {
      ...dateFilter,
      ...paidStatusFilter,
    },
    select: {
      createdAt: true,
      total: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Group by date
  const grouped = new Map<string, { revenue: number; orders: number }>();

  for (const order of orders) {
    const dateKey = order.createdAt.toISOString().split("T")[0];
    const existing = grouped.get(dateKey) || { revenue: 0, orders: 0 };
    grouped.set(dateKey, {
      revenue: existing.revenue + order.total,
      orders: existing.orders + 1,
    });
  }

  // Convert to array and fill gaps
  const result: TimeSeriesData[] = [];
  const startDate = dateFilter.createdAt?.gte || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = new Date();

  for (
    let d = new Date(startDate);
    d <= endDate;
    d.setDate(d.getDate() + 1)
  ) {
    const dateKey = d.toISOString().split("T")[0];
    const data = grouped.get(dateKey) || { revenue: 0, orders: 0 };
    result.push({
      date: dateKey,
      revenue: data.revenue,
      orders: data.orders,
    });
  }

  return result;
}

export async function getTopProducts(dateRange?: string, limit = 10): Promise<TopProduct[]> {
  const dateFilter = getDateRangeFilter(dateRange);
  const paidStatusFilter = {
    status: {
      in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as OrderStatus[],
    },
  };

  const orders = await prisma.order.findMany({
    where: {
      ...dateFilter,
      ...paidStatusFilter,
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              title: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  // Aggregate by product
  const productMap = new Map<
    string,
    { name: string; slug: string; quantity: number; revenue: number }
  >();

  for (const order of orders) {
    for (const item of order.items) {
      if (!item.product) continue;

      // Use finalPrice if set (non-zero), otherwise fall back to totalPrice
      const itemRevenue = item.finalPrice && item.finalPrice > 0 ? item.finalPrice : item.totalPrice;

      const existing = productMap.get(item.product.id) || {
        name: item.product.title || item.product.name,
        slug: item.product.slug,
        quantity: 0,
        revenue: 0,
      };

      productMap.set(item.product.id, {
        ...existing,
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + itemRevenue,
      });
    }
  }

  return Array.from(productMap.entries())
    .map(([id, data]) => ({
      id,
      ...data,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function getTimeSeriesDataWrapper(dateRange?: string) {
  return getTimeSeriesData(dateRange);
}

export async function getTopProductsWrapper(dateRange?: string, limit?: number) {
  return getTopProducts(dateRange, limit);
}

export async function getInventorySummaryWrapper(params?: { lowThreshold?: number }) {
  return getInventorySummary(params ?? {});
}

export async function getInventoryTrendWrapper(dateRange?: string) {
  return getInventoryTrend(dateRange);
}
