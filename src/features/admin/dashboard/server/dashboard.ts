import { prisma } from "@/server/db/prisma";
import type { OrderStatus } from "@/shared/types/prisma";

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

function getPreviousPeriodFilter(range?: string): { createdAt?: { gte: Date; lt: Date } } {
  if (!range) {
    range = "30d";
  }

  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (range) {
    case "7d":
      endDate = new Date(now.setDate(now.getDate() - 7));
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "30d":
      endDate = new Date(now.setDate(now.getDate() - 30));
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 30);
      break;
    case "90d":
      endDate = new Date(now.setDate(now.getDate() - 90));
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 90);
      break;
    case "month":
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      startDate = lastMonth;
      endDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      endDate = new Date(now.setDate(now.getDate() - 30));
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 30);
  }

  return {
    createdAt: {
      gte: startDate,
      lt: endDate,
    },
  };
}

export interface DashboardKPIs {
  totalRevenue: number;
  ordersCount: number;
  salesCount: number;
  averageOrderValue: number;
  productsCount: number;
  revenueDelta?: number;
  ordersDelta?: number;
}

export async function getAdminDashboardStats(dateRange?: string) {
  const dateFilter = getDateRangeFilter(dateRange);
  const previousFilter = getPreviousPeriodFilter(dateRange);

  const paidStatusFilter = {
    status: {
      in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as OrderStatus[],
    },
  };

  const [orders, paidOrders, products, revenueAgg, previousRevenueAgg, previousOrders] =
    await Promise.all([
      prisma.order.count({ where: dateFilter }),
      prisma.order.count({
        where: {
          ...dateFilter,
          ...paidStatusFilter,
        },
      }),
      prisma.product.count(),
      prisma.order.aggregate({
        where: {
          ...dateFilter,
          ...paidStatusFilter,
        },
        _sum: { total: true },
        _avg: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          ...previousFilter,
          ...paidStatusFilter,
        },
        _sum: { total: true },
      }),
      prisma.order.count({
        where: {
          ...previousFilter,
          ...paidStatusFilter,
        },
      }),
    ]);

  const totalRevenue = revenueAgg._sum.total ?? 0;
  const averageOrderValue = revenueAgg._avg.total ?? 0;
  const previousRevenue = previousRevenueAgg._sum.total ?? 0;

  const revenueDelta =
    previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
  const ordersDelta =
    previousOrders > 0 ? ((paidOrders - previousOrders) / previousOrders) * 100 : 0;

  const recentOrders = await prisma.order.findMany({
    where: dateFilter,
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      items: true,
      payment: true,
      address: {
        select: {
          fullName: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return {
    totalRevenue,
    ordersCount: orders,
    salesCount: paidOrders,
    productsCount: products,
    averageOrderValue,
    recentOrders,
    revenueDelta,
    ordersDelta,
  };
}

export async function getLowStockProducts(threshold = 10) {
  // Get variants where available stock (stockOnHand - stockReserved) is low
  // Note: We fetch all variants and filter in memory since Prisma doesn't support
  // computed fields (stock - stockReserved) in where clauses
  const sizeVariants = await prisma.productSizeVariant.findMany({
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
    orderBy: { stock: "asc" },
  });

  // Filter by available stock (stockOnHand - stockReserved) in memory
  // Prisma doesn't support computed fields in where clauses easily
  return sizeVariants
    .filter((sv) => {
      const availableStock = sv.stock - sv.stockReserved;
      return availableStock <= threshold;
    })
    .map((sv) => ({
      id: sv.id,
      productId: sv.colorVariant.product.id,
      productName: sv.colorVariant.product.title || sv.colorVariant.product.name,
      productSlug: sv.colorVariant.product.slug,
      categoryName: sv.colorVariant.product.category.name,
      colorName: sv.colorVariant.color.name,
      size: sv.size,
      sku: sv.sku,
      stock: sv.stock - sv.stockReserved, // Return available stock
      updatedAt: sv.updatedAt,
    }));
}
