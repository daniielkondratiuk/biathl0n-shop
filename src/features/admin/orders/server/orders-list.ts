import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/server/db/prisma";
import type { Prisma, OrderStatus } from "@prisma/client";
import { ensureOrderNumber } from "@/features/orders";

export interface OrderMetrics {
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

function getDateRangeFilter(range?: string): Prisma.OrderWhereInput {
  if (!range) return {};

  const now = new Date();
  let startDate: Date;

  switch (range) {
    case "today":
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case "7d":
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case "30d":
      startDate = new Date(now.setDate(now.getDate() - 30));
      break;
    default:
      return {};
  }

  return {
    createdAt: {
      gte: startDate,
    },
  };
}

export async function getOrderMetrics(dateRange?: string): Promise<OrderMetrics> {
  noStore();
  const dateFilter = getDateRangeFilter(dateRange);

  const [totalOrders, paidOrders, pendingOrders, revenueAgg] = await Promise.all([
    prisma.order.count({ where: dateFilter }),
    prisma.order.count({
      where: {
        ...dateFilter,
        status: {
          in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"],
        },
      },
    }),
    prisma.order.count({
      where: {
        ...dateFilter,
        status: "PENDING",
      },
    }),
    prisma.order.aggregate({
      where: {
        ...dateFilter,
        status: {
          in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"],
        },
      },
      _sum: { total: true },
      _avg: { total: true },
    }),
  ]);

  const totalRevenue = revenueAgg._sum.total ?? 0;
  const averageOrderValue = revenueAgg._avg.total ?? 0;

  return {
    totalOrders,
    paidOrders,
    pendingOrders,
    totalRevenue,
    averageOrderValue,
  };
}

export async function getOrdersWithPagination(params: {
  page: number;
  pageSize: number;
  search?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  dateRange?: string;
}) {
  noStore();
  const { page, pageSize, search, paymentStatus, fulfillmentStatus, dateRange } = params;

  const where: Prisma.OrderWhereInput = {};

  // Date range filter
  const dateFilter = getDateRangeFilter(dateRange);
  if (Object.keys(dateFilter).length > 0) {
    Object.assign(where, dateFilter);
  }

  // Search filter
  if (search) {
    where.OR = [
      { id: { contains: search, mode: "insensitive" } },
      { orderNumber: { contains: search, mode: "insensitive" } },
      { address: { fullName: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { user: { name: { contains: search, mode: "insensitive" } } },
      { items: { some: { productName: { contains: search, mode: "insensitive" } } } },
    ];
  }

  // Fulfillment status filter
  if (fulfillmentStatus) {
    where.status = fulfillmentStatus as OrderStatus;
  }

  // Payment status filter
  if (paymentStatus) {
    if (paymentStatus === "paid") {
      where.payment = { status: "SUCCEEDED" };
    } else if (paymentStatus === "pending") {
      where.payment = { status: "PENDING" };
    } else if (paymentStatus === "failed") {
      where.payment = { status: "FAILED" };
    } else if (paymentStatus === "refunded") {
      where.payment = { status: "REFUNDED" };
    }
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
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
    }),
  ]);

  // Ensure all orders have order numbers
  for (const order of orders) {
    if (!order.orderNumber) {
      order.orderNumber = await ensureOrderNumber(order.id);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    orders,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getAdminOrderMetrics(
  dateRange?: string
): Promise<OrderMetrics> {
  return getOrderMetrics(dateRange);
}

export async function getAdminOrdersList(params: {
  page: number;
  pageSize: number;
  search?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  dateRange?: string;
}) {
  return getOrdersWithPagination(params);
}

