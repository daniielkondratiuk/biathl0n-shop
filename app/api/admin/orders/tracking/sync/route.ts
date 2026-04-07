// app/api/admin/orders/tracking/sync/route.ts
/**
 * POST /api/admin/orders/tracking/sync
 *
 * Manual tracking sync for Colissimo orders (admin-only).
 * Body: { orderIds?: string[] }
 *
 * Syncs PROCESSING orders with carrier "colissimo" and a non-empty trackingNumber.
 * Returns enriched results with tracking step details so the caller can see
 * exactly why each order was updated / unchanged / failed.
 */

import { NextRequest, NextResponse } from "next/server";
import { syncProcessingColissimoTracking } from "@/server/jobs/sync-colissimo-tracking";

export async function POST(request: NextRequest) {
  // Parse body
  let body: { orderIds?: string[] } = {};
  try {
    body = (await request.json()) as { orderIds?: string[] };
  } catch {
    // Empty body is fine — means sync all eligible
  }

  // Validate orderIds if present
  if (body.orderIds !== undefined) {
    if (
      !Array.isArray(body.orderIds) ||
      body.orderIds.some((id) => typeof id !== "string")
    ) {
      return NextResponse.json(
        { error: "orderIds must be an array of strings" },
        { status: 400 }
      );
    }
    if (body.orderIds.length === 0) {
      return NextResponse.json(
        { error: "orderIds array is empty" },
        { status: 400 }
      );
    }
  }

  try {
    const summary = await syncProcessingColissimoTracking({
      orderIds: body.orderIds,
    });

    return NextResponse.json(summary);
  } catch (err) {
    console.error(
      "[TrackingSync] unexpected error:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { error: "Internal server error during tracking sync" },
      { status: 500 }
    );
  }
}
