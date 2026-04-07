// components/catalog/search-input.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import { SearchIcon } from "@/components/icons/search-icon";

export function CatalogSearchInput() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(searchParams.get("q") || "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchValue.trim()) {
      params.set("q", searchValue.trim());
    } else {
      params.delete("q");
    }
    params.set("page", "1"); // Reset to first page
    router.push(`/catalog?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="search"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        placeholder="Search products..."
        className="w-full rounded-md border border-input bg-background px-10 py-2 text-base text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <div className="absolute left-3 top-1/2 -translate-y-1/2">
        <SearchIcon className="h-5 w-5 text-muted-foreground" />
      </div>
    </form>
  );
}

