// src/features/invoices/server/shipping-snapshot.ts
/**
 * Helper to parse shipping snapshot from Order.notes
 * Shared between admin UI and invoice generation
 */

export interface PickupPoint {
  id: string;
  name: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  country: string;
  distance?: string;
}

export interface ShippingSnapshot {
  carrierId: string;
  deliveryMode: "home" | "pickup";
  speed: "standard" | "express";
  shippingCents: number;
  pickupPoint: PickupPoint | null;
}

/**
 * Parse shipping snapshot from order notes
 * Format: [SHIPPING_SNAPSHOT]{...JSON...}
 * Returns null if notes is missing, snapshot not found, or JSON is invalid
 */
export function parseShippingSnapshotFromNotes(
  notes: string | null | undefined
): ShippingSnapshot | null {
  if (!notes) return null;
  
  const snapshotMatch = notes.match(/\[SHIPPING_SNAPSHOT\](.+)/);
  if (!snapshotMatch) return null;
  
  try {
    const parsed = JSON.parse(snapshotMatch[1]) as ShippingSnapshot;
    return parsed;
  } catch {
    return null;
  }
}
