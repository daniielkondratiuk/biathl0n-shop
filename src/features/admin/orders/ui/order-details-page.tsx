// src/features/admin/orders/ui/order-details-page.tsx
"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { StatusBadge } from "@/shared/ui/admin/status-badge";
import { OrderTimeline } from "./components/order-timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/shared/ui/admin/toast-provider";
import { formatOrderRefShort } from "@/lib/utils/order-ref";
import { getCountryName } from "@/lib/constants/countries";

type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELED";

interface OrderItem {
  id: string;
  productName: string;
  productImage: string | null;
  variantLabel: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Address {
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
}

interface Payment {
  id: string;
  status: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface PickupPoint {
  id: string;
  name: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  country: string;
  distance?: string;
}

interface ShippingSnapshot {
  carrierId: string;
  deliveryMode: "home" | "pickup";
  speed: "standard" | "express";
  shippingCents: number;
  pickupPoint: PickupPoint | null;
}

interface Order {
  id: string;
  orderNumber: string | null;
  status: OrderStatus;
  total: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  address: Address | null;
  payment: Payment | null;
  user: User | null;
  stripeCheckoutSessionId: string | null;
  notes: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  labelPath: string | null;
  labelGeneratedAt: string | null;
  invoice: { id: string } | null;
}

interface OrderDetailsPageProps {
  orderId: string;
}

export function OrderDetailsPage({ orderId }: OrderDetailsPageProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingLabel, setGeneratingLabel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");

  async function fetchOrder() {
    const res = await fetch(`/api/orders/${orderId}`);
    if (!res.ok) throw new Error("Order not found.");
    const data = await res.json();
    setOrder(data.order);
    setTrackingNumber(data.order.trackingNumber || "");
    setCarrier(data.order.carrier || "");
  }

  useEffect(() => {
    fetchOrder()
      .catch(() => setError("Failed to load order."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function handleStatusChange(e: ChangeEvent<HTMLSelectElement>) {
    if (!order) return;
    const newStatus = e.target.value as OrderStatus;
    
    // Confirm status changes
    if (newStatus !== order.status) {
      const confirmed = confirm(
        `Are you sure you want to change order status from ${order.status} to ${newStatus}?`
      );
      if (!confirmed) {
        e.target.value = order.status;
        return;
      }
    }
    
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      
      const data = await res.json().catch(() => null);
      
      if (!res.ok) {
        const errorMessage = data?.error ?? "Failed to update order status.";
        setError(errorMessage);
        showToast(errorMessage, "error");
        setSaving(false);
        return;
      }
      
      // Only show success if response is ok and we have order data
      if (data?.order) {
        setOrder({ ...order, status: data.order.status });
        showToast(`Order status updated to ${newStatus}`, "success");
        router.refresh(); // Refresh to get latest data
      } else {
        setError("Failed to update order status.");
        showToast("Failed to update order status.", "error");
      }
      setSaving(false);
    } catch {
      setError("Unexpected error. Please try again.");
      showToast("Failed to update order status.", "error");
      setSaving(false);
    }
  }

  async function handleTrackingUpdate() {
    if (!order) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumber, carrier }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to update tracking.");
        setSaving(false);
        return;
      }
      const updated = await res.json();
      setOrder({ ...order, trackingNumber: updated.order.trackingNumber, carrier: updated.order.carrier });
      showToast("Tracking information updated", "success");
      setSaving(false);
    } catch {
      setError("Unexpected error. Please try again.");
      showToast("Failed to update tracking information.", "error");
      setSaving(false);
    }
  }

  async function handleGenerateLabel() {
    if (!order) return;
    setGeneratingLabel(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/shipping/colissimo/label/${order.id}`,
        { method: "POST" }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data?.error ?? data?.errorMessage ?? "Failed to generate label";
        setError(msg);
        showToast(msg, "error");
        setGeneratingLabel(false);
        return;
      }
      showToast("Colissimo label generated successfully", "success");
      // Refetch full order to get labelPath, trackingNumber, status from server
      await fetchOrder();
      router.refresh();
    } catch {
      setError("Unexpected error generating label.");
      showToast("Failed to generate Colissimo label.", "error");
    } finally {
      setGeneratingLabel(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  }

  // Import shared shipping snapshot parser
  // Note: This is a client component, so we can't import server-only code directly
  // For now, keep the parsing logic here (same implementation as server helper)
  function parseShippingSnapshot(notes: string | null): ShippingSnapshot | null {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">
          {error ?? "Order not found."}
        </p>
      </div>
    );
  }

  const subtotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const shippingSnapshot = parseShippingSnapshot(order.notes);
  const shipping = shippingSnapshot?.shippingCents ?? 0;
  const total = order.total;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">
              {formatOrderRefShort(order.orderNumber, order.id)}
            </h1>
            <StatusBadge status={order.status} type="fulfillment" />
            {order.payment && (
              <StatusBadge status={order.payment.status} type="payment" />
            )}
          </div>
          <div className="mt-2 flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Placed on {new Date(order.createdAt).toLocaleString()}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(order.id)}
              className="h-6 text-xs"
            >
              Copy ID
            </Button>
            {order.orderNumber && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(order.orderNumber!)}
                className="h-6 text-xs"
              >
                Copy Order #
              </Button>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/orders")}
          className="text-sm"
        >
          ← Back to Orders
        </Button>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Timeline & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Timeline */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <OrderTimeline
              status={order.status}
              createdAt={new Date(order.createdAt)}
              updatedAt={new Date(order.updatedAt)}
            />
          </div>

          {/* Order Items */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              Order Items
            </h3>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  {item.productImage && (
                    <div className="relative h-16 w-16 overflow-hidden rounded border border-border bg-muted">
                      <Image
                        src={item.productImage}
                        alt={item.productName}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {item.productName}
                    </p>
                    {item.variantLabel && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.variantLabel}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Quantity: {item.quantity} ×{" "}
                      {(item.unitPrice / 100).toLocaleString("en-US", {
                        style: "currency",
                        currency: order.currency || "USD",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {(item.totalPrice / 100).toLocaleString("en-US", {
                        style: "currency",
                        currency: order.currency || "USD",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Details */}
          {order.user && (
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-foreground">
                Customer
              </h3>
              <div className="space-y-2 text-sm">
                <p className="text-foreground">
                  <span className="font-medium">Name:</span> {order.user.name || "—"}
                </p>
                <p className="text-foreground">
                  <span className="font-medium">Email:</span> {order.user.email}
                </p>
              </div>
            </div>
          )}

          {/* Shipping: carrier info when present; 2-col grid — Customer (left), Pickup (right, only if pickup) */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              Shipping
            </h3>
            {shippingSnapshot && (
              <div className="mb-6 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Carrier</span>
                  <span className="font-medium text-foreground">
                    {shippingSnapshot.carrierId === "colissimo" ? "Colissimo" : shippingSnapshot.carrierId}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Delivery Mode</span>
                  <span className="font-medium text-foreground capitalize">
                    {shippingSnapshot.deliveryMode}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Speed</span>
                  <span className="font-medium text-foreground capitalize">
                    {shippingSnapshot.speed}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Shipping Price</span>
                  <span className="font-medium text-foreground">
                    {shippingSnapshot.shippingCents === 0
                      ? "Free"
                      : (shippingSnapshot.shippingCents / 100).toLocaleString("en-US", {
                          style: "currency",
                          currency: order.currency || "EUR",
                        })}
                  </span>
                </div>
              </div>
            )}
            <div
              className={
                shippingSnapshot?.deliveryMode === "pickup" && shippingSnapshot.pickupPoint
                  ? "grid gap-8 md:grid-cols-2"
                  : "grid gap-8"
              }
            >
              <section>
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Customer address
                </p>
                {order.address ? (
                  <div className="space-y-1 text-sm text-foreground">
                    <p>{order.address.fullName}</p>
                    <p>{order.address.line1}</p>
                    {order.address.line2 != null && String(order.address.line2).trim() !== "" && (
                      <p>{order.address.line2}</p>
                    )}
                    {(() => {
                      const s = [order.address.postalCode, order.address.city].filter(Boolean).join(" ");
                      return s ? <p>{s}</p> : null;
                    })()}
                    {getCountryName(order.address.country) && (
                      <p>{getCountryName(order.address.country)}</p>
                    )}
                    {order.address.phone != null && String(order.address.phone).trim() !== "" && (
                      <p className="mt-2 text-muted-foreground">Phone: {order.address.phone}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No billing address on file</p>
                )}
              </section>
              {shippingSnapshot?.deliveryMode === "pickup" && shippingSnapshot.pickupPoint && (
                <section>
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Pickup point address
                  </p>
                  <div className="space-y-1 text-sm text-foreground">
                    <p className="font-medium">{shippingSnapshot.pickupPoint.name}</p>
                    <p>{shippingSnapshot.pickupPoint.addressLine1}</p>
                    <p>
                      {shippingSnapshot.pickupPoint.postalCode} {shippingSnapshot.pickupPoint.city}
                    </p>
                    {getCountryName(shippingSnapshot.pickupPoint.country) && (
                      <p>{getCountryName(shippingSnapshot.pickupPoint.country)}</p>
                    )}
                    {shippingSnapshot.pickupPoint.distance && (
                      <p className="mt-2 text-muted-foreground">
                        Distance: {shippingSnapshot.pickupPoint.distance}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      ID: {shippingSnapshot.pickupPoint.id}
                    </p>
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* Order Notes (excluding shipping snapshot) */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              Order Notes
            </h3>
            <div className="text-sm text-foreground">
              {order.notes ? (() => {
                // Remove shipping snapshot from display
                const notesWithoutSnapshot = order.notes.replace(/\[SHIPPING_SNAPSHOT\].*$/, "").trim();
                return notesWithoutSnapshot ? (
                  <p className="whitespace-pre-wrap">{notesWithoutSnapshot}</p>
                ) : (
                  <p className="text-muted-foreground">No notes</p>
                );
              })() : (
                <p className="text-muted-foreground">No notes</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Summary & Actions */}
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              Order Summary
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-foreground">
                  {(subtotal / 100).toLocaleString("en-US", {
                    style: "currency",
                    currency: order.currency || "USD",
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium text-foreground">
                  {shipping === 0
                    ? "Free"
                    : (shipping / 100).toLocaleString("en-US", {
                        style: "currency",
                        currency: order.currency || "EUR",
                      })}
                </span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="text-lg font-semibold text-foreground">
                    {(total / 100).toLocaleString("en-US", {
                      style: "currency",
                      currency: order.currency || "USD",
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          {order.payment && (
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-foreground">
                Payment Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={order.payment.status} type="payment" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Provider</span>
                  <span className="font-medium text-foreground">Stripe</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-foreground">
                      {order.payment.providerPaymentId.slice(0, 20)}...
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(order.payment!.providerPaymentId)}
                      className="h-5 text-xs"
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                {order.stripeCheckoutSessionId && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Session ID</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-foreground">
                        {order.stripeCheckoutSessionId.slice(0, 20)}...
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(order.stripeCheckoutSessionId!)}
                        className="h-5 text-xs"
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fulfillment Actions */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              Fulfillment
            </h3>
            <div className="space-y-4">
              {/* Invoice PDF Button */}
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    window.open(`/api/orders/${order.id}/invoice/pdf`, "_blank");
                  }}
                >
                  {order.invoice ? "Download Invoice" : "Get Invoice"}
                </Button>
                {!order.invoice && (
                  <p className="mt-1 text-xs text-muted-foreground text-center">
                    Invoice will be generated on demand
                  </p>
                )}
              </div>

              {/* Colissimo Label Actions */}
              {shippingSnapshot?.carrierId === "colissimo" && (
                <div className="space-y-2">
                  {order.status === "PAID" && !order.labelPath && (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={handleGenerateLabel}
                      disabled={generatingLabel}
                    >
                      {generatingLabel ? "Generating..." : "Generate Colissimo Label"}
                    </Button>
                  )}
                  {order.labelPath && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        window.open(`/api/admin/orders/${order.id}/label`, "_blank");
                      }}
                    >
                      Open Label (PDF)
                    </Button>
                  )}
                  {order.labelGeneratedAt && (
                    <p className="text-xs text-muted-foreground text-center">
                      Label generated {new Date(order.labelGeneratedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-medium text-foreground">
                  Update Status
                </label>
                <select
                  value={order.status}
                  onChange={handleStatusChange}
                  disabled={saving}
                  className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                >
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="SHIPPED">Shipped</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CANCELED">Canceled</option>
                </select>
              </div>

              {/* Tracking Number */}
              <div>
                <label className="mb-2 block text-xs font-medium text-foreground">
                  Tracking Number
                </label>
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="text-sm"
                />
              </div>

              {/* Carrier */}
              <div>
                <label className="mb-2 block text-xs font-medium text-foreground">
                  Carrier
                </label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  disabled={carrier === "colissimo"}
                  className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-60"
                >
                  <option value="">Select carrier</option>
                  <option value="colissimo">Colissimo</option>
                  <option value="UPS">UPS</option>
                  <option value="FedEx">FedEx</option>
                  <option value="USPS">USPS</option>
                  <option value="DHL">DHL</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {(trackingNumber !== (order.trackingNumber ?? "") || carrier !== (order.carrier ?? "")) && (
                <Button
                  onClick={handleTrackingUpdate}
                  disabled={saving}
                  size="sm"
                  className="w-full"
                >
                  {saving ? "Saving..." : "Update Tracking"}
                </Button>
              )}

              {error && (
                <p className="text-xs text-error">{error}</p>
              )}
              {saving && (
                <p className="text-xs text-muted-foreground">Saving...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

