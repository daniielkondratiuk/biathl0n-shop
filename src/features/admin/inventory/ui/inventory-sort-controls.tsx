// src/features/admin/inventory/ui/inventory-sort-controls.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function InventorySortControls() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sort = searchParams.get("sort") || "available.asc";
  const thenSort = searchParams.get("then") || "reserved.desc";

  const [primaryField, primaryDir] = sort.split(".");
  const [secondaryField, secondaryDir] = thenSort.split(".");

  function updateSort(primary: string, primaryDirection: string, secondary?: string, secondaryDirection?: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", `${primary}.${primaryDirection}`);
    if (secondary && secondaryDirection) {
      params.set("then", `${secondary}.${secondaryDirection}`);
    } else {
      params.delete("then");
    }
    params.set("page", "1");
    router.replace(`/admin/inventory?${params.toString()}`);
  }

  function togglePrimaryDirection() {
    const newDir = primaryDir === "asc" ? "desc" : "asc";
    updateSort(primaryField, newDir, secondaryField, secondaryDir);
  }

  function toggleSecondaryDirection() {
    if (!secondaryField || secondaryField === "none") return;
    const newDir = secondaryDir === "asc" ? "desc" : "asc";
    updateSort(primaryField, primaryDir, secondaryField, newDir);
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Sort by:</span>
      <select
        value={primaryField}
        onChange={(e) => updateSort(e.target.value, primaryDir, secondaryField, secondaryDir)}
        className="rounded-md border border-border bg-input px-2 py-1 text-xs text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
      >
        <option value="available">Available</option>
        <option value="reserved">Reserved</option>
        <option value="sku">SKU</option>
      </select>
      <Button
        variant="ghost"
        size="sm"
        onClick={togglePrimaryDirection}
        className="h-7 px-2 text-xs"
      >
        {primaryDir === "asc" ? "↑" : "↓"}
      </Button>

      <span className="text-muted-foreground ml-2">Then by:</span>
      <select
        value={secondaryField || "none"}
        onChange={(e) => {
          if (e.target.value === "none") {
            updateSort(primaryField, primaryDir);
          } else {
            updateSort(primaryField, primaryDir, e.target.value, secondaryDir || "asc");
          }
        }}
        className="rounded-md border border-border bg-input px-2 py-1 text-xs text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
      >
        <option value="none">None</option>
        <option value="available">Available</option>
        <option value="reserved">Reserved</option>
        <option value="sku">SKU</option>
      </select>
      {secondaryField && secondaryField !== "none" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSecondaryDirection}
          className="h-7 px-2 text-xs"
        >
          {secondaryDir === "asc" ? "↑" : "↓"}
        </Button>
      )}
    </div>
  );
}

