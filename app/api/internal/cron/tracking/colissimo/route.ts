// app/api/internal/cron/tracking/colissimo/route.ts
/**
 * POST /api/internal/cron/tracking/colissimo
 *
 * Cron-triggered tracking sync for Colissimo orders.
 * Designed to be called by an external scheduler every 12 hours.
 *
 * Requires header: x-cron-secret matching process.env.CRON_SECRET
 */

import { NextRequest, NextResponse } from "next/server";
import { syncProcessingColissimoTracking } from "@/server/jobs/sync-colissimo-tracking";

export async function POST(request: NextRequest) {
  // Validate cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  const providedSecret = request.headers.get("x-cron-secret");
  if (providedSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await syncProcessingColissimoTracking();

    return NextResponse.json(summary);
  } catch (err) {
    console.error(
      "[CronTrackingSync] unexpected error:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { error: "Internal server error during cron tracking sync" },
      { status: 500 }
    );
  }
}
