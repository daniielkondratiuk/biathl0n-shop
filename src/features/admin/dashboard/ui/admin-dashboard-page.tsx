// src/features/admin/dashboard/ui/admin-dashboard-page.tsx
import Link from "next/link";
import { Suspense } from "react";
import { getAdminDashboardStats, getLowStockProducts } from "@/features/admin/dashboard";
import { getTimeSeriesData, getTopProducts } from "@/features/admin/analytics";
import { KPICard } from "@/components/admin/kpi-card";
import { DashboardFilters } from "@/components/admin/dashboard-filters";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { OrdersChart } from "@/components/admin/orders-chart";
import { StatusBadge } from "@/shared/ui/admin/status-badge";
import { AvatarInitials } from "@/shared/ui/admin/avatar-initials";
import { Button } from "@/components/ui/button";
import { formatOrderRefShort } from "@/lib/utils/order-ref";

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-80 animate-pulse rounded-xl border border-border bg-muted" />
        ))}
      </div>
    </div>
  );
}

async function DashboardContent({ dateRange }: { dateRange?: string }) {
  const [stats, timeSeries, topProducts, lowStockProducts] = await Promise.all([
    getAdminDashboardStats(dateRange),
    getTimeSeriesData(dateRange),
    getTopProducts(dateRange, 5),
    getLowStockProducts(10),
  ]);

  const outOfStockCount = lowStockProducts.filter((p) => p.stock === 0).length;
  const lowStockCount = lowStockProducts.length - outOfStockCount;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of your store performance
          </p>
        </div>
        <DashboardFilters />
      </div>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KPICard
          label="Total Revenue"
          value={(stats.totalRevenue / 100).toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}
          delta={stats.revenueDelta}
          deltaLabel="vs previous"
        />
        <KPICard
          label="Total Orders"
          value={stats.ordersCount}
          delta={stats.ordersDelta}
          deltaLabel="vs previous"
        />
        <KPICard
          label="Paid Orders"
          value={stats.salesCount}
        />
        <KPICard
          label="Avg Order Value"
          value={(stats.averageOrderValue / 100).toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}
        />
        <KPICard
          label="Products"
          value={stats.productsCount}
        />
      </section>

      {/* Inventory Alerts */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <section className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Inventory Alerts</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {lowStockCount > 0 && `${lowStockCount} product${lowStockCount !== 1 ? "s" : ""} with low stock`}
                {lowStockCount > 0 && outOfStockCount > 0 && " · "}
                {outOfStockCount > 0 && `${outOfStockCount} product${outOfStockCount !== 1 ? "s" : ""} out of stock`}
              </p>
            </div>
            <Link href="/admin/inventory">
              <Button variant="primary" size="sm">
                View Details
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Charts */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Revenue Over Time</h2>
          <RevenueChart data={timeSeries} />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Orders Over Time</h2>
          <OrdersChart data={timeSeries} />
        </div>
      </section>

      {/* Tables Section */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="text-sm font-semibold text-foreground">Recent Orders</h2>
            <Link
              href="/admin/orders"
              className="text-xs font-medium text-foreground underline-offset-4 hover:text-accent transition-colors"
            >
              View all
            </Link>
          </div>
          {stats.recentOrders.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {stats.recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="block p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <AvatarInitials
                        name={order.user?.name || order.address?.fullName || "Guest"}
                        email={order.user?.email}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {formatOrderRefShort(order.orderNumber, order.id)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.items.length} item{order.items.length === 1 ? "" : "s"} ·{" "}
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      {order.payment && (
                        <StatusBadge
                          status={order.payment.status || "PENDING"}
                          type="payment"
                          size="sm"
                        />
                      )}
                      <p className="text-sm font-semibold text-foreground whitespace-nowrap">
                        {(order.total / 100).toLocaleString("en-US", {
                          style: "currency",
                          currency: order.currency || "usd",
                        })}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="text-sm font-semibold text-foreground">Top Products</h2>
            <Link
              href="/admin/products"
              className="text-xs font-medium text-foreground underline-offset-4 hover:text-accent transition-colors"
            >
              View all
            </Link>
          </div>
          {topProducts.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No sales data available.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {topProducts.map((product, index) => (
                <Link
                  key={product.id}
                  href={`/admin/products/${product.id}`}
                  className="block p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {product.quantity} sold
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-foreground whitespace-nowrap ml-4">
                      {(product.revenue / 100).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

interface AdminDashboardPageProps {
  dateRange?: string;
}

export async function AdminDashboardPage({ dateRange }: AdminDashboardPageProps) {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <DashboardContent dateRange={dateRange} />
    </Suspense>
  );
}

