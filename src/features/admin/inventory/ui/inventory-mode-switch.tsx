// src/features/admin/inventory/ui/inventory-mode-switch.tsx
"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function InventoryModeSwitch() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "attention";

  function getModeUrl(newMode: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", newMode);
    params.delete("page"); // Reset to page 1 when switching modes
    return `/admin/inventory?${params.toString()}`;
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted p-1">
      <Link
        href={getModeUrl("attention")}
        className={cn(
          "flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors",
          mode === "attention"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Needs attention
      </Link>
      <Link
        href={getModeUrl("reserved")}
        className={cn(
          "flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors",
          mode === "reserved"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Reserved
      </Link>
      <Link
        href={getModeUrl("all")}
        className={cn(
          "flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors",
          mode === "all"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        All
      </Link>
    </div>
  );
}

