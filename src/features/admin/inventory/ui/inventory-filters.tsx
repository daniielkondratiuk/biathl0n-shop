// src/features/admin/inventory/ui/inventory-filters.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Suspense } from "react";

function InventoryFiltersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const query = searchParams.get("q") || "";
  const status = searchParams.get("status") || "all";
  const sort = searchParams.get("sort") || "available_desc";

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1"); // Reset to first page
    router.replace(`/admin/inventory?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const searchValue = (formData.get("search") as string) || "";
    updateFilter("q", searchValue);
  }

  return (
    <div className="rounded-lg border border-border bg-muted p-4 shadow-sm">
      <form onSubmit={handleSearch} className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* Search */}
        <div className="md:col-span-2">
          <Input
            name="search"
            type="search"
            placeholder="Search by product name or SKU..."
            defaultValue={query}
            className="w-full"
          />
        </div>

        {/* Status Filter */}
        <select
          value={status}
          onChange={(e) => updateFilter("status", e.target.value)}
          className="rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
        >
          <option value="all">All Status</option>
          <option value="in_stock">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => updateFilter("sort", e.target.value)}
          className="rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
        >
          <option value="available_desc">Available (High to Low)</option>
          <option value="available_asc">Available (Low to High)</option>
          <option value="reserved_desc">Reserved (High to Low)</option>
          <option value="updated_desc">Recently Updated</option>
        </select>
      </form>
    </div>
  );
}

export function InventoryFilters() {
  return (
    <Suspense fallback={<div className="h-20 animate-pulse rounded-lg border border-border bg-muted" />}>
      <InventoryFiltersContent />
    </Suspense>
  );
}

