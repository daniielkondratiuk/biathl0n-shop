// src/features/checkout/shared/shipping-methods.ts
/**
 * Shipping method definitions (server-side source of truth)
 */

export type ShippingMethodId = "pickup" | "delivery";
export type ShippingProviderId = "colissimo";

export interface ShippingMethod {
  id: ShippingMethodId;
  label: string;
  priceCents: number;
}

export const SHIPPING_METHODS: Record<ShippingMethodId, ShippingMethod> = {
  pickup: {
    id: "pickup",
    label: "Pickup",
    priceCents: 0,
  },
  delivery: {
    id: "delivery",
    label: "Delivery",
    priceCents: 0, // Will be set by quote
  },
};

export function getShippingMethod(id: ShippingMethodId): ShippingMethod | null {
  return SHIPPING_METHODS[id] || null;
}

export function validateShippingMethod(id: unknown): ShippingMethodId | null {
  if (typeof id === "string" && id in SHIPPING_METHODS) {
    return id as ShippingMethodId;
  }
  return null;
}
