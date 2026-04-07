// src/features/cart/ui/cart-page-client.tsx
"use client";

import Link from "next/link";
import { useCartStore, type ResolvedCartItem } from "@/features/cart";
import { getLineKey } from "@/features/cart/model/cart.store";
import { useEffect, useCallback } from "react";
import { useMounted } from "@/shared/theme/use-mounted";
import { CenteredLoader } from "@/shared/ui/centered-loader";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/features/products";
import { useSession } from "next-auth/react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

// Badge labels will be translated in component

const BADGE_VARIANTS: Record<string, "limited" | "new" | "sale" | "bestseller" | "trending" | "backinstock" | "default"> = {
  NEW: "new",
  LIMITED: "limited",
  SALE: "sale",
  BESTSELLER: "bestseller",
  TRENDING: "trending",
  BACKINSTOCK: "backinstock",
};

type CartItemRowProps = {
  item: ResolvedCartItem & { colorNameFr?: string | null };
  isMutating: boolean;
};

function CartItemRow({ item, isMutating }: CartItemRowProps) {
  const locale = useLocale();
  const prefix = `/${locale}`;
  const t = useTranslations("cart");
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const BADGE_LABELS: Record<string, string> = {
    NEW: t("badgeNew"),
    BESTSELLER: t("badgeBestSeller"),
    SALE: t("badgeSale"),
    LIMITED: t("badgeLimited"),
    BACKINSTOCK: t("badgeBackInStock"),
    TRENDING: t("badgeTrending"),
  };

  const badgeLabel = item.badge ? (BADGE_LABELS[item.badge] || item.badge) : null;
  const badgeVariant = item.badge ? (BADGE_VARIANTS[item.badge] || "default") : null;

  const handleDecrease = useCallback(() => {
    const newQuantity = item.quantity - 1;
    if (newQuantity > 0) {
      updateQuantity(item.id, newQuantity);
    }
  }, [item.id, item.quantity, updateQuantity]);

  const handleIncrease = useCallback(() => {
    updateQuantity(item.id, item.quantity + 1);
  }, [item.id, item.quantity, updateQuantity]);

  const handleRemove = useCallback(() => {
    removeItem(item.id);
  }, [item.id, removeItem]);

  const isDecreaseDisabled = item.quantity <= 1 || isMutating;

  const colorName =
    locale === "fr"
      ? item.colorNameFr || item.colorName
      : item.colorName;

  return (
    <li className="relative flex flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-sm md:flex-row md:gap-6">
      {isMutating && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/45 pointer-events-none">
          <span className="h-6 w-6 rounded-full border-2 border-foreground/70 border-t-transparent animate-spin" />
        </div>
      )}
      {/* LEFT COLUMN: Image + Info + Quantity */}
      <div className="flex flex-1 gap-5 min-w-0">
        {/* Product Image - Full height, centered, aspect ratio 4/5 */}
        <Link 
          href={`${prefix}/product/${item.slug}`} 
          className="relative flex-shrink-0 overflow-hidden rounded-lg bg-muted cursor-pointer"
          style={{ 
            width: "120px", 
            aspectRatio: "4/5",
            minHeight: "150px"
          }}
        >
          <SafeImage
            src={item.imageUrl}
            alt={item.title}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 120px, 120px"
          />
        </Link>

        {/* Text Block */}
        <div className="flex flex-1 flex-col gap-1.5 min-w-0">
          <div className="flex flex-1 flex-col gap-1.5">
            {/* Title and Badge */}
            <div className="flex items-center gap-2">
              <Link 
                href={`${prefix}/product/${item.slug}`} 
                className="text-base font-semibold text-foreground hover:text-accent transition-colors cursor-pointer"
              >
                {item.title}
              </Link>
              {badgeLabel && badgeVariant && (
                <Badge variant={badgeVariant} size="sm" showIcon={false}>
                  {badgeLabel}
                </Badge>
              )}
            </div>

            {/* Category */}
            {item.categoryName && (
              <p className="text-xs text-muted-foreground">{item.categoryName}</p>
            )}

            {/* Color and Size Row - Same Line */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">{t("color")}</span>
                <div
                  className="h-3.5 w-3.5 rounded-full border border-border flex-shrink-0"
                  style={{ backgroundColor: item.colorHex }}
                />
                <span className="text-foreground">{colorName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">{t("size")}</span>
                <span className="text-foreground font-medium">{item.sizeLabel}</span>
              </div>
            </div>
          </div>

          {/* Quantity Control with Label */}
          <div className="mt-2 flex items-center">
            {/* Quantity Pill Container */}
            <div className="flex text-sm items-center gap-3 rounded-full bg-neutral-800 dark:bg-neutral-200 px-3 py-1">
              <span className="text-white dark:text-neutral-900 whitespace-nowrap">{t("quantity")}</span>

              {/* Decrease */}
              <button
                type="button"
                disabled={isDecreaseDisabled}
                onClick={handleDecrease}
                aria-label={t("decreaseQuantity")}
                className={`flex items-center justify-center text-white dark:text-neutral-900 active:scale-[1.05] transition-transform ${
                  isDecreaseDisabled
                    ? "opacity-40 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
              >
                <Minus className="h-4 w-4" />
              </button>

              {/* Number */}
              <span className="flex min-w-[24px] items-center justify-center font-semibold text-white dark:text-neutral-900">
                {item.quantity}
              </span>

              {/* Increase */}
              <button
                type="button"
                disabled={isMutating}
                onClick={handleIncrease}
                aria-label={t("increaseQuantity")}
                className={`flex items-center justify-center text-white dark:text-neutral-900 active:scale-[1.05] transition-transform ${
                  isMutating ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Price (top) + Delete (bottom) */}
      <div className="flex flex-col items-end justify-between flex-shrink-0 py-1 md:items-end">
        {/* Price - Top Right */}
        <div className="text-right">
          <p className="text-base font-semibold text-foreground">
            {(item.totalPrice / 100).toLocaleString("en-US", {
              style: "currency",
              currency: "EUR",
            })}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {(item.unitPrice / 100).toLocaleString("en-US", {
              style: "currency",
              currency: "EUR",
            })} {t("each")}
          </p>
        </div>

        {/* Delete Icon - Bottom Right */}
        <button
          type="button"
          disabled={isMutating}
          onClick={handleRemove}
          className={`mt-auto text-red-600 dark:text-red-400 transition-opacity ${
            isMutating ? "opacity-40 cursor-not-allowed" : "hover:opacity-70 cursor-pointer"
          }`}
          aria-label={t("removeItem")}
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </li>
  );
}

function EmptyCartState() {
  const locale = useLocale();
  const prefix = `/${locale}`;
  const t = useTranslations("cart");
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
      <p className="text-sm text-muted-foreground mb-4">
        {t("emptyTitle")}
      </p>
      <Link
        href={`${prefix}/catalog`}
        className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition hover:opacity-90 cursor-pointer"
      >
        {t("continueShopping")}
      </Link>
    </div>
  );
}

type OrderSummaryProps = {
  subtotal: number;
  isAuthenticated: boolean;
};

function OrderSummary({ subtotal, isAuthenticated }: OrderSummaryProps) {
  const locale = useLocale();
  const prefix = `/${locale}`;
  const t = useTranslations("cart");
  return (
    <aside className="h-fit rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-foreground">
        {t("orderSummary")}
      </h2>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("subtotal")}</span>
          <span className="font-semibold text-foreground">
            {(subtotal / 100).toLocaleString("en-US", {
              style: "currency",
              currency: "EUR",
            })}
          </span>
        </div>
        
        <p className="text-xs text-muted-foreground">
          {t("taxesNote")}
        </p>

        {/* Checkout Button */}
        {isAuthenticated ? (
          <Link
            href={`${prefix}/checkout`}
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:opacity-90 cursor-pointer"
          >
            {t("proceedToCheckout")}
          </Link>
        ) : (
          <div className="space-y-2">
            <Link
              href={`${prefix}/login?redirect=${encodeURIComponent(`${prefix}/checkout`)}`}
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:opacity-90 cursor-pointer"
            >
              {t("signInToCheckout")}
            </Link>
            <p className="text-xs text-center text-muted-foreground">
              {t("signInHint")}
            </p>
          </div>
        )}

        {/* Continue Shopping Link */}
        <Link
          href={`${prefix}/catalog`}
          className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {t("continueShopping")}
        </Link>
      </div>
    </aside>
  );
}

export function CartPageClient() {
  const t = useTranslations("cart");
  const resolvedItems = useCartStore((state) => state.resolvedItems);
  const items = useCartStore((state) => state.items);
  const loadingInitial = useCartStore((state) => state.loadingInitial);
  const hasLoadedOnce = useCartStore((state) => state.hasLoadedOnce);
  const mutatingKeys = useCartStore((state) => state.mutatingKeys);
  const mode = useCartStore((state) => state.mode);
  const resolveGuestCartItems = useCartStore((state) => state.resolveGuestCartItems);
  const handleAuthTransition = useCartStore((state) => state.handleAuthTransition);
  const { data: session, status } = useSession();
  const mounted = useMounted();
  const isAuthenticated = status === "authenticated" && !!session?.user;

  // Resolve guest cart items on mount if in guest mode
  useEffect(() => {
    if (mounted && mode === "guest" && items.length > 0 && resolvedItems.length === 0) {
      resolveGuestCartItems({ showInitialLoading: false });
    }
  }, [mounted, mode, items.length, resolvedItems.length, resolveGuestCartItems]);

  useEffect(() => {
    if (!mounted || status === "loading") return;
    void handleAuthTransition(isAuthenticated);
  }, [mounted, status, isAuthenticated, handleAuthTransition]);

  if (!mounted) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10">
        <div className="text-center text-muted-foreground">{t("loadingCart")}</div>
      </div>
    );
  }

  if (loadingInitial || !hasLoadedOnce) {
    return <CenteredLoader text={t("loadingCart")} />;
  }

  const subtotal = resolvedItems.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10">
      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
      </header>

      {hasLoadedOnce && !loadingInitial && items.length === 0 ? (
        <EmptyCartState />
      ) : (
        <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {/* Cart Items */}
          <div className="space-y-4">
            <ul className="space-y-4">
              {resolvedItems.map((item) => {
                const source = items.find((cartItem) => cartItem.id === item.id);
                const lineKey = source
                  ? getLineKey(source)
                  : getLineKey({
                      productId: item.productId,
                      colorVariantId: item.colorVariantId,
                      sizeVariantId: item.sizeVariantId,
                      selectedPatchIds: item.selectedPatchIds,
                    });

                return (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    isMutating={mutatingKeys.has(lineKey)}
                  />
                );
              })}
            </ul>
          </div>

          {/* Order Summary */}
          <OrderSummary subtotal={subtotal} isAuthenticated={isAuthenticated} />
        </div>
      )}
    </div>
  );
}

