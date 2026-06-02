// lib/constants/eu-countries.ts
/**
 * EU customs helpers for Colissimo international shipping.
 *
 * Intra-EU shipments do NOT need a CN23 customs declaration; everything else
 * does — including non-EU countries (CH, GB, US, …) and the French overseas
 * territories (GP, MQ, GF, RE, YT), which use their own ISO codes and sit
 * outside the EU customs/VAT territory.
 */

/** The 27 EU member states (ISO 3166-1 alpha-2). */
export const EU_COUNTRIES: ReadonlySet<string> = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

/**
 * Countries Colissimo treats as domestic/EU for customs purposes — no CN23.
 * Monaco (MC) ships as mainland France.
 */
const CUSTOMS_FREE_COUNTRIES: ReadonlySet<string> = new Set([
  ...EU_COUNTRIES,
  "MC",
]);

function normalize(cc: string | null | undefined): string {
  return (cc || "").trim().toUpperCase();
}

/** True if the country is an EU member state. */
export function isEuCountry(cc: string | null | undefined): boolean {
  return EU_COUNTRIES.has(normalize(cc));
}

/**
 * True if a Colissimo shipment to this country requires a CN23 customs
 * declaration. False for EU members and Monaco; true for everything else
 * (incl. DOM-TOM and all non-EU destinations).
 */
export function shipmentNeedsCustoms(cc: string | null | undefined): boolean {
  return !CUSTOMS_FREE_COUNTRIES.has(normalize(cc));
}
