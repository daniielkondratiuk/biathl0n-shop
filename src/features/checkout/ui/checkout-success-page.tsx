"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/features/cart";

function CheckoutSuccessPageFallback() {
  const t = useTranslations("checkout");
  return <div className="mx-auto flex w-full max-w-2xl items-center justify-center px-4">{t("processing")}</div>;
}

function CheckoutSuccessContent() {
  const locale = useLocale();
  const prefix = `/${locale}`;
  const t = useTranslations("checkout");
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);
  const clearCart = useCartStore((state) => state.clearCart);
  const loadUserCartFromAPI = useCartStore((state) => state.loadUserCartFromAPI);

  useEffect(() => {
    let mounted = true;

    async function verifyAndClear() {
      if (!sessionId) {
        // No session ID - just clear client-side as fallback
        try {
          await clearCart();
        } catch (error) {
          console.log("[checkout-success] Cart may already be cleared:", error);
        }
        if (mounted) {
          setLoading(false);
        }
        return;
      }

      try {
        // Verify payment with Stripe and clear cart server-side (reliable fallback if webhook didn't run)
        // This is idempotent and safe to call multiple times
        const response = await fetch("/api/checkout/verify-and-clear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });

        const data = await response.json();

        if (response.ok && data.ok) {
          // Refresh cart state from server to reflect cleared cart
          try {
            await loadUserCartFromAPI();
          } catch (error) {
            // If refresh fails, clear client-side as fallback
            console.log("[checkout-success] Error refreshing cart, clearing client-side:", error);
            try {
              await clearCart();
            } catch (clearError) {
              console.log("[checkout-success] Cart may already be cleared:", clearError);
            }
          }
        } else {
          // Verification failed - still try to clear client-side as best effort
          console.warn("[checkout-success] Verification failed, attempting client-side clear:", data.error);
          try {
            await clearCart();
          } catch (error) {
            console.log("[checkout-success] Cart may already be cleared:", error);
          }
        }
      } catch (error) {
        // Network error or other issue - try client-side clear as fallback
        console.error("[checkout-success] Error verifying payment:", error);
        try {
          await clearCart();
        } catch (clearError) {
          console.log("[checkout-success] Cart may already be cleared:", clearError);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    verifyAndClear();

    return () => {
      mounted = false;
    };
  }, [sessionId, clearCart, loadUserCartFromAPI]);

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-2xl items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">
          {t("processing")}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-4 py-12">
      <div className="w-full space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            {t("orderConfirmed")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("thankYou")}
          </p>
          {sessionId && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("sessionId", { sessionId: sessionId.slice(0, 20) })}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href={`${prefix}/dashboard/orders`}>
            <Button>{t("viewOrders")}</Button>
          </Link>
          <Link href={`${prefix}/catalog`}>
            <Button variant="ghost">{t("continueShopping")}</Button>
          </Link>
        </div>

        <div className="mt-8 rounded-lg border border-border bg-muted p-4 text-left text-xs text-muted-foreground">
          <p className="font-medium text-foreground">
            {t("whatsNext")}
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>{t("emailConfirmation")}</li>
            <li>{t("trackOrder")}</li>
            <li>{t("shippingNotification")}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<CheckoutSuccessPageFallback />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}


