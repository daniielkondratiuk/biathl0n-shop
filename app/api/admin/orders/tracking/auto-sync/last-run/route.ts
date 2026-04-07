// app/api/admin/orders/tracking/auto-sync/last-run/route.ts
/**
 * GET /api/admin/orders/tracking/auto-sync/last-run
 *
 * Returns the timestamp of the last automatic Colissimo tracking sync.
 * Used by the backoffice UI to display "Dernière vérification auto".
 */

import { NextResponse } from "next/server";
import { getLastColissimoAutoSyncAt } from "@/server/db/admin-job-state";

export async function GET() {
  try {
    const lastRunAt = await getLastColissimoAutoSyncAt();
    return NextResponse.json({ lastRunAt: lastRunAt?.toISOString() ?? null });
  } catch (error) {
    console.error("[AUTO_SYNC_ERROR]", error);
    return NextResponse.json(
      { lastRunAt: null },
      { status: 200 }
    );
  }
}
