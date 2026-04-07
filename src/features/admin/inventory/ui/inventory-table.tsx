// src/features/admin/inventory/ui/inventory-table.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdjustStockModal } from "@/components/admin/adjust-stock-modal";
import type { InventoryItem } from "@/features/admin/inventory";

interface InventoryTableProps {
  items: InventoryItem[];
  searchQuery?: string;
  isEmpty?: boolean;
}

function getStockStatus(available: number): { label: string; variant: "default" | "cancelled" | "pending" } {
  if (available === 0) {
    return { label: "Out of stock", variant: "cancelled" };
  }
  if (available <= 10) {
    return { label: "Low stock", variant: "pending" };
  }
  return { label: "In stock", variant: "default" };
}

export function InventoryTable({
  items,
  searchQuery = "",
  isEmpty = false,
}: InventoryTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [adjustingVariant, setAdjustingVariant] = useState<{
    id: string;
    sku: string;
    stock: number;
    reserved: number;
    available: number;
  } | null>(null);
  const [searchInput, setSearchInput] = useState(searchQuery);

  const currentPageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 25;
  const currentSort = searchParams.get("sort") || "available.asc";

  // Parse multi-sort from URL
  function parseSorts(sortStr: string): Array<{ field: string; dir: "asc" | "desc" }> {
    if (!sortStr) return [{ field: "available", dir: "asc" }];
    return sortStr.split(",").map(part => {
      const [field, dir] = part.trim().split(".");
      return { field, dir: (dir || "asc") as "asc" | "desc" };
    }).filter(s => s.field);
  }

  const activeSorts = parseSorts(currentSort);

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchInput.trim()) {
      params.set("q", searchInput.trim());
    } else {
      params.delete("q");
    }
    params.set("page", "1");
    router.replace(`/admin/inventory?${params.toString()}`);
  }

  function handlePageSizeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", e.target.value);
    params.set("page", "1"); // Reset to page 1 when changing page size
    router.replace(`/admin/inventory?${params.toString()}`);
  }

  function handleSortClick(column: "available" | "reserved" | "status") {
    const params = new URLSearchParams(searchParams.toString());
    const currentSorts = parseSorts(currentSort);
    
    // Find if this column is already in the sort list
    const existingIndex = currentSorts.findIndex(s => s.field === column);
    
    if (existingIndex >= 0) {
      // Column is already in sort list
      const existing = currentSorts[existingIndex];
      if (existing.dir === "asc") {
        // Switch to DESC
        currentSorts[existingIndex] = { field: column, dir: "desc" };
      } else {
        // Remove from sort list
        currentSorts.splice(existingIndex, 1);
      }
    } else {
      // Add as new sort criteria (ASC)
      currentSorts.push({ field: column, dir: "asc" });
    }
    
    // If no sorts left, default to available.asc
    if (currentSorts.length === 0) {
      params.delete("sort");
    } else {
      params.set("sort", currentSorts.map(s => `${s.field}.${s.dir}`).join(","));
    }
    
    params.set("page", "1");
    router.replace(`/admin/inventory?${params.toString()}`);
  }

  function getSortIcon(column: "available" | "reserved" | "status") {
    const sort = activeSorts.find(s => s.field === column);
    if (!sort) return null;
    
    const index = activeSorts.findIndex(s => s.field === column) + 1;
    const arrow = sort.dir === "asc" ? "↑" : "↓";
    return activeSorts.length > 1 ? `${arrow}${index}` : arrow;
  }

  // Empty state
  if (isEmpty) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">No inventory items found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      {/* Toolbar: Search + Page Size */}
      <div className="border-b border-border bg-muted p-4">
        <div className="flex items-center gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <Input
              type="search"
              placeholder="Search by product name or SKU..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="ghost" size="sm">
              Search
            </Button>
          </form>
          <div className="flex items-center gap-2">
            <label htmlFor="pageSize" className="text-sm text-muted-foreground">
              Show:
            </label>
            <select
              id="pageSize"
              value={currentPageSize}
              onChange={handlePageSizeChange}
              className="rounded-md border border-border bg-input px-3 py-1.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Product
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                SKU
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors select-none"
                onClick={() => handleSortClick("available")}
              >
                Available {getSortIcon("available") && <span className="ml-1">{getSortIcon("available")}</span>}
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors select-none"
                onClick={() => handleSortClick("reserved")}
              >
                Reserved {getSortIcon("reserved") && <span className="ml-1">{getSortIcon("reserved")}</span>}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors select-none"
                onClick={() => handleSortClick("status")}
              >
                Status {getSortIcon("status") && <span className="ml-1">{getSortIcon("status")}</span>}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => {
              const status = getStockStatus(item.available);
              const available = Math.max(0, item.available); // Clamp to 0
              return (
                <tr key={item.id} className="transition-colors hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.colorName} / {item.size}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-muted-foreground">{item.sku}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className={`text-sm font-semibold ${
                      available === 0
                        ? "text-red-600 dark:text-red-400"
                        : available <= 10
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-foreground"
                    }`}>
                      {available}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-sm text-muted-foreground">{item.reserved}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={status.variant} size="sm">
                      {status.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setAdjustingVariant({
                            id: item.id,
                            sku: item.sku,
                            stock: item.onHand,
                            reserved: item.reserved,
                            available,
                          })
                        }
                        className="text-xs"
                      >
                        Adjust
                      </Button>
                      <Link
                        href={`/admin/products/${item.productId}`}
                        className="text-xs font-medium text-foreground underline-offset-4 hover:text-accent transition-colors"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {adjustingVariant && (
        <AdjustStockModal
          variantId={adjustingVariant.id}
          variantSku={adjustingVariant.sku}
          currentStock={adjustingVariant.stock}
          currentReserved={adjustingVariant.reserved}
          currentAvailable={adjustingVariant.available}
          onClose={() => setAdjustingVariant(null)}
        />
      )}
    </div>
  );
}

