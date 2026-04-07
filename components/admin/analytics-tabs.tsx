// components/admin/analytics-tabs.tsx
"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function AnalyticsTabs() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "sales";

  function getTabUrl(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    return `/admin/analytics?${params.toString()}`;
  }

  return (
    <div className="border-b border-border">
      <nav className="-mb-px flex space-x-8">
        <Link
          href={getTabUrl("sales")}
          className={cn(
            "border-b-2 px-1 py-4 text-sm font-medium transition-colors",
            activeTab === "sales"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
          )}
        >
          Sales
        </Link>
        <Link
          href={getTabUrl("inventory")}
          className={cn(
            "border-b-2 px-1 py-4 text-sm font-medium transition-colors",
            activeTab === "inventory"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
          )}
        >
          Inventory
        </Link>
        <Link
          href={getTabUrl("users")}
          className={cn(
            "border-b-2 px-1 py-4 text-sm font-medium transition-colors",
            activeTab === "users"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
          )}
        >
          Users
        </Link>
      </nav>
    </div>
  );
}

