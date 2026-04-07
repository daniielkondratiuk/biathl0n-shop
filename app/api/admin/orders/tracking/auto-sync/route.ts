// app/api/admin/orders/tracking/auto-sync/route.ts
/**
 * POST /api/admin/orders/tracking/auto-sync
 *
 * Auto-sync endpoint for Colissimo tracking (admin-only).
 * Same logic as manual sync but mode="auto" → updates lastAutoSyncAt.
 * Intended for future cron invocation.
 */

import { NextResponse } from "next/server";
import { syncProcessingColissimoTracking } from "@/server/jobs/sync-colissimo-tracking";

export async function POST() {
  try {
    const summary = await syncProcessingColissimoTracking({ mode: "auto" });
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[AUTO_SYNC_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error during auto tracking sync" },
      { status: 500 }
    );
  }
}
