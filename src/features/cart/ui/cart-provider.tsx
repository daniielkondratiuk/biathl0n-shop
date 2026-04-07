// src/features/cart/ui/cart-provider.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { useCartSync } from "@/hooks/use-cart-sync";
import { useWishlistSync } from "@/hooks/use-wishlist-sync";

function CartSync() {
  useCartSync();
  return null;
}

function WishlistSync() {
  useWishlistSync();
  return null;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CartSync />
      <WishlistSync />
      {children}
    </SessionProvider>
  );
}

