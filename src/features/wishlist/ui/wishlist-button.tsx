// src/features/wishlist/ui/wishlist-button.tsx
"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { useWishlistStore } from "@/features/wishlist";
import { Button } from "@/components/ui/button";

interface WishlistButtonProps {
  productId: string;
  colorVariantId?: string | null;
  sizeVariantId?: string | null;
  variant?: "full" | "compact" | "icon";
  className?: string;
}

type PersistApi = {
  hasHydrated: () => boolean;
  onFinishHydration: (cb: () => void) => () => void;
  rehydrate: () => void | Promise<void>;
};
const persistApi = (useWishlistStore as unknown as { persist?: PersistApi }).persist;

/**
 * Wishlist button component
 * - "icon": Small circular heart icon button (for product cards)
 * - "compact": Compact button with text (for product cards)
 * - "full": Full-width button (for product page)
 */
export function WishlistButton({
  productId,
  colorVariantId = null,
  sizeVariantId = null,
  variant = "full",
  className,
}: WishlistButtonProps) {
  const addItem = useWishlistStore((state) => state.addItem);
  const removeItem = useWishlistStore((state) => state.removeItem);
  const isInWishlist = useWishlistStore((state) => state.isInWishlist);
  const mutating = useWishlistStore((state) => state.mutating);
  const didBootstrapRef = useRef(false);
  const t = useTranslations("wishlist");

  useEffect(() => {
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
  }, []);

  const inWishlist = isInWishlist(productId, colorVariantId, sizeVariantId);

  const handleToggle = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const store = useWishlistStore.getState();
      if (inWishlist) {
        await store.removeItem(productId, colorVariantId, sizeVariantId);
      } else {
        await store.addItem({ productId, colorVariantId, sizeVariantId });
      }
    } catch {
      // Error handled silently
    }
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={mutating}
        className={`absolute top-2 right-2 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100 cursor-pointer ${className || ""}`}
        aria-label={inWishlist ? t("removeAria") : t("addAria")}
      >
        <Heart className={`h-4 w-4 ${inWishlist ? "fill-current text-red-500" : ""}`} />
      </button>
    );
  }

  if (variant === "compact") {
    return (
      <Button
        type="button"
        onClick={handleToggle}
        disabled={mutating}
        variant="ghost"
        size="sm"
        className={`flex items-center gap-2 ${className || ""}`}
      >
        <Heart className={`h-4 w-4 ${inWishlist ? "fill-current text-red-500" : ""}`} />
        <span className="text-sm">
          {inWishlist ? t("inWishlist") : t("wishlist")}
        </span>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      onClick={handleToggle}
      disabled={mutating}
      variant={inWishlist ? "ghost" : "primary"}
      size="md"
      className={`w-full flex items-center justify-center gap-2 ${className || ""}`}
    >
      <Heart className={`h-5 w-5 ${inWishlist ? "fill-current" : ""}`} />
      {mutating ? t("loading") : inWishlist ? t("remove") : t("add")}
    </Button>
  );
}

