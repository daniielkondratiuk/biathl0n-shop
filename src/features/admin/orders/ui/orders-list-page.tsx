// src/features/admin/orders/ui/orders-list-page.tsx
import {
  getAdminOrderMetrics,
  getAdminOrdersList,
} from "@/features/admin/orders";
import { OrderMetricCard } from "./components/order-metric-card";
import { OrdersFilters } from "./components/orders-filters";
import { Pagination } from "@/shared/ui/admin/pagination";
import { OrdersPageClient } from "./components/orders-page-client";

interface OrdersListPageProps {
  page: number;
  pageSize: number;
  searchParams: Record<string, string | string[] | undefined>;
}

export async function OrdersListPage({
  page,
  pageSize,
  searchParams,
}: OrdersListPageProps) {
  // Extract search params (handle both string and string[] cases)
  const getStringParam = (key: string): string | undefined => {
    const value = searchParams[key];
    if (typeof value === "string") return value;
    if (Array.isArray(value) && value.length > 0) return value[0];
    return undefined;
  };

  const search = getStringParam("q");
  const paymentStatus = getStringParam("payment");
  const fulfillmentStatus = getStringParam("fulfillment");
  const dateRange = getStringParam("range");

  // All async calls, Prisma queries, and filtering logic
  const [metrics, ordersData] = await Promise.all([
    getAdminOrderMetrics(dateRange),
    getAdminOrdersList({
      page,
      pageSize,
      search,
      paymentStatus,
      fulfillmentStatus,
      dateRange,
    }),
  ]);

  const { orders, total, totalPages } = ordersData;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage and track all customer orders
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <OrderMetricCard
          label="Total Orders"
          value={metrics.totalOrders.toLocaleString()}
        />
        <OrderMetricCard
          label="Paid Orders"
          value={metrics.paidOrders.toLocaleString()}
        />
        <OrderMetricCard
          label="Pending Orders"
          value={metrics.pendingOrders.toLocaleString()}
        />
        <OrderMetricCard
          label="Total Revenue"
          value={(metrics.totalRevenue / 100).toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}
        />
        <OrderMetricCard
          label="Avg Order Value"
          value={(metrics.averageOrderValue / 100).toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}
        />
      </div>

      {/* Filters Bar */}
      <OrdersFilters />

      {/* Orders Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {total} order{total !== 1 ? "s" : ""} total
          </p>
        </div>
        <OrdersPageClient orders={orders} />
        {totalPages > 1 && (
          <Pagination currentPage={page} totalPages={totalPages} />
        )}
      </div>
    </div>
  );
}

