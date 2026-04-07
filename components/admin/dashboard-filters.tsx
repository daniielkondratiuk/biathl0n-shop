"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";

const dateRanges = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "This month", value: "month" },
] as const;

function DashboardFiltersContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentRange = searchParams.get("range") || "30d";

  const handleRangeChange = (range: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    // Use current pathname instead of hardcoding /admin
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      {dateRanges.map((range) => (
        <Button
          key={range.value}
          variant={currentRange === range.value ? "primary" : "ghost"}
          size="sm"
          onClick={() => handleRangeChange(range.value)}
          className="text-xs"
        >
          {range.label}
        </Button>
      ))}
    </div>
  );
}

export function DashboardFilters() {
  return (
    <Suspense fallback={<div className="h-8 w-48 animate-pulse rounded bg-muted" />}>
      <DashboardFiltersContent />
    </Suspense>
  );
}

