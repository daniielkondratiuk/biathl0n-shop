// src/features/admin/inventory/ui/admin-inventory-page.tsx
import { Suspense } from "react";
import { listInventory } from "@/features/admin/inventory";
import { InventoryTable } from "@/features/admin/inventory";
import { Pagination } from "@/shared/ui/admin/pagination";

async function InventoryContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string; pageSize?: string }>;
}) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const pageSize = params.pageSize ? parseInt(params.pageSize, 10) : 25;
  const sort = params.sort || "available.asc";

  const inventoryData = await listInventory({
    q: params.q,
    sort,
    page,
    pageSize,
  });

  const isEmpty = inventoryData.items.length === 0;
  const showPagination = inventoryData.totalPages > 1;

  return (
    <div className="space-y-6">
      {/* Table */}
      <InventoryTable
        items={inventoryData.items}
        searchQuery={params.q || ""}
        isEmpty={isEmpty}
      />

      {/* Pagination */}
      {showPagination && (
        <Pagination
          currentPage={inventoryData.page}
          totalPages={inventoryData.totalPages}
        />
      )}
    </div>
  );
}

interface AdminInventoryPageProps {
  searchParams: Promise<{ q?: string; sort?: string; page?: string; pageSize?: string }>;
}

export async function AdminInventoryPage({ searchParams }: AdminInventoryPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Inventory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage stock levels and adjust inventory
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="h-96 animate-pulse rounded-lg border border-border bg-muted" />
          </div>
        }
      >
        <InventoryContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

