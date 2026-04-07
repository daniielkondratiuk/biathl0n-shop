// src/shared/layout/nav/cart-icon-button.tsx
"use client";

import Link from "next/link";
import { CartIcon } from "@/components/icons/cart-icon";
import { useCartStore } from "@/features/cart";
import { useMounted } from "@/shared/theme/use-mounted";

interface CartIconButtonProps {
  href: string;
  cartCount?: number;
}

export function CartIconButton({ href, cartCount: cartCountProp }: CartIconButtonProps) {
  const items = useCartStore((state) => state.items);
  const mounted = useMounted();

  const derivedCount = mounted
    ? items.reduce((sum, item) => sum + item.quantity, 0)
    : 0;
  const cartCount = cartCountProp ?? derivedCount;

  return (
    <Link
      href={href}
      className="relative flex items-center justify-center"
      aria-label={`Shopping cart with ${cartCount} items`}
    >
      <CartIcon className="h-6 w-6 text-foreground" />
      {cartCount > 0 && (
        <span
          className="
            absolute -top-2 -right-2
            inline-flex items-center justify-center
            h-5 w-5
            rounded-full
            bg-red-500 text-white
            text-[10px] font-semibold
            leading-none
            tabular-nums
            shadow-md
          "
        >
          {cartCount > 9 ? (
            <>
              9
              <span className="text-[8px] relative -top-[1px]">+</span>
            </>
          ) : (
            cartCount
          )}
        </span>
      )}
    </Link>
  );
}

