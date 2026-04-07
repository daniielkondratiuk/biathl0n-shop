// src/features/admin/orders/ui/components/orders-page-client.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OrdersTable } from "./orders-table";
import { BulkActionsBar } from "./bulk-actions-bar";
import type { Order, OrderItem, Address, Payment } from "@/shared/types/prisma";

type OrderWithRelations = Order & {
  items: Partial<OrderItem>[];
  address: Partial<Address> | null;
  payment: Partial<Payment> | null;
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  orderNumber: string | null;
  notes: string | null;
  carrier?: string | null;
  labelPath?: string | null;
};

interface LabelResultItem {
  orderId: string;
  carrier: string | null;
  orderNumber?: string | null;
  status: "success" | "failed" | "skipped";
  httpStatus?: number;
  trackingNumber?: string | null;
  errorCode?: string;
  errorMessage?: string;
  reason?: string;
  reasonDetails?: string;
}

interface LabelResponse {
  total: number;
  eligible: number;
  success: number;
  failed: number;
  skipped: number;
  results: LabelResultItem[];
}

interface TrackingSyncResponse {
  total: number;
  eligible: number;
  updated: number;
  unchanged: number;
  failed: number;
  results: {
    orderId: string;
    orderNumber: string | null;
    trackingNumber: string;
    fromStatus: string;
    toStatus: string | null;
    status: "updated" | "unchanged" | "failed";
    reasonDetails?: string;
  }[];
}

interface OrdersPageClientProps {
  orders: OrderWithRelations[];
}

export function OrdersPageClient({ orders }: OrdersPageClientProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [resetKey, setResetKey] = useState(0);

  // Label generation state
  const [labelLoading, setLabelLoading] = useState(false);
  const [labelResults, setLabelResults] = useState<LabelResponse | null>(null);
  const [showFailures, setShowFailures] = useState(false);

  // Tracking sync state
  const [trackingSyncLoading, setTrackingSyncLoading] = useState(false);
  const [trackingSyncResults, setTrackingSyncResults] =
    useState<TrackingSyncResponse | null>(null);

  // Last auto-sync timestamp
  const [lastAutoSyncAt, setLastAutoSyncAt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/orders/tracking/auto-sync/last-run")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.lastRunAt) setLastAutoSyncAt(data.lastRunAt);
      })
      .catch(() => {});
  }, []);

  // Memoize handlers to prevent unnecessary re-renders and infinite loops
  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds([]);
    setResetKey((prev) => prev + 1); // Trigger reset in table
  }, []);

  // Compute eligible / skipped from selected orders
  const selectedOrders = orders.filter((o) => selectedIds.includes(o.id));
  const eligibleOrders = selectedOrders.filter(
    (o) =>
      o.status === "PAID" &&
      !(o as unknown as Record<string, unknown>).labelPath
  );
  const skippedCount = selectedOrders.length - eligibleOrders.length;

  async function handleGenerateLabels() {
    if (eligibleOrders.length === 0) return;

    const msg =
      `Generate labels for ${eligibleOrders.length} eligible order${eligibleOrders.length !== 1 ? "s" : ""}?` +
      (skippedCount > 0
        ? ` (${skippedCount} will be skipped)`
        : "");
    if (!confirm(msg)) return;

    setLabelLoading(true);
    setLabelResults(null);
    setShowFailures(false);

    try {
      const res = await fetch("/api/admin/orders/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds: eligibleOrders.map((o) => o.id),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setLabelResults({
          total: eligibleOrders.length,
          eligible: eligibleOrders.length,
          success: 0,
          failed: eligibleOrders.length,
          skipped: skippedCount,
          results: [
            {
              orderId: "",
              carrier: null,
              status: "failed",
              errorMessage: err.error || `HTTP ${res.status}`,
            },
          ],
        });
        return;
      }

      const data: LabelResponse = await res.json();
      // Merge in the frontend-skipped orders count
      data.skipped += skippedCount;
      setLabelResults(data);

      if (data.success > 0) {
        router.refresh();
      }
    } catch (err) {
      setLabelResults({
        total: eligibleOrders.length,
        eligible: eligibleOrders.length,
        success: 0,
        failed: 1,
        skipped: skippedCount,
        results: [
          {
            orderId: "",
            carrier: null,
            status: "failed",
            errorMessage:
              err instanceof Error ? err.message : "Network error",
          },
        ],
      });
    } finally {
      setLabelLoading(false);
    }
  }

  async function handleSyncTracking() {
    const hasSelection = selectedIds.length > 0;
    const msg = hasSelection
      ? `Sync tracking for ${selectedIds.length} selected order(s)?\n\nOnly PROCESSING orders with carrier "colissimo" and a tracking number will be checked.`
      : `Sync tracking for all PROCESSING Colissimo orders with a tracking number?`;
    if (!confirm(msg)) return;

    setTrackingSyncLoading(true);
    setTrackingSyncResults(null);

    try {
      const res = await fetch("/api/admin/orders/tracking/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hasSelection ? { orderIds: selectedIds } : {}),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setTrackingSyncResults({
          total: 0,
          eligible: 0,
          updated: 0,
          unchanged: 0,
          failed: 1,
          results: [
            {
              orderId: "",
              orderNumber: null,
              trackingNumber: "",
              fromStatus: "",
              toStatus: null,
              status: "failed",
              reasonDetails: err.error || `HTTP ${res.status}`,
            },
          ],
        });
        return;
      }

      const data: TrackingSyncResponse = await res.json();
      setTrackingSyncResults(data);

      if (data.updated > 0) {
        router.refresh();
      }
    } catch (err) {
      setTrackingSyncResults({
        total: 0,
        eligible: 0,
        updated: 0,
        unchanged: 0,
        failed: 1,
        results: [
          {
            orderId: "",
            orderNumber: null,
            trackingNumber: "",
            fromStatus: "",
            toStatus: null,
            status: "failed",
            reasonDetails:
              err instanceof Error ? err.message : "Network error",
          },
        ],
      });
    } finally {
      setTrackingSyncLoading(false);
    }
  }

  const failures =
    labelResults?.results.filter((r) => r.status === "failed") ?? [];

  return (
    <>
      {/* Existing bulk actions bar — hidden while label generation is running */}
      {selectedIds.length > 0 && !labelLoading && (
        <BulkActionsBar
          selectedIds={selectedIds}
          onClearSelection={handleClearSelection}
        />
      )}

      {/* Label generation controls */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
          <button
            onClick={handleGenerateLabels}
            disabled={labelLoading || eligibleOrders.length === 0}
            className="rounded-md bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {labelLoading
              ? "Generating..."
              : `Generate Labels (${eligibleOrders.length})`}
          </button>
          {skippedCount > 0 && !labelLoading && (
            <span className="text-xs text-muted-foreground">
              {skippedCount} order{skippedCount !== 1 ? "s" : ""} not eligible
              (skipped)
            </span>
          )}
          {labelLoading && (
            <span className="text-xs text-muted-foreground">
              Processing, please wait...
            </span>
          )}
        </div>
      )}

      {/* Label results summary */}
      {labelResults && (
        <div className="space-y-2 rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-foreground">
            Success {labelResults.success} &middot; Failed {labelResults.failed} &middot; Skipped {labelResults.skipped}
          </p>
          {failures.length > 0 && (
            <>
              <button
                onClick={() => setShowFailures((v) => !v)}
                className="text-xs text-accent hover:underline"
              >
                {showFailures
                  ? "Hide failures"
                  : `Show ${failures.length} failure${failures.length !== 1 ? "s" : ""}`}
              </button>
              {showFailures && (
                <ul className="mt-1 space-y-1 text-xs text-destructive">
                  {failures.map((f, i) => (
                    <li key={f.orderId || i}>
                      <span className="font-medium">
                        {f.orderNumber || f.orderId?.slice(0, 8) || "\u2014"}
                      </span>{" "}
                      ({f.carrier || "unknown"}) \u2014{" "}
                      {f.errorMessage || f.errorCode || "Unknown error"}
                      {f.reasonDetails && (
                        <span className="block text-muted-foreground">
                          {f.reasonDetails}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          <button
            onClick={() => setLabelResults(null)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tracking sync controls */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
        <button
          onClick={handleSyncTracking}
          disabled={trackingSyncLoading}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {trackingSyncLoading
            ? "Syncing..."
            : selectedIds.length > 0
              ? `Sync Tracking (${selectedIds.length})`
              : "Sync Tracking (PROCESSING)"}
        </button>
        {trackingSyncLoading && (
          <span className="text-xs text-muted-foreground">
            Checking Colissimo tracking, please wait...
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          Last auto sync:{" "}
          {lastAutoSyncAt
            ? new Date(lastAutoSyncAt).toLocaleString("en-GB", {
                timeZone: "Europe/Paris",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Never"}
        </span>
      </div>

      {/* Tracking sync results summary */}
      {trackingSyncResults && (
        <div className="space-y-2 rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-foreground">
            Updated {trackingSyncResults.updated} &middot; Unchanged{" "}
            {trackingSyncResults.unchanged} &middot; Failed{" "}
            {trackingSyncResults.failed}
          </p>
          {trackingSyncResults.results.some((r) => r.status === "failed") && (
            <ul className="mt-1 space-y-1 text-xs text-destructive">
              {trackingSyncResults.results
                .filter((r) => r.status === "failed")
                .map((f, i) => (
                  <li key={f.orderId || i}>
                    <span className="font-medium">
                      {f.orderNumber || f.orderId?.slice(0, 8) || "\u2014"}
                    </span>{" "}
                    ({f.trackingNumber || "no tracking"}) &mdash;{" "}
                    {f.reasonDetails || "Unknown error"}
                  </li>
                ))}
            </ul>
          )}
          <button
            onClick={() => setTrackingSyncResults(null)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

      <OrdersTable
        orders={orders}
        onSelectionChange={handleSelectionChange}
        resetSelection={resetKey}
      />
    </>
  );
}

