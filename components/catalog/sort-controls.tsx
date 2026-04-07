// components/catalog/sort-controls.tsx
"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface SortControlsProps {
  currentSort: string;
}

export function CatalogSortControls({ currentSort }: SortControlsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  function handleSortChange(sort: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", sort);
    params.set("page", "1"); // Reset to first page
    router.push(`/catalog?${params.toString()}`);
  }

  const [filtersVisible, setFiltersVisible] = useState(true);

  return (
    <div className="flex items-center gap-6">
      <button
        onClick={() => setFiltersVisible(!filtersVisible)}
        className="flex items-center gap-2 text-base font-normal text-foreground"
      >
        {filtersVisible ? "Hide Filters" : "Show Filters"}
        <span className="text-xs">{filtersVisible ? "▼" : "▲"}</span>
      </button>
      <div className="flex items-center gap-2">
        <span className="text-base font-normal text-foreground">Sort By</span>
        <select
          value={currentSort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="appearance-none rounded border border-border bg-background px-2 py-1 text-base font-normal text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>
    </div>
  );
}

