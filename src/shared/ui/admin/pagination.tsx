// src/shared/ui/admin/pagination.tsx
"use client";

import { useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  basePath?: string; // Optional for backwards compatibility
  currentPage: number;
  totalPages: number;
  query?: Record<string, string | undefined>;
}

export function Pagination({ basePath, currentPage, totalPages, query }: PaginationProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  // Use provided basePath or current pathname (deterministic for SSR/client)
  const effectiveBasePath = basePath || pathname;

  function getPageUrl(page: number) {
    // Start with existing search params or provided query
    const params = new URLSearchParams(query ? Object.entries(query).filter(([, v]) => v !== undefined).map(([k, v]) => [k, v!]) : searchParams.toString());
    params.set("page", page.toString());
    return `${effectiveBasePath}?${params.toString()}`;
  }

  if (totalPages <= 1) {
    return null;
  }

  const pages = [];
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  const endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {currentPage > 1 && (
        <Link
          href={getPageUrl(currentPage - 1)}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      )}

      {startPage > 1 && (
        <>
          <Link
            href={getPageUrl(1)}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            1
          </Link>
          {startPage > 2 && (
            <span className="px-2 text-sm text-muted-foreground">...</span>
          )}
        </>
      )}

      {pages.map((page) => (
        <Link
          key={page}
          href={getPageUrl(page)}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
            page === currentPage
              ? "border-accent bg-accent text-accent-foreground"
              : "border-border bg-card text-foreground hover:bg-muted"
          }`}
        >
          {page}
        </Link>
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && (
            <span className="px-2 text-sm text-muted-foreground">...</span>
          )}
          <Link
            href={getPageUrl(totalPages)}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            {totalPages}
          </Link>
        </>
      )}

      {currentPage < totalPages && (
        <Link
          href={getPageUrl(currentPage + 1)}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

