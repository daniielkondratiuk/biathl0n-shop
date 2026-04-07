// src/features/admin/orders/ui/components/orders-filters.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ControlledSearch } from "./controlled-search";

export function OrdersFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const paymentStatus = searchParams.get("payment") || "";
  const fulfillmentStatus = searchParams.get("fulfillment") || "";
  const dateRange = searchParams.get("range") || "";

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1"); // Reset to first page
    // Use replace instead of push to avoid navigation and re-renders
    router.replace(`/admin/orders?${params.toString()}`);
  }

  return (
    <div className="rounded-lg border border-border bg-muted p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {/* Search */}
        <div className="md:col-span-2">
          <ControlledSearch placeholder="Search by order ID, number, customer, email, or product..." />
        </div>

        {/* Payment Status */}
        <select
          value={paymentStatus}
          onChange={(e) => updateFilter("payment", e.target.value)}
          className="rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
        >
          <option value="">All Payment Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>

        {/* Fulfillment Status */}
        <select
          value={fulfillmentStatus}
          onChange={(e) => updateFilter("fulfillment", e.target.value)}
          className="rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
        >
          <option value="">All Fulfillment Status</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="PROCESSING">Processing</option>
          <option value="SHIPPED">Shipped</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELED">Canceled</option>
        </select>

        {/* Date Range */}
        <select
          value={dateRange}
          onChange={(e) => updateFilter("range", e.target.value)}
          className="rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
        >
          <option value="">All Time</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="month">This month</option>
        </select>
      </div>
    </div>
  );
}

