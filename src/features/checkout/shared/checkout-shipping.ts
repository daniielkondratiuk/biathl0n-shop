// src/features/checkout/shared/checkout-shipping.ts
/**
 * Shared types for checkout shipping selection
 */

export type ShippingCarrierId = "colissimo";

export type DeliveryMode = "home" | "pickup";

export type ShippingSpeed = "standard" | "express";

export interface PickupPoint {
  id: string;
  name: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  country: string;
  distance?: string; // e.g., "0.5 km"
}

export interface ShippingSelection {
  carrierId: ShippingCarrierId;
  deliveryMode: DeliveryMode;
  speed: ShippingSpeed;
  pickupPoint?: PickupPoint;
  shippingCents: number;
}

export type PickupPointMeta = {
  geo?: { lat: number | null; lng: number | null } | null;
  // Keep raw opening hours structure for now; parsed later if needed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openingHours?: any | null;
  network?: string | null;
  type?: string | null;
  distanceMeters?: number | null;
  addressLine2?: string | null;
  accessibilityPmr?: boolean | null;
  maxWeightGrams?: number | null;
};

export type ShippingSnapshot = {
  carrierId: ShippingCarrierId;
  deliveryMode: DeliveryMode;
  speed: ShippingSpeed;
  shippingCents: number;
  pickupPoint: PickupPoint | null;
  pickupPointMeta?: PickupPointMeta | null;
};

export interface ColissimoRelayPointSearchInput {
  address: string;
  zipCode: string;
  city: string;
  countryCode?: string;
  weightGrams: number;
  shippingDate: string;
  filterRelay?: number;
  optionInter?: 0 | 1;
  requestId?: string;
  lang?: string;
}

export type ColissimoRelayPointResponse = {
  wsRequestId: string | null;
  qualiteReponse: number | null;
  errorCode: string;
  errorMessage: string | null;
  points: Array<{
    id: string;
    name: string | null;
    type: string | null;
    network: string | null;
    distanceMeters: number | null;
    address: {
      line1: string | null;
      line2: string | null;
      zipCode: string | null;
      city: string | null;
      countryCode: string | null;
    };
    geo: { lat: number | null; lng: number | null };
    openingHours: any | null; // eslint-disable-line @typescript-eslint/no-explicit-any
  }>;
};

/**
 * Calls the internal Colissimo relay points API.
 * This is a thin client used by checkout UI; it never exposes secrets.
 */
export async function fetchColissimoRelayPoints(
  input: ColissimoRelayPointSearchInput
): Promise<ColissimoRelayPointResponse> {
  const res = await fetch(
    "/api/shipping/colissimo/points-retrait",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );

  const json = await res.json();

  if (!res.ok) {
    // Surface backend-normalized error to callers; they can inspect errorCode/message
    throw new Error(
      json?.errorMessage ||
        json?.error ||
        "Failed to fetch Colissimo relay points"
    );
  }

  return json as ColissimoRelayPointResponse;
}
