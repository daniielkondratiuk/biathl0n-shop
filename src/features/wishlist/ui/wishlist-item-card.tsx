// src/features/wishlist/ui/wishlist-item-card.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { SafeImage } from "@/features/products";
import { Badge } from "@/components/ui/badge";
import { useWishlistStore, type ResolvedWishlistItem } from "@/features/wishlist";
import { Heart } from "lucide-react";

const BADGE_LABELS: Record<string, string> = {
  NEW: "New",
  BESTSELLER: "Best Seller",
  SALE: "Sale",
  LIMITED: "Limited",
  BACKINSTOCK: "Back in Stock",
  TRENDING: "Trending",
};

const BADGE_VARIANTS: Record<string, "limited" | "new" | "sale" | "bestseller" | "trending" | "backinstock" | "default"> = {
  NEW: "new",
  LIMITED: "limited",
  SALE: "sale",
  BESTSELLER: "bestseller",
  TRENDING: "trending",
  BACKINSTOCK: "backinstock",
};

interface WishlistItemCardProps {
  item: ResolvedWishlistItem;
  onRemove?: () => void;
}

export function WishlistItemCard({ item, onRemove }: WishlistItemCardProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const removeItem = useWishlistStore((state) => state.removeItem);
  const product = item.product;
  const badge = product.badge ?? null;
  const title = product.title ?? product.name;
  const basePrice = product.basePrice ?? product.price ?? 0;
  const colorVariants = product.colorVariants ?? [];
  const selectedColorVariant =
    colorVariants.find((cv) => cv.id === item.colorVariantId) ?? colorVariants[0];
  const imageUrl =
    selectedColorVariant?.images?.find((img) => typeof img.url === "string")?.url ?? null;

  const badgeLabel = badge ? (BADGE_LABELS[badge] || badge) : null;
  const badgeVariant = badge ? (BADGE_VARIANTS[badge] || "default") : null;

  const price = (basePrice / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "EUR",
  });

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRemoving(true);
    setTimeout(() => {
      void removeItem(item.productId, item.colorVariantId, item.sizeVariantId);
      onRemove?.();
    }, 300);
  };

  return (
    <div
      className={`group flex flex-col ${
        isRemoving ? "opacity-0 scale-95 transition-all duration-300" : ""
      }`}
    >
      {/* Product Image Container - Square, matching ProductCard */}
      <Link
        href={`/product/${product.slug}`}
        className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted cursor-pointer"
      >
        {imageUrl && (
          <SafeImage
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 50vw, 300px"
            loading="eager"
            priority
            className="absolute inset-0 h-full w-full object-cover transition-all duration-300"
          />
        )}

        {badgeLabel && badgeVariant && (
          <div className="absolute top-3 left-3 z-20">
            <Badge variant={badgeVariant} size="lg" showIcon={true}>
              {badgeLabel}
            </Badge>
          </div>
        )}

        {/* Heart icon remove button - top-right corner (filled red, always visible) */}
        <button
          onClick={handleRemove}
          className="absolute top-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-colors cursor-pointer"
          aria-label="Remove from wishlist"
        >
          <Heart className="h-4 w-4 fill-red-500 text-red-500" />
        </button>
      </Link>

      {/* Product Info - Matching ProductCard layout */}
      <div className="flex flex-col gap-1 pt-3">
        {/* Title and Price - Same Line */}
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/product/${product.slug}`}
            className="uppercase tracking-wide text-sm font-semibold text-foreground truncate hover:text-accent transition-colors cursor-pointer"
          >
            {title}
          </Link>
          <span className="text-sm font-semibold text-foreground whitespace-nowrap">
            {price}
          </span>
        </div>

        {/* Color count line - matching ProductCard style */}
        {colorVariants.length > 0 && (
          <p className="text-xs uppercase text-muted-foreground">
            {colorVariants.length} {colorVariants.length === 1 ? "COLOR" : "COLORS"}
          </p>
        )}
      </div>
    </div>
  );
}

