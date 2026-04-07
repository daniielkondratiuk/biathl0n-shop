// src/features/orders/lib/order-status-label.ts
export function getOrderStatusLabelKey(status: string): string {
  const s = (status ?? "").toString().trim().toUpperCase();

  switch (s) {
    case "PENDING":
      return "status.pending";
    case "PAID":
      return "status.paid";
    case "PROCESSING":
      return "status.processing";
    case "SHIPPED":
      return "status.shipped";
    case "DELIVERED":
      return "status.delivered";
    case "CANCELLED":
    case "CANCELED":
      return "status.cancelled";
    case "REFUNDED":
      return "status.refunded";
    default:
      return "status.unknown";
  }
}

