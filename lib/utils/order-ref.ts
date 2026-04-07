// lib/utils/order-ref.ts

/**
 * Formats an order reference for display.
 * Prefers orderNumber (human-friendly) if available, otherwise falls back to shortened ID.
 * 
 * @param orderNumber - The human-friendly order number (e.g., "UF-20251230-3f9k2a1b")
 * @param id - The order ID (fallback, will be shortened)
 * @returns Formatted order reference (e.g., "Order #UF-20251230-3f9k2a1b" or "Order #cmjs…kur")
 */
export function formatOrderRef(
  orderNumber?: string | null,
  id?: string | null
): string {
  if (orderNumber) {
    return `Order #${orderNumber}`;
  }

  if (id) {
    // Shorten ID: first 4 chars, ellipsis, last 3 chars
    const shortId = `${id.slice(0, 4)}…${id.slice(-3)}`;
    return `Order #${shortId}`;
  }

  // Fallback if both are missing (shouldn't happen)
  return "Order #—";
}

/**
 * Formats an order reference without the "Order #" prefix.
 * Useful when the context already makes it clear it's an order.
 * 
 * @param orderNumber - The human-friendly order number
 * @param id - The order ID (fallback)
 * @returns Formatted order reference without prefix
 */
export function formatOrderRefShort(
  orderNumber?: string | null,
  id?: string | null
): string {
  if (orderNumber) {
    return orderNumber;
  }

  if (id) {
    // Shorten ID: first 4 chars, ellipsis, last 3 chars
    return `${id.slice(0, 4)}…${id.slice(-3)}`;
  }

  return "—";
}

