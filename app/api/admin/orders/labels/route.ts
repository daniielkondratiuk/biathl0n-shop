import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

// ── Carrier → single-label endpoint mapping (single source of truth) ────────
const CARRIER_ENDPOINTS: Record<string, (orderId: string) => string> = {
  colissimo: (id) => `/api/shipping/colissimo/label/${id}`,
  // chronopost: (id) => `/api/shipping/chronopost/label/${id}`,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractCarrierFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  const marker = "[SHIPPING_SNAPSHOT]";
  const idx = notes.indexOf(marker);
  if (idx === -1) return null;
  const jsonPart = notes.slice(idx + marker.length).trim();
  if (!jsonPart) return null;
  try {
    const parsed = JSON.parse(jsonPart);
    return typeof parsed?.carrierId === "string" ? parsed.carrierId : null;
  } catch {
    return null;
  }
}

interface BulkLabelResult {
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

/** Run async tasks with bounded concurrency. */
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

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { orderIds } = body as { orderIds?: unknown };

  if (
    !Array.isArray(orderIds) ||
    orderIds.length === 0 ||
    !orderIds.every((id) => typeof id === "string")
  ) {
    return NextResponse.json(
      { error: "orderIds must be a non-empty array of strings" },
      { status: 400 }
    );
  }

  const uniqueIds = [...new Set(orderIds as string[])];

  if (uniqueIds.length > 50) {
    return NextResponse.json(
      { error: "Maximum 50 orders per batch" },
      { status: 400 }
    );
  }

  // Load orders from DB
  const orders = await prisma.order.findMany({
    where: { id: { in: uniqueIds } },
  });

  // Index by id for O(1) lookup
  const orderMap = new Map(orders.map((o) => [o.id, o]));

  // Build origin for internal fetch calls
  const origin = new URL(request.url).origin;
  const cookieHeader = request.headers.get("cookie") ?? "";

  // Categorise orders into immediate results (skipped/failed) and tasks (eligible)
  const immediateResults: BulkLabelResult[] = [];
  const tasks: (() => Promise<BulkLabelResult>)[] = [];

  for (const id of uniqueIds) {
    const order = orderMap.get(id);

    if (!order) {
      immediateResults.push({
        orderId: id,
        carrier: null,
        status: "skipped",
        reason: "ORDER_NOT_FOUND",
        reasonDetails: "Order ID not found in database",
      });
      continue;
    }

    // Access fields that may not yet be in generated Prisma types
    const rec = order as Record<string, unknown>;
    const orderStatus = (rec.status as string) ?? "";
    const labelPath = rec.labelPath as string | null | undefined;
    const orderCarrier = rec.carrier as string | null | undefined;
    const orderNotes = rec.notes as string | null | undefined;
    const orderNumber = rec.orderNumber as string | null | undefined;

    // Eligibility: PAID + no existing label
    if (orderStatus !== "PAID" || labelPath) {
      const reason = labelPath ? "LABEL_ALREADY_EXISTS" : `STATUS_${orderStatus}`;
      immediateResults.push({
        orderId: id,
        carrier: orderCarrier ?? null,
        orderNumber,
        status: "skipped",
        reason,
        reasonDetails: labelPath
          ? "Label has already been generated for this order"
          : `Order status is "${orderStatus}", expected "PAID"`,
      });
      continue;
    }

    // Determine carrier: prefer order.carrier, then SHIPPING_SNAPSHOT.carrierId
    const carrier =
      (orderCarrier && orderCarrier.trim()) ||
      extractCarrierFromNotes(orderNotes ?? null) ||
      null;

    if (!carrier || !CARRIER_ENDPOINTS[carrier]) {
      const hasCarrierButNoEndpoint = !!carrier && !CARRIER_ENDPOINTS[carrier];
      immediateResults.push({
        orderId: id,
        carrier,
        orderNumber,
        status: "failed",
        errorCode: "UNSUPPORTED_CARRIER",
        errorMessage: carrier
          ? `Carrier "${carrier}" is not supported for label generation`
          : "No carrier found for this order",
        reasonDetails: hasCarrierButNoEndpoint
          ? `Carrier "${carrier}" resolved but no endpoint is configured in CARRIER_ENDPOINTS`
          : "Neither order.carrier nor SHIPPING_SNAPSHOT.carrierId could be resolved",
      });
      continue;
    }

    // Build task for this order
    const endpoint = CARRIER_ENDPOINTS[carrier](id);
    const carrierName = carrier;

    tasks.push(async (): Promise<BulkLabelResult> => {
      try {
        const res = await fetch(`${origin}${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(cookieHeader ? { cookie: cookieHeader } : {}),
          },
        });

        if (res.ok) {
          let trackingNumber: string | null = null;
          try {
            const data = await res.json();
            trackingNumber = data.trackingNumber ?? null;
          } catch {
            // response wasn't JSON — label may still have been generated
          }
          return {
            orderId: id,
            carrier: carrierName,
            orderNumber,
            status: "success",
            httpStatus: res.status,
            trackingNumber,
          };
        }

        // Non-OK response
        let errorCode: string | undefined;
        let errorMessage: string | undefined;
        try {
          const data = await res.json();
          errorCode = data.errorCode ?? data.error ?? undefined;
          errorMessage =
            data.errorMessage ?? data.error ?? `HTTP ${res.status}`;
        } catch {
          try {
            const text = await res.text();
            errorMessage = text.slice(0, 400);
          } catch {
            errorMessage = `HTTP ${res.status}`;
          }
        }

        return {
          orderId: id,
          carrier: carrierName,
          orderNumber,
          status: "failed",
          httpStatus: res.status,
          errorCode,
          errorMessage,
        };
      } catch (err) {
        return {
          orderId: id,
          carrier: carrierName,
          orderNumber,
          status: "failed",
          errorMessage:
            err instanceof Error ? err.message : "Network error",
        };
      }
    });
  }

  // Execute eligible tasks with concurrency pool (max 3 parallel)
  const taskResults = await runPooled(tasks, 3);

  const allResults = [...immediateResults, ...taskResults];

  const success = allResults.filter((r) => r.status === "success").length;
  const failed = allResults.filter((r) => r.status === "failed").length;
  const skipped = allResults.filter((r) => r.status === "skipped").length;

  return NextResponse.json({
    total: uniqueIds.length,
    eligible: tasks.length,
    success,
    failed,
    skipped,
    results: allResults,
  });
}
