"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { WishlistIcon } from "@/components/icons/wishlist-icon";
import { useWishlistStore } from "@/features/wishlist";

const emptySubscribe = () => () => {};
type PersistApi = {
  hasHydrated: () => boolean;
  onFinishHydration: (cb: () => void) => () => void;
  rehydrate: () => void | Promise<void>;
};
const persistApi = (useWishlistStore as unknown as { persist?: PersistApi }).persist;

export function WishlistIconButton({ href }: { href: string }) {
  const rawCount = useWishlistStore((state) => state.count);
  const didBootstrapRef = useRef(false);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    if (!mounted) return;
    const runBootstrap = () => {
      if (didBootstrapRef.current) return;
      didBootstrapRef.current = true;
      void useWishlistStore.getState().bootstrap();
    };

    if (!persistApi) {
      runBootstrap();
      return;
    }

    if (persistApi.hasHydrated()) {
      runBootstrap();
      return;
    }

    void persistApi.rehydrate();
    const unsub = persistApi.onFinishHydration(() => {
      runBootstrap();
    });
    return () => {
      unsub();
    };
  }, [mounted]);

  const wishlistCount = mounted ? rawCount : 0;

  return (
    <Link
      href={href}
      className="relative flex items-center justify-center cursor-pointer"
      aria-label={`Wishlist with ${wishlistCount} items`}
    >
      <WishlistIcon className="h-6 w-6 text-foreground" />
      {wishlistCount > 0 && (
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
          {wishlistCount > 9 ? (
            <>
              9
              <span className="text-[8px] relative -top-[1px]">+</span>
            </>
          ) : (
            wishlistCount
          )}
        </span>
      )}
    </Link>
  );
}
