// src/server/jobs/sync-colissimo-tracking.ts
/**
 * Server-only reusable function for syncing Colissimo tracking statuses.
 *
 * Can be invoked by:
 * - The manual admin endpoint (POST /api/admin/orders/tracking/sync)         mode="manual"
 * - The auto-sync admin endpoint (POST /api/admin/orders/tracking/auto-sync) mode="auto"
 * - A future cron endpoint                                                    mode="auto"
 *
 * When mode="auto", lastAutoSyncAt is updated after the sync completes.
 */

import { prisma } from "@/server/db/prisma";
import { getColissimoTrackingStatus } from "@/server/integrations/colissimo-tracking";
import type { ColissimoTrackingOutcome } from "@/server/integrations/colissimo-tracking";
import { setLastColissimoAutoSyncAt } from "@/server/db/admin-job-state";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrackingSyncTrackingInfo {
  activeStepId: number | null;
  activeStepLabelShort: string | null;
  activeStepDate: string | null;
  apiStatusCode: string | null;
  lastEventCode: string | null;
}

export interface TrackingSyncResultItem {
  orderId: string;
  orderNumber: string | null;
  trackingNumber: string;
  statusBefore: string;
  outcome: "UPDATED" | "UNCHANGED" | "FAILED";
  newStatus: string | null;
  tracking: TrackingSyncTrackingInfo;
  reasonDetails: string | null;
}

export interface TrackingSyncSummary {
  total: number;
  eligible: number;
  updated: number;
  unchanged: number;
  failed: number;
  unauthorized: number;
  unknownEventCode: number;
  results: TrackingSyncResultItem[];
}

export type SyncMode = "manual" | "auto";

interface SyncOptions {
  /** If provided, only sync these order IDs (still enforced against eligibility). */
  orderIds?: string[];
  /** Maximum number of eligible orders to process (useful for cron batching). */
  limit?: number;
  /** "manual" (default) or "auto" — auto updates lastAutoSyncAt after completion. */
  mode?: SyncMode;
}

// ---------------------------------------------------------------------------
// Concurrency pool (no external deps)
// ---------------------------------------------------------------------------

async function runPooled<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const i = nextIndex++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker())
  );
  return results;
}

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------

function mapOutcomeToOrderStatus(
  outcome: ColissimoTrackingOutcome
): "SHIPPED" | "DELIVERED" | null {
  if (outcome === "DELIVERED") return "DELIVERED";
  if (outcome === "SHIPPED") return "SHIPPED";
  return null;
}

/** Never downgrade statuses — only allow forward transitions. */
const STATUS_RANK: Record<string, number> = {
  PENDING: 0,
  PAID: 1,
  PROCESSING: 2,
  SHIPPED: 3,
  DELIVERED: 4,
  CANCELED: 5,
};

function isForwardTransition(current: string, next: string): boolean {
  const curRank = STATUS_RANK[current] ?? -1;
  const nextRank = STATUS_RANK[next] ?? -1;
  return nextRank > curRank;
}

// ---------------------------------------------------------------------------
// Reason details helpers
// ---------------------------------------------------------------------------

function buildUnchangedReason(
  apiStatusCode: string | null,
  apiStatusMessage: string | null,
  activeStepId: number | null,
  error: string | null
): string {
  if (error) return error;
  if (apiStatusCode && apiStatusCode !== "0") {
    return `Tracking API returned code=${apiStatusCode} (${apiStatusMessage ?? "unknown"})`;
  }
  if (activeStepId === null) {
    return "No active step found in parcel.step";
  }
  if (activeStepId === 0) {
    return "Still at step 0 (Annonce) — not yet taken in charge by carrier";
  }
  return "No status transition needed";
}

// ---------------------------------------------------------------------------
// Main sync function
// ---------------------------------------------------------------------------

export async function syncProcessingColissimoTracking(
  options: SyncOptions = {}
): Promise<TrackingSyncSummary> {
  const { orderIds, limit, mode = "manual" } = options;

  // Build query for eligible orders
  const where: Record<string, unknown> = {
    status: "PROCESSING",
    trackingNumber: { not: "" },
  };

  // If specific orderIds requested, filter to those
  if (orderIds && orderIds.length > 0) {
    where.id = { in: orderIds };
  }

  // Fetch eligible orders
  const eligibleOrders = await prisma.order.findMany({
    where,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      carrier: true,
      trackingNumber: true,
    },
    ...(limit ? { take: limit } : {}),
    orderBy: { createdAt: "asc" },
  });

  // Further filter: carrier must be "colissimo" (trim/lowercase), trackingNumber non-empty
  const filtered = eligibleOrders.filter((o) => {
    const carrier = (o.carrier ?? "").trim().toLowerCase();
    return carrier === "colissimo" && !!o.trackingNumber?.trim();
  });

  const total = orderIds?.length ?? eligibleOrders.length;
  const eligible = filtered.length;

  if (eligible === 0) {
    const emptySummary: TrackingSyncSummary = {
      total,
      eligible: 0,
      updated: 0,
      unchanged: 0,
      failed: 0,
      unauthorized: 0,
      unknownEventCode: 0,
      results: [],
    };
    if (mode === "auto") {
      await setLastColissimoAutoSyncAt(new Date());
    }
    return emptySummary;
  }

  // Counters for summary log
  let shippedDetected = 0;
  let deliveredDetected = 0;
  let noActiveStep = 0;
  let step0Annonce = 0;
  let unauthorizedCount = 0;
  let unknownEventCodeCount = 0;

  // Build tasks
  const tasks = filtered.map((order) => async (): Promise<TrackingSyncResultItem> => {
    const trackingNumber = order.trackingNumber!.trim();
    const emptyTracking: TrackingSyncTrackingInfo = {
      activeStepId: null,
      activeStepLabelShort: null,
      activeStepDate: null,
      apiStatusCode: null,
      lastEventCode: null,
    };

    try {
      const tr = await getColissimoTrackingStatus(trackingNumber);

      const tracking: TrackingSyncTrackingInfo = {
        activeStepId: tr.activeStepId,
        activeStepLabelShort: tr.activeStepLabelShort,
        activeStepDate: tr.activeStepDate,
        apiStatusCode: tr.apiStatusCode,
        lastEventCode: tr.lastEventCode,
      };

      // Count unknown event codes
      if (tr.codeWasUnknown) {
        unknownEventCodeCount++;
      }

      // Handle UNAUTHORIZED (code 202) — not a failure, count as unchanged
      if (tr.outcome === "UNAUTHORIZED") {
        unauthorizedCount++;
        return {
          orderId: order.id,
          orderNumber: order.orderNumber,
          trackingNumber,
          statusBefore: order.status,
          outcome: "UNCHANGED",
          newStatus: null,
          tracking,
          reasonDetails: `Tracking service not enabled for this contract (code=202: ${tr.apiStatusMessage ?? "unknown"})`,
        };
      }

      // Track step distribution for summary log
      if (tr.activeStepId === null) noActiveStep++;
      else if (tr.activeStepId === 0) step0Annonce++;

      if (tr.error) {
        // Log single failure line (no secrets)
        console.log(
          `[ColissimoTracking] failed: order=${order.id} error=${tr.error}`
        );
        return {
          orderId: order.id,
          orderNumber: order.orderNumber,
          trackingNumber,
          statusBefore: order.status,
          outcome: "FAILED",
          newStatus: null,
          tracking,
          reasonDetails: tr.error,
        };
      }

      const newStatus = mapOutcomeToOrderStatus(tr.outcome);

      if (!newStatus) {
        return {
          orderId: order.id,
          orderNumber: order.orderNumber,
          trackingNumber,
          statusBefore: order.status,
          outcome: "UNCHANGED",
          newStatus: null,
          tracking,
          reasonDetails: buildUnchangedReason(
            tr.apiStatusCode,
            tr.apiStatusMessage,
            tr.activeStepId,
            null
          ),
        };
      }

      // Never downgrade status
      if (!isForwardTransition(order.status, newStatus)) {
        return {
          orderId: order.id,
          orderNumber: order.orderNumber,
          trackingNumber,
          statusBefore: order.status,
          outcome: "UNCHANGED",
          newStatus: null,
          tracking,
          reasonDetails: "No status transition needed",
        };
      }

      // Update order status in DB
      await prisma.order.update({
        where: { id: order.id },
        data: { status: newStatus },
      });

      if (newStatus === "SHIPPED") shippedDetected++;
      if (newStatus === "DELIVERED") deliveredDetected++;

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        trackingNumber,
        statusBefore: order.status,
        outcome: "UPDATED",
        newStatus,
        tracking,
        reasonDetails: null,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown sync error";
      console.log(
        `[ColissimoTracking] failed: order=${order.id} error=${errMsg}`
      );
      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        trackingNumber,
        statusBefore: order.status,
        outcome: "FAILED",
        newStatus: null,
        tracking: emptyTracking,
        reasonDetails: errMsg,
      };
    }
  });

  // Execute with concurrency pool of 3
  const results = await runPooled(tasks, 3);

  const updated = results.filter((r) => r.outcome === "UPDATED").length;
  const unchanged = results.filter((r) => r.outcome === "UNCHANGED").length;
  const failed = results.filter((r) => r.outcome === "FAILED").length;

  // Single concise summary log — no secrets
  console.log(
    `[ColissimoTracking] sync complete: mode=${mode} total=${total} eligible=${eligible} updated=${updated} unchanged=${unchanged} failed=${failed} unauthorized=${unauthorizedCount} unknownEventCode=${unknownEventCodeCount} shippedDetected=${shippedDetected} deliveredDetected=${deliveredDetected} noActiveStep=${noActiveStep} step0Annonce=${step0Annonce}`
  );

  // In auto mode, always update the last auto-sync timestamp
  if (mode === "auto") {
    await setLastColissimoAutoSyncAt(new Date());
  }

  return {
    total,
    eligible,
    updated,
    unchanged,
    failed,
    unauthorized: unauthorizedCount,
    unknownEventCode: unknownEventCodeCount,
    results,
  };
}
