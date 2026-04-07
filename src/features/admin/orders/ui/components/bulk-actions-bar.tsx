// src/features/admin/orders/ui/components/bulk-actions-bar.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/shared/ui/admin/toast-provider";

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
}

export function BulkActionsBar({ selectedIds, onClearSelection }: BulkActionsBarProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<string | null>(null);

  async function handleBulkUpdate(status: string) {
    if (selectedIds.length === 0) return;

    // Capture the selected IDs at the start to avoid stale closure
    const idsToUpdate = [...selectedIds];
    
    setLoading(true);
    setAction("update");

    try {
      const res = await fetch("/api/orders/bulk-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsToUpdate, status }),
      });

      if (!res.ok) {
        throw new Error("Failed to update orders");
      }

      const data = await res.json();
      
      // Debug log in development
      if (process.env.NODE_ENV === "development") {
        console.log("[bulk-update]", {
          sentIds: idsToUpdate.length,
          updatedCount: data.updatedCount,
          failedCount: data.failedCount,
          results: data.results?.length || 0,
        });
      }
      
      // Clear selection immediately after getting response (before showing toast)
      onClearSelection();
      
      // Show appropriate toast based on results
      if (data.failedCount > 0) {
        const firstError = data.results?.find((r: { ok: boolean; message?: string }) => !r.ok)?.message || "Unknown error";
        showToast(
          `Failed ${data.failedCount} of ${data.updatedCount + data.failedCount} orders. ${firstError}`,
          "error"
        );
      } else {
        showToast(
          `Updated ${data.updatedCount} order${data.updatedCount !== 1 ? "s" : ""} to ${status}`,
          "success"
        );
      }
      
      // Refresh only if some orders were updated (even if some failed)
      if (data.updatedCount > 0) {
        router.refresh();
      }
    } catch (error) {
      console.error(error);
      showToast("Failed to update orders. Please try again.", "error");
      // Clear selection even on error to prevent stale state
      onClearSelection();
    } finally {
      setLoading(false);
      setAction(null);
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to cancel ${selectedIds.length} order(s)?`)) {
      return;
    }

    setLoading(true);
    setAction("delete");

    try {
      const res = await fetch("/api/orders/bulk-update", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!res.ok) {
        throw new Error("Failed to delete orders");
      }

      // Use router.refresh() to reload server data after bulk update
      router.refresh();
      onClearSelection();
      showToast(`Canceled ${selectedIds.length} order${selectedIds.length !== 1 ? "s" : ""}`, "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to cancel orders. Please try again.", "error");
    } finally {
      setLoading(false);
      setAction(null);
    }
  }

  async function handleExport() {
    if (selectedIds.length === 0) return;

    setLoading(true);
    setAction("export");

    try {
      const res = await fetch("/api/orders/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!res.ok) {
        throw new Error("Failed to export orders");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Failed to export orders. Please try again.");
    } finally {
      setLoading(false);
      setAction(null);
    }
  }

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <div className="sticky top-0 z-10 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.length} order{selectedIds.length !== 1 ? "s" : ""} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-xs"
          >
            Clear
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <select
            onChange={(e) => {
              if (e.target.value) {
                handleBulkUpdate(e.target.value);
                e.target.value = "";
              }
            }}
            disabled={loading}
            className="rounded-md border border-border bg-input px-3 py-1.5 text-xs text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          >
            <option value="">Update Status...</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELED">Canceled</option>
          </select>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            disabled={loading && action === "export"}
            className="text-xs"
          >
            {loading && action === "export" ? "Exporting..." : "Export CSV"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBulkDelete}
            disabled={loading && action === "delete"}
            className="text-xs text-danger hover:text-danger"
          >
            {loading && action === "delete" ? "Deleting..." : "Cancel Orders"}
          </Button>
        </div>
      </div>
    </div>
  );
}

