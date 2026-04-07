// src/features/admin/products/ui/product-list-page-client.tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductsTable } from "./products-table";
import { BulkActionsBar } from "./bulk-actions-bar";
import { PageSizeSelector } from "./page-size-selector";
import { Pagination } from "@/shared/ui/admin/pagination";

type Product = {
  id: string;
  name: string;
  title: string;
  basePrice: number;
  price: number;
  gender: string | null;
  badge: string | null;
  isActive: boolean;
  showInHero: boolean;
  category: {
    name: string;
  };
  colorVariants: Array<{
    images: Array<{ url: string }>;
    sizes: Array<{ stock: number }>;
  }>;
};

interface CurrentFilters {
  categoryId: string;
  gender: string;
  badge: string;
  status: string;
  search: string;
  hero: string;
}

interface ProductListPageClientProps {
  products: Product[];
  categories: Array<{ id: string; name: string }>;
  totalCount: number;
  page: number;
  pageSize?: number | "all";
  totalPages: number;
  currentFilters: CurrentFilters;
}

export function ProductListPageClient({
  products,
  categories,
  totalCount,
  page,
  pageSize,
  totalPages,
  currentFilters,
}: ProductListPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [resetSelectionKey, setResetSelectionKey] = useState(0);
  const [searchValue, setSearchValue] = useState(currentFilters.search);

  // Build URL with updated params, resetting page to 1 when filters change
  const updateFilters = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    // Reset to page 1 when filters change (except for page itself)
    if (key !== "page") {
      params.delete("page");
    }
    
    router.push(`/admin/products?${params.toString()}`);
  }, [router, searchParams]);

  function handleFilterChange(key: string, value: string) {
    updateFilters(key, value);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateFilters("search", searchValue);
  }

  function handleSearchClear() {
    setSearchValue("");
    updateFilters("search", "");
  }

  function handleSelectionChange(ids: string[]) {
    setSelectedIds(ids);
  }

  function handleClearSelection() {
    setSelectedIds([]);
    setResetSelectionKey((prev) => prev + 1);
  }

  const showPagination = pageSize !== "all" && pageSize !== undefined && totalPages > 1;

  // Build query object for pagination (preserve all current filters)
  const paginationQuery: Record<string, string | undefined> = {
    pageSize: typeof pageSize === "number" ? pageSize.toString() : undefined,
  };
  if (currentFilters.categoryId) paginationQuery.categoryId = currentFilters.categoryId;
  if (currentFilters.gender) paginationQuery.gender = currentFilters.gender;
  if (currentFilters.badge) paginationQuery.badge = currentFilters.badge;
  if (currentFilters.status) paginationQuery.status = currentFilters.status;
  if (currentFilters.search) paginationQuery.search = currentFilters.search;
  if (currentFilters.hero) paginationQuery.hero = currentFilters.hero;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your product catalog
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button variant="primary" size="md">
            Create Product
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-border bg-muted p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="flex-1"
            />
            {currentFilters.search && (
              <Button type="button" variant="ghost" size="sm" onClick={handleSearchClear}>
                Clear
              </Button>
            )}
          </form>

          {/* Category */}
          <select 
            value={currentFilters.categoryId}
            onChange={(e) => handleFilterChange("categoryId", e.target.value)}
            className="rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Gender */}
          <select 
            value={currentFilters.gender}
            onChange={(e) => handleFilterChange("gender", e.target.value)}
            className="rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Genders</option>
            <option value="MEN">Men</option>
            <option value="WOMEN">Women</option>
            <option value="KIDS">Kids</option>
            <option value="UNISEX">Unisex</option>
          </select>

          {/* Badge */}
          <select 
            value={currentFilters.badge}
            onChange={(e) => handleFilterChange("badge", e.target.value)}
            className="rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Badges</option>
            <option value="NEW">New</option>
            <option value="BESTSELLER">Bestseller</option>
            <option value="SALE">Sale</option>
            <option value="LIMITED">Limited</option>
            <option value="BACKINSTOCK">Back in Stock</option>
            <option value="TRENDING">Trending</option>
          </select>

          {/* Status */}
          <select 
            value={currentFilters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Hero */}
          <select 
            value={currentFilters.hero}
            onChange={(e) => handleFilterChange("hero", e.target.value)}
            className="rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Hero</option>
            <option value="1">Enabled</option>
            <option value="0">Disabled</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedIds={selectedIds}
        onClearSelection={handleClearSelection}
      />

      {/* Page Size Selector and Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <PageSizeSelector currentPageSize={pageSize} />
          {totalCount > 0 && (
            <p className="text-sm text-muted-foreground">
              Showing {products.length} of {totalCount} product
              {totalCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <ProductsTable
          products={products}
          onSelectionChange={handleSelectionChange}
          resetSelection={resetSelectionKey}
        />

        {/* Pagination */}
        {showPagination && (
          <Pagination 
            basePath="/admin/products" 
            currentPage={page} 
            totalPages={totalPages}
            query={paginationQuery}
          />
        )}
      </div>
    </div>
  );
}
