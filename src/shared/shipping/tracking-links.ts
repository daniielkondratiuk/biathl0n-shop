// src/shared/shipping/tracking-links.ts
/**
 * Carrier tracking URL helper.
 * Returns a public tracking page URL for supported carriers, or null.
 */

export function getTrackingUrl(
  carrier: string | null,
  trackingNumber: string | null
): string | null {
  if (!carrier || !trackingNumber) return null;

  // Sanitize: strip whitespace/newlines from tracking number
  const sanitized = trackingNumber.replace(/\s+/g, "");
  if (!sanitized) return null;

  const carrierLower = carrier.trim().toLowerCase();
  const tracking = encodeURIComponent(sanitized);

  if (carrierLower === "colissimo" || carrierLower.includes("colissimo")) {
    return `https://www.laposte.fr/outils/suivre-vos-envois?code=${tracking}`;
  }
  if (carrierLower.includes("ups")) {
    return `https://www.ups.com/track?tracknum=${tracking}`;
  }
  if (carrierLower.includes("fedex") || carrierLower.includes("fed ex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${tracking}`;
  }
  if (
    carrierLower.includes("usps") ||
    carrierLower.includes("united states postal")
  ) {
    return `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${tracking}`;
  }
  if (carrierLower.includes("dhl")) {
    return `https://www.dhl.com/en/express/tracking.html?AWB=${tracking}`;
  }
  if (carrierLower.includes("dpd")) {
    return `https://tracking.dpd.de/status/en_US/parcel/${tracking}`;
  }

  return null;
}
