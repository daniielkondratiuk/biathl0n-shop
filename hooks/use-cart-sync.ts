// hooks/use-cart-sync.ts
"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/features/cart";

export function useCartSync() {
  const { data: session, status } = useSession();
  const { mode, initCart, setMode, mergeGuestCartIntoUser, loadGuestCartFromLocalStorage } = useCartStore();

  useEffect(() => {
    // Initialize cart on mount
    if (status !== "loading") {
      initCart();
    }
  }, [status, initCart]);

  useEffect(() => {
    if (status === "loading") return;

    const isAuthenticated = !!session?.user;

    if (isAuthenticated && mode === "guest") {
      // User just logged in: merge guest cart into user cart
      mergeGuestCartIntoUser().then(() => {
        setMode("user");
      }).catch((error) => {
        console.error("Error merging guest cart:", error);
      });
    } else if (!isAuthenticated && mode === "user") {
      // User just logged out: switch to guest mode
      setMode("guest");
      loadGuestCartFromLocalStorage();
    }
  }, [session, status, mode, setMode, mergeGuestCartIntoUser, loadGuestCartFromLocalStorage]);
}

