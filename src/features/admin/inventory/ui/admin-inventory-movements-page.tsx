// src/features/admin/inventory/ui/admin-inventory-movements-page.tsx
import { Suspense } from "react";
import Link from "next/link";
import { listInventoryMovements } from "@/features/admin/inventory";
import { DashboardFilters } from "@/components/admin/dashboard-filters";
import { Pagination } from "@/shared/ui/admin/pagination";
import { Button } from "@/components/ui/button";

async function MovementsContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; range?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const pageSize = 20;

  const movementsData = await listInventoryMovements({
    q: params.q,
    type: params.type,
    dateRange: params.range,
    page,
    pageSize,
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-lg border border-border bg-muted p-4 shadow-sm">
        <form className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <input
              type="search"
              name="q"
              placeholder="Search by SKU or product name..."
              defaultValue={params.q || ""}
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
            />
          </div>
          <select
            name="type"
            defaultValue={params.type || "all"}
            className="rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          >
            <option value="all">All Types</option>
            <option value="RESERVED">Reserved</option>
            <option value="ADJUSTMENT">Adjustment</option>
            <option value="PURCHASE">Purchase</option>
            <option value="RETURN">Return</option>
            <option value="CANCELLATION">Cancellation</option>
          </select>
          <Suspense>
            <DashboardFilters />
          </Suspense>
        </form>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Product / SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Size
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Quantity
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Order
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movementsData.movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No inventory movements found.
                  </td>
                </tr>
              ) : (
                movementsData.movements.map((movement) => (
                  <tr key={movement.id} className="transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <p className="text-sm text-foreground">
                        {new Date(movement.date).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{movement.productName}</p>
                      <p className="font-mono text-xs text-muted-foreground">{movement.sku}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-foreground">{movement.size}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-foreground">{movement.type}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p
                        className={`text-sm font-semibold ${
                          movement.quantity > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {movement.quantity > 0 ? "+" : ""}
                        {movement.quantity}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {movement.orderId ? (
                        <Link
                          href={`/admin/orders/${movement.orderId}`}
                          className="text-xs font-medium text-foreground underline-offset-4 hover:text-accent transition-colors"
                        >
                          View Order
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-muted-foreground">{movement.reason || "—"}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {movementsData.totalPages > 1 && (
        <Pagination
          currentPage={movementsData.page}
          totalPages={movementsData.totalPages}
        />
      )}
    </div>
  );
}

interface AdminInventoryMovementsPageProps {
  searchParams: Promise<{ q?: string; type?: string; range?: string; page?: string }>;
}

export async function AdminInventoryMovementsPage({ searchParams }: AdminInventoryMovementsPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Inventory Movements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track all inventory changes and adjustments
          </p>
        </div>
        <Link href="/admin/inventory">
          <Button variant="ghost" size="sm">
            ← Back to Inventory
          </Button>
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="h-20 animate-pulse rounded-lg border border-border bg-muted" />
            <div className="h-96 animate-pulse rounded-lg border border-border bg-muted" />
          </div>
        }
      >
        <MovementsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

