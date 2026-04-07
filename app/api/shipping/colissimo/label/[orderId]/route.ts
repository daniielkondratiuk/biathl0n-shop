import { NextRequest, NextResponse } from "next/server";
import { mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { prisma } from "@/server/db/prisma";
import { getCompanyProfile } from "@/features/admin/company/server/company-profile";
import {
  createColissimoLabelFromOrder,
  getColissimoSenderFromCompanyProfile,
} from "@/server/integrations/colissimo-sls";
import { FALLBACK_WEIGHT_GRAMS_PER_ITEM } from "@/features/cart/server/cart-weight";
import type { ShippingSnapshot } from "@/features/checkout/shared/checkout-shipping";

function extractShippingSnapshot(notes: string | null): ShippingSnapshot | null {
  if (!notes) return null;
  const marker = "[SHIPPING_SNAPSHOT]";
  const idx = notes.indexOf(marker);
  if (idx === -1) return null;

  const jsonPart = notes.slice(idx + marker.length).trim();
  if (!jsonPart) return null;

  try {
    const parsed = JSON.parse(jsonPart) as ShippingSnapshot;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const isDev = process.env.NODE_ENV !== "production";

  if (!orderId) {
    return NextResponse.json(
      { error: "orderId is required" },
      { status: 400 }
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      address: true,
      items: true,
    },
  });

  if (!order) {
    return NextResponse.json(
      { error: "Order not found" },
      { status: 404 }
    );
  }

  // 1) Status validation
  if (order.status !== "PAID") {
    return NextResponse.json(
      { error: "Label can only be generated for PAID orders" },
      { status: 400 }
    );
  }

  // 2) Idempotency — prevent duplicate generation
  if (order.labelPath) {
    return NextResponse.json(
      { error: "Label already generated for this order" },
      { status: 409 }
    );
  }

  const companyProfile = await getCompanyProfile();
  if (!companyProfile) {
    return NextResponse.json(
      { error: "Company profile is not configured for Colissimo sender" },
      { status: 500 }
    );
  }

  const missingSenderFields: string[] = [];
  if (!companyProfile.legalName && !companyProfile.brandName) {
    missingSenderFields.push("legalName/brandName");
  }
  if (!companyProfile.addressLine1) {
    missingSenderFields.push("addressLine1");
  }
  if (!companyProfile.postalCode) {
    missingSenderFields.push("postalCode");
  }
  if (!companyProfile.city) {
    missingSenderFields.push("city");
  }
  if (!companyProfile.country) {
    missingSenderFields.push("country");
  }

  if (missingSenderFields.length > 0) {
    return NextResponse.json(
      {
        error:
          "Company profile is missing required sender fields for Colissimo",
        missingFields: missingSenderFields,
      },
      { status: 500 }
    );
  }

  const sender = getColissimoSenderFromCompanyProfile(companyProfile);

  const snapshot = extractShippingSnapshot(order.notes);
  if (!snapshot) {
    return NextResponse.json(
      { error: "Missing SHIPPING_SNAPSHOT in order notes" },
      { status: 400 }
    );
  }

  if (snapshot.carrierId !== "colissimo") {
    return NextResponse.json(
      { error: "Order is not using Colissimo carrier" },
      { status: 400 }
    );
  }

  if (snapshot.deliveryMode === "pickup") {
    if (!snapshot.pickupPoint) {
      return NextResponse.json(
        { error: "Colissimo pickup requires pickupPoint in snapshot" },
        { status: 400 }
      );
    }
    const missingPickup: string[] = [];
    if (!snapshot.pickupPoint.addressLine1) missingPickup.push("addressLine1");
    if (!snapshot.pickupPoint.postalCode) missingPickup.push("postalCode");
    if (!snapshot.pickupPoint.city) missingPickup.push("city");
    if (missingPickup.length > 0) {
      return NextResponse.json(
        {
          error: "Pickup point is missing required address fields",
          missingFields: missingPickup,
        },
        { status: 400 }
      );
    }
  }

  const addr = order.address ?? null;
  if (!addr) {
    return NextResponse.json(
      { error: "Order has no shipping address snapshot" },
      { status: 400 }
    );
  }

  // Build recipient: pickup uses pickup point address, home uses customer address.
  // Customer fullName is always used so the label shows the recipient's name.
  const isPickup = snapshot.deliveryMode === "pickup" && snapshot.pickupPoint;
  const recipient = isPickup
    ? {
        fullName: addr.fullName,
        phone: addr.phone,
        line1: snapshot.pickupPoint!.addressLine1,
        line2: ((snapshot.pickupPoint as unknown as Record<string, unknown>).addressLine2 as string) ?? null,
        postalCode: snapshot.pickupPoint!.postalCode,
        city: snapshot.pickupPoint!.city,
        country: snapshot.pickupPoint!.country ?? "FR",
      }
    : {
        fullName: addr.fullName,
        phone: addr.phone,
        line1: addr.line1,
        line2: addr.line2 ?? null,
        postalCode: addr.postalCode,
        city: addr.city,
        country: addr.country,
      };

  const weightGrams =
    order.items && order.items.length
      ? order.items.reduce(
          (sum, item) => sum + FALLBACK_WEIGHT_GRAMS_PER_ITEM * item.quantity,
          0
        )
      : 500;

  // Default to "standard" if speed is missing or unknown
  const speed =
    typeof snapshot.speed === "string" && snapshot.speed.trim()
      ? snapshot.speed.trim().toLowerCase()
      : "standard";

  const result = await createColissimoLabelFromOrder({
    orderId: order.id,
    orderNumber: order.orderNumber ?? `predators-${order.id.slice(0, 8).toUpperCase()}`,
    sender,
    recipient,
    deliveryMode: snapshot.deliveryMode,
    pickupPointId: snapshot.pickupPoint?.id ?? null,
    weightGrams,
    speed,
  });

  // Gate on presence of tracking + PDF (not error code strings)
  if (!result.trackingNumber || !result.labelPdfBase64) {
    return NextResponse.json(
      {
        error: result.errorCode === "0"
          ? "Colissimo SLS did not return tracking number or label"
          : "Colissimo SLS error",
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        ...(isDev ? { hint: "Check server console for [Colissimo SLS] logs" } : {}),
      },
      { status: 502 }
    );
  }

  // Tracking already sanitized by colissimo-sls.ts
  const sanitizedTracking = result.trackingNumber;

  // 3) Atomic file save — write file then update DB; rollback file on DB failure
  const dir = "storage/colissimo/labels";
  const fileName = `${order.orderNumber ?? order.id}.pdf`;
  const filePath = `${dir}/${fileName}`;

  mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, Buffer.from(result.labelPdfBase64, "base64"));

  try {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PROCESSING",
        carrier: "colissimo",
        trackingNumber: sanitizedTracking,
        labelPath: filePath,
        labelGeneratedAt: new Date(),
      },
    });
  } catch (err) {
    // Rollback: remove orphan file if DB update fails
    try {
      unlinkSync(filePath);
    } catch {
      // best-effort cleanup
    }
    throw err;
  }

  // 4) Audit log
  await prisma.auditLog.create({
    data: {
      action: "ORDER_LABEL_GENERATED",
      entityType: "Order",
      entityId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        trackingNumber: sanitizedTracking,
      },
    },
  });

  // 5) Response
  return NextResponse.json({
    trackingNumber: sanitizedTracking,
  });
}
