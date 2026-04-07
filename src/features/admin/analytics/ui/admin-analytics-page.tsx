// src/features/admin/analytics/ui/admin-analytics-page.tsx
import { Suspense } from "react";
import {
  getTimeSeriesDataWrapper,
  getTopProductsWrapper,
  getInventorySummaryWrapper,
  getInventoryTrendWrapper,
} from "@/features/admin/analytics";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { OrdersChart } from "@/components/admin/orders-chart";
import { InventoryTrendChart } from "@/features/admin/inventory";
import { DashboardFilters } from "@/components/admin/dashboard-filters";
import { AnalyticsTabs } from "@/components/admin/analytics-tabs";
import Link from "next/link";

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-96 animate-pulse rounded-xl border border-border bg-muted" />
        ))}
      </div>
    </div>
  );
}

async function SalesTab({ dateRange }: { dateRange?: string }) {
  const [timeSeries, topProducts] = await Promise.all([
    getTimeSeriesDataWrapper(dateRange),
    getTopProductsWrapper(dateRange, 20),
  ]);

  return (
    <div className="space-y-6">
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

      {/* Top Products Table */}
      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Top Selling Products</h2>
          <Link
            href="/admin/products"
            className="text-xs font-medium text-foreground underline-offset-4 hover:text-accent transition-colors"
          >
            View all products
          </Link>
        </div>
        {topProducts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No sales data available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Product
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Quantity Sold
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topProducts.map((product, index) => (
                  <tr
                    key={product.id}
                    className="transition-colors hover:bg-muted/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="text-sm font-medium text-foreground hover:text-accent transition-colors"
                      >
                        {product.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-foreground">
                      {product.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      {(product.revenue / 100).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

async function InventoryTab({ dateRange }: { dateRange?: string }) {
  const [summary, trendData] = await Promise.all([
    getInventorySummaryWrapper({ lowThreshold: 10 }),
    getInventoryTrendWrapper(dateRange),
  ]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Total SKUs
          </p>
          <p className="mt-2 text-2xl font-semibold text-card-foreground">{summary.totalSkus}</p>
          <p className="mt-1 text-xs text-muted-foreground">All size variants</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Total Units in Stock
          </p>
          <p className="mt-2 text-2xl font-semibold text-card-foreground">
            {(summary.totalAvailableUnits ?? 0).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Catalog total (all products)</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Inventory Value
          </p>
          <p className="mt-2 text-2xl font-semibold text-card-foreground">
            {((summary.inventoryValue ?? 0) / 100).toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Total value of on-hand stock</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Reserved Units
          </p>
          <p className="mt-2 text-2xl font-semibold text-card-foreground">
            {summary.totalReservedUnits.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Reserved for orders</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Low Stock SKUs
          </p>
          <p className="mt-2 text-2xl font-semibold text-card-foreground">{summary.lowStockCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Available ≤ 10 units</p>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Inventory Trends</h2>
          <Suspense>
            <DashboardFilters />
          </Suspense>
        </div>
        <InventoryTrendChart data={trendData} />
      </div>
    </div>
  );
}

function UsersTab() {
  return (
    <div className="rounded-lg border border-border bg-card p-12 text-center shadow-sm">
      <p className="text-sm text-muted-foreground">User analytics coming soon.</p>
    </div>
  );
}

async function AnalyticsContent({
  dateRange,
  tab,
}: {
  dateRange?: string;
  tab: string;
}) {
  if (tab === "inventory") {
    return <InventoryTab dateRange={dateRange} />;
  }
  if (tab === "users") {
    return <UsersTab />;
  }
  return <SalesTab dateRange={dateRange} />;
}

interface AdminAnalyticsPageProps {
  dateRange?: string;
  tab?: string;
}

export async function AdminAnalyticsPage({ dateRange, tab }: AdminAnalyticsPageProps) {
  const finalDateRange = dateRange || "30d";
  const finalTab = tab || "sales";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Detailed performance metrics and insights
          </p>
        </div>
        {/* Range controls: show for sales tab only (inventory tab has its own in chart header) */}
        {finalTab === "sales" && (
          <Suspense>
            <DashboardFilters />
          </Suspense>
        )}
      </div>

      <AnalyticsTabs />

      <Suspense fallback={<LoadingSkeleton />}>
        <AnalyticsContent dateRange={finalDateRange} tab={finalTab} />
      </Suspense>
    </div>
  );
}

