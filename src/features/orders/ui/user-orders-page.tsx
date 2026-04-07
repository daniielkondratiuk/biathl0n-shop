// src/features/orders/ui/user-orders-page.tsx
import Link from "next/link";
import { SafeImage } from "@/features/products/ui/safe-image";
import { getUserOrders } from "@/features/orders";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { formatOrderRefShort } from "@/lib/utils/order-ref";
import { getLocale, getTranslations } from "next-intl/server";
import { getOrderStatusLabelKey } from "../lib/order-status-label";
import { getTrackingUrl } from "@/shared/shipping/tracking-links";

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
  });
}

interface UserOrdersPageProps {
  userId: string;
}

export async function UserOrdersPage({ userId }: UserOrdersPageProps) {
  const locale = await getLocale();
  const prefix = `/${locale}`;
  const t = await getTranslations("orders");
  const orders = await getUserOrders(userId);
  const hasLoadedOnce = true;
  const isPending = false;

  return (
    <div className="space-y-6">
      {hasLoadedOnce && orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg font-medium text-foreground mb-2">
            {t("emptyTitle")}
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            {t("emptyHint")}
          </p>
          <Link href={`${prefix}/catalog`}>
            <Button variant="primary" size="md">
              {t("startShopping")}
            </Button>
          </Link>
        </div>
      ) : (
        <div className={isPending ? "space-y-6 opacity-70 pointer-events-none" : "space-y-6"}>
          {orders.map((order) => {
            return (
              <div
                key={order.id}
                className="rounded-lg border border-border bg-card shadow-sm"
              >
                {/* Order Header */}
                <div className="border-b border-border p-4 md:p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {t("orderPlaced", { date: formatDate(order.createdAt) })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatOrderRefShort(order.orderNumber, order.id)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border border-black/10 dark:border-white/15 ${getStatusBadgeColor(order.status)}`}
                      >
                        {t(getOrderStatusLabelKey(order.status))}
                      </span>
                      <p className="text-base font-semibold text-foreground md:text-lg">
                        {(order.total / 100).toLocaleString("en-US", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order Items (Cart-like rows) */}
                <div className="divide-y divide-border">
                  {order.items.map((item) => {
                    // Get MAIN image from sizeVariant.colorVariant.images
                    const imageUrl =
                      item.sizeVariant?.colorVariant?.images?.[0]?.url ||
                      item.productImage ||
                      null;

                    // Extract color and size from variant
                    const color =
                      item.sizeVariant?.colorVariant?.color || null;
                    const colorName =
                      locale === "fr"
                        ? (color?.nameFr || color?.name || null)
                        : (color?.name || null);
                    const size = item.sizeVariant?.size || null;
                    const variantInfo = [colorName, size]
                      .filter(Boolean)
                      .join(" / ");

                    // Get product slug for link
                    const productSlug =
                      item.product?.slug || item.productSlug || null;

                    return (
                      <div
                        key={item.id}
                        className="flex gap-4 p-4 md:p-5"
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
                          <div className="flex-1 space-y-1 min-w-0">
                            {productSlug ? (
                              <Link
                                href={`${prefix}/product/${productSlug}`}
                                className="font-medium text-foreground hover:text-accent transition-colors block truncate"
                              >
                                {item.productName}
                              </Link>
                            ) : (
                              <p className="font-medium text-foreground truncate">
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
                              {t("qty", { quantity: item.quantity })}
                            </p>
                          </div>

                          {/* Prices */}
                          <div className="flex flex-col items-end gap-1 text-right shrink-0">
                            <p className="text-base font-semibold text-foreground">
                              {(item.totalPrice / 100).toLocaleString("en-US", {
                                style: "currency",
                                currency: "EUR",
                              })}
                            </p>
                            {item.unitPrice && item.quantity > 1 && (
                              <p className="text-xs text-muted-foreground">
                                {(item.unitPrice / 100).toLocaleString("en-US", {
                                  style: "currency",
                                  currency: "EUR",
                                })}{" "}
                                {t("each")}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Shipping Section */}
                {order.trackingNumber && order.carrier && (
                  <div className="border-t border-border p-4 md:p-5 bg-muted/30">
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">{t("shipping")}</h3>
                      <div className="space-y-1 text-sm">
                        <p className="text-muted-foreground">
                          <span className="font-medium">{t("carrier")}</span> {order.carrier}
                        </p>
                        <p className="text-muted-foreground">
                          <span className="font-medium">{t("trackingNumber")}</span>{" "}
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
                            <span>{order.trackingNumber}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Footer */}
                <div className="border-t border-border p-4 md:p-5">
                  <Link
                    href={`${prefix}/dashboard/orders/${order.id}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-accent transition-colors"
                  >
                    <span>{t("viewDetails")}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

