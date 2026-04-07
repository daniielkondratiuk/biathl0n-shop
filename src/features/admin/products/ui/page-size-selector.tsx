// src/features/admin/products/ui/page-size-selector.tsx
"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

interface PageSizeSelectorProps {
  currentPageSize?: number | "all";
}

export function PageSizeSelector({ currentPageSize }: PageSizeSelectorProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  function handlePageSizeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newPageSize = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    
    // Always set pageSize in URL, even for "all"
    params.set("pageSize", newPageSize);
    params.set("page", "1"); // Reset to page 1 when changing page size

    router.push(`${pathname}?${params.toString()}`);
  }

  // Read actual URL param value to determine display value
  const urlPageSize = searchParams.get("pageSize");
  const displayValue = urlPageSize || (currentPageSize === "all" ? "all" : currentPageSize?.toString() || "25");

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="page-size" className="text-sm text-muted-foreground">
        Show:
      </label>
      <select
        id="page-size"
        value={displayValue}
        onChange={handlePageSizeChange}
        className="rounded-md border border-border bg-input px-3 py-1.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
      >
        <option value="10">10</option>
        <option value="25">25</option>
        <option value="50">50</option>
        <option value="all">All</option>
      </select>
    </div>
  );
}
