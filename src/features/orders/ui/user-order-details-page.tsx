// src/features/orders/ui/user-order-details-page.tsx
import Link from "next/link";
import { SafeImage } from "@/features/products/ui/safe-image";
import { notFound } from "next/navigation";
import { getUserOrderById } from "@/features/orders";
import { ArrowLeft, Download } from "lucide-react";
import { OrderStatusSteps } from "@/features/account";
import { formatOrderRef } from "@/lib/utils/order-ref";
import { createInvoiceForOrder, getInvoiceByOrderId } from "@/features/invoices";
import { getLocale, getTranslations } from "next-intl/server";
import { getOrderStatusLabelKey } from "../lib/order-status-label";
import { getTrackingUrl } from "@/shared/shipping/tracking-links";
import { parseShippingSnapshotFromNotes } from "@/features/invoices/server/shipping-snapshot";

function getStatusBadgeColor(status: string) {
  switch (status) {
    case "DELIVERED":
      return "bg-green-500/90 dark:bg-green-500/40 text-black dark:text-white";
    case "SHIPPED":
      return "bg-purple-500/90 dark:bg-purple-500/40 text-black dark:text-white";
    case "PROCESSING":
      return "bg-blue-500/90 dark:bg-blue-500/40 text-black dark:text-white";
    case "CANCELED":
      return "bg-red-500/90 dark:bg-red-500/40 text-black dark:text-white";
    case "PAID":
      return "bg-green-500/90 dark:bg-green-500/40 text-black dark:text-white";
    case "PENDING":
      return "bg-amber-500/90 dark:bg-amber-500/40 text-black dark:text-white";
    default:
      return "bg-gray-300/90 dark:bg-gray-700/40 text-black dark:text-white";
  }
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface UserOrderDetailsPageProps {
  userId: string;
  orderId: string;
}

export async function UserOrderDetailsPage({ userId, orderId }: UserOrderDetailsPageProps) {
  const locale = await getLocale();
  const prefix = `/${locale}`;
  const t = await getTranslations("orders");
  const tDetails = await getTranslations("orders");
  const order = await getUserOrderById(userId, orderId);

  if (!order) {
    notFound();
  }

  // Ensure invoice exists for PAID orders (idempotent)
  let invoiceId: string | null = null;
  try {
    // Try to get existing invoice first
    const invoice = await getInvoiceByOrderId(order.id);
    
    // If no invoice exists and order is PAID, create it (idempotent)
    if (!invoice && order.status === "PAID") {
      const createResult = await createInvoiceForOrder({ orderId: order.id });
      if (!("status" in createResult)) {
        invoiceId = createResult.invoice.id;
      }
    }
    
    if (!invoiceId && invoice) {
      invoiceId = invoice.id;
    }
  } catch (error) {
    // Log but don't fail the page if invoice creation fails
    console.error(`[user-order-details] Error ensuring invoice for order ${order.id}:`, error);
  }

  // Calculate subtotal (sum of all item prices)
  const subtotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const total = order.total;
  // Read shipping cost from snapshot persisted in order notes
  const shippingSnapshot = parseShippingSnapshotFromNotes(order.notes);
  const shippingCents = shippingSnapshot?.shippingCents ?? null;

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <Link
        href={`${prefix}/dashboard/orders`}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {tDetails("backToOrders")}
      </Link>

      {/* Order Header */}
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-4 md:p-6">
          <div className="space-y-3">
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {t("orderDetails")}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatOrderRef(order.orderNumber, order.id)}
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm md:flex-row md:items-center md:justify-between">
              <p className="text-muted-foreground">
                {t("placedOn", { date: formatDate(order.createdAt) })}
              </p>
              <div className="flex items-center gap-2">
              <span
                className={`inline-flex w-fit items-center rounded-md px-2 py-0.5 text-xs font-medium border border-black/10 dark:border-white/15 ${getStatusBadgeColor(order.status)}`}
              >
                {t(getOrderStatusLabelKey(order.status))}
              </span>
                {invoiceId && (
                  <Link
                    href={`/api/invoices/${invoiceId}/pdf?locale=${locale}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {t("downloadInvoice")}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status Steps */}
        <OrderStatusSteps status={order.status as "PENDING" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELED"} />
      </div>

      {/* Items Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{t("items")}</h2>
        <div className="space-y-3">
          {order.items.map((item) => {
            // Get MAIN image from sizeVariant.colorVariant.images
            const imageUrl =
              item.sizeVariant?.colorVariant?.images?.[0]?.url ||
              item.productImage ||
              null;

            // Extract color and size from variant
            const color = item.sizeVariant?.colorVariant?.color || null;
            const colorName =
              locale === "fr"
                ? (color?.nameFr || color?.name || null)
                : (color?.name || null);
            const size = item.sizeVariant?.size || null;
            const variantInfo = [colorName, size].filter(Boolean).join(" / ");

            const productSlug = item.product?.slug || item.productSlug || null;

            return (
              <div
                key={item.id}
                className="flex gap-4 rounded-lg border border-border bg-card p-4"
              >
                {/* Product Image */}
                {imageUrl ? (
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted md:h-24 md:w-24">
                    <SafeImage
                      src={imageUrl}
                      alt={item.productName}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-xs text-muted-foreground md:h-24 md:w-24">
                    {t("noImage")}
                  </div>
                )}

                {/* Product Info */}
                <div className="flex flex-1 flex-col justify-between gap-2 md:flex-row md:items-center">
                  <div className="flex-1 space-y-1">
                    {productSlug ? (
                      <Link
                        href={`${prefix}/product/${productSlug}`}
                        className="font-medium text-foreground hover:text-accent transition-colors"
                      >
                        {item.productName}
                      </Link>
                    ) : (
                      <p className="font-medium text-foreground">
                        {item.productName}
                      </p>
                    )}
                    {variantInfo && (
                      <p className="text-sm text-muted-foreground">
                        {variantInfo}
                      </p>
                    )}
                    {item.variantLabel && !variantInfo && (
                      <p className="text-sm text-muted-foreground">
                        {item.variantLabel}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {t("qtyShort", { quantity: item.quantity })}
                    </p>
                  </div>

                  {/* Prices */}
                  <div className="flex flex-col items-end gap-1 text-right">
                    {item.unitPrice && item.quantity > 1 && (
                      <p className="text-xs text-muted-foreground">
                        {(item.unitPrice / 100).toLocaleString("en-US", {
                          style: "currency",
                          currency: "EUR",
                        })}{" "}
                        {t("each")}
                      </p>
                    )}
                    <p className="text-base font-semibold text-foreground">
                      {(item.totalPrice / 100).toLocaleString("en-US", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Payment Summary */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          {t("paymentSummary")}
        </h2>
        <div className="rounded-lg border border-border bg-card p-4 md:p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("subtotal")}</span>
              <span className="font-medium text-foreground">
                {(subtotal / 100).toLocaleString("en-US", {
                  style: "currency",
                  currency: "EUR",
                })}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("shipping")}</span>
              <span className="font-medium text-foreground">
                {shippingCents !== null
                  ? shippingCents === 0
                    ? (locale === "fr" ? "Gratuit" : "Free")
                    : (shippingCents / 100).toLocaleString("en-US", {
                        style: "currency",
                        currency: "EUR",
                      })
                  : "—"}
              </span>
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{t("totalPaid")}</span>
                <span className="text-lg font-semibold text-foreground">
                  {(total / 100).toLocaleString("en-US", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </span>
              </div>
            </div>
            {order.payment && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("paymentStatus", { status: order.payment.status })}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Shipping Information */}
      {order.trackingNumber && order.carrier && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{t("shipping")}</h2>
          <div className="rounded-lg border border-border bg-card p-4 md:p-6">
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-foreground">{t("carrier")}</span>{" "}
                <span className="text-muted-foreground">{order.carrier}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">{t("trackingNumber")}</span>{" "}
                {getTrackingUrl(order.carrier, order.trackingNumber) ? (
                  <a
                    href={getTrackingUrl(order.carrier, order.trackingNumber)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    {order.trackingNumber}
                  </a>
                ) : (
                  <span className="text-muted-foreground">{order.trackingNumber}</span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Shipping Address */}
      {order.address && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            {t("shippingAddress")}
          </h2>
          <div className="rounded-lg border border-border bg-card p-4 md:p-6">
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">
                {order.address.fullName}
              </p>
              <p className="text-muted-foreground">{order.address.line1}</p>
              {order.address.line2 && (
                <p className="text-muted-foreground">{order.address.line2}</p>
              )}
              <p className="text-muted-foreground">
                {order.address.postalCode} {order.address.city}
                {order.address.state && `, ${order.address.state}`}
              </p>
              <p className="text-muted-foreground">{order.address.country}</p>
              {order.address.phone && (
                <p className="mt-3 text-muted-foreground">
                  {t("phone", { phone: order.address.phone })}
                </p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

