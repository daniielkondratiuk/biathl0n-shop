// src/features/admin/orders/ui/components/orders-table.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SafeImage } from "@/features/products/ui/safe-image";
import { StatusBadge } from "@/shared/ui/admin/status-badge";
import { AvatarInitials } from "@/shared/ui/admin/avatar-initials";
import { formatOrderRefShort } from "@/lib/utils/order-ref";
import type { Order, OrderItem, Address, Payment } from "@/shared/types/prisma";

type OrderWithRelations = Order & {
  items: Partial<OrderItem>[];
  address: Partial<Address> | null;
  payment: Partial<Payment> | null;
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  orderNumber: string | null;
  notes: string | null;
};

interface OrdersTableProps {
  orders: OrderWithRelations[];
  onSelectionChange?: (selectedIds: string[]) => void;
  resetSelection?: number; // Increment this to reset selection
}

export function OrdersTable({ orders, onSelectionChange, resetSelection }: OrdersTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset selection when resetSelection changes
  // Note: onSelectionChange is intentionally NOT in deps to prevent infinite loops
  useEffect(() => {
    if (resetSelection !== undefined && resetSelection > 0) {
      setSelectedIds(new Set());
      onSelectionChange?.([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSelection]);

  function handleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      const allIds = new Set(orders.map((o) => o.id));
      setSelectedIds(allIds);
      onSelectionChange?.(Array.from(allIds));
    } else {
      setSelectedIds(new Set());
      onSelectionChange?.([]);
    }
  }

  function handleSelectOne(orderId: string, checked: boolean) {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedIds(newSelected);
    onSelectionChange?.(Array.from(newSelected));
  }

  const allSelected = orders.length > 0 && selectedIds.size === orders.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < orders.length;

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">No orders found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-border text-accent focus:ring-2 focus:ring-ring focus:ring-offset-1"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Order
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Items
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Payment
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Fulfillment
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Total
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order) => (
              <tr
                key={order.id}
                className="transition-colors hover:bg-muted/50"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(order.id)}
                    onChange={(e) => handleSelectOne(order.id, e.target.checked)}
                    className="h-4 w-4 rounded border-border text-accent focus:ring-2 focus:ring-ring focus:ring-offset-1"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono text-sm font-medium text-foreground hover:text-accent transition-colors"
                    >
                      {formatOrderRefShort(order.orderNumber, order.id)}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <AvatarInitials
                      name={order.user?.name || order.address?.fullName}
                      email={order.user?.email}
                      size="sm"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">
                        {order.address?.fullName || order.user?.name || "Guest"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {order.user?.email || order.address?.phone || "—"}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-foreground">
                    {new Date(order.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {order.items.length > 0 && order.items[0].productImage && (
                      <div className="flex -space-x-2">
                        {order.items.slice(0, 3).map((item, idx) => (
                          <div
                            key={idx}
                            className="relative h-8 w-8 overflow-hidden rounded border border-border bg-muted"
                          >
                            {item.productImage && (
                              <SafeImage
                                src={item.productImage}
                                alt={item.productName || "Product"}
                                fill
                                className="object-cover"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <span className="text-sm text-foreground">
                      {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {order.payment ? (
                    <StatusBadge status={order.payment.status || "PENDING"} type="payment" />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={order.status} type="fulfillment" />
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-semibold text-foreground">
                    {(order.total / 100).toLocaleString("en-US", {
                      style: "currency",
                      currency: order.currency || "USD",
                    })}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="text-sm font-medium text-accent hover:opacity-80 transition-colors cursor-pointer"
                  >
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

