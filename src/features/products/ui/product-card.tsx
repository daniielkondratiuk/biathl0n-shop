// src/features/products/ui/product-card.tsx
"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import type { Product, Category, ProductImage } from "@/shared/types/prisma";
import { SafeImage } from "./safe-image";
import { Badge } from "@/components/ui/badge";
import { WishlistButton } from "@/features/wishlist";
import { useStoreThemeTokens } from "@/shared/store-theme";

type ProductWithRelations = Product & {
  category: Category;
  title?: string | null;
  basePrice?: number;
  badge?: string | null;
  colorVariants?: Array<{
    id: string;
    isActive?: boolean;
    images: Partial<ProductImage>[];
    color?: {
      id: string;
      name: string;
      hex: string;
    };
  }>;
};

const BADGE_VARIANTS: Record<string, "limited" | "new" | "sale" | "bestseller" | "trending" | "backinstock" | "default"> = {
  NEW: "new",
  LIMITED: "limited",
  SALE: "sale",
  BESTSELLER: "bestseller",
  TRENDING: "trending",
  BACKINSTOCK: "backinstock",
};

export function ProductCard({ product }: { product: ProductWithRelations }) {
  const [hover, setHover] = useState(false);
  const locale = useLocale();
  const tCart = useTranslations("cart");
  const tCatalog = useTranslations("catalog");
  const themeTokens = useStoreThemeTokens();

  // Extract images from first color variant
  const firstColor = product.colorVariants?.[0];
  const images = firstColor?.images || [];
  
  // Find MAIN and MAIN_DETAIL images (sorted by role)
  const mainImage = images.find((i) => i.role === "MAIN");
  const mainDetailImage = images.find((i) => i.role === "MAIN_DETAIL");
  
  const mainImageUrl = mainImage?.url || images[0]?.url || "";
  const mainDetailImageUrl = mainDetailImage?.url || null;

  // Get base price
  const basePrice = product.basePrice || product.price || 0;
  const price = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(basePrice / 100);

  // Get badge
  const badge = product.badge;
  const badgeLabel = badge
    ? ({
        NEW: tCart("badgeNew"),
        BESTSELLER: tCart("badgeBestSeller"),
        SALE: tCart("badgeSale"),
        LIMITED: tCart("badgeLimited"),
        BACKINSTOCK: tCart("badgeBackInStock"),
        TRENDING: tCart("badgeTrending"),
      } as Record<string, string>)[badge] || badge
    : null;
  const badgeVariant = badge ? (BADGE_VARIANTS[badge] || "default") : null;

  // Get active color variants count
  const activeColorVariants = product.colorVariants?.filter((cv) => cv.isActive !== false) || [];
  const colorCount = activeColorVariants.length;

  const firstColorVariantId = firstColor?.id || null;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col cursor-pointer"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Product Image Container - Square */}
      <div
        className="relative aspect-square w-full overflow-hidden rounded-2xl border"
        style={{
          backgroundColor: themeTokens.cardBg,
          borderColor: themeTokens.border,
        }}
      >
        <div
          className={`absolute inset-0 z-0 transition-opacity duration-300 ease-out ${
            hover && mainDetailImageUrl ? "opacity-0" : "opacity-100"
          }`}
        >
          <SafeImage
            src={mainImageUrl}
            alt={product.title || product.name}
            fill
            sizes="(max-width: 768px) 50vw, 300px"
            loading="eager"
            priority
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
        {mainDetailImageUrl && (
          <div
            className={`absolute inset-0 z-10 transition-opacity duration-300 ease-out ${
              hover ? "opacity-100" : "opacity-0"
            }`}
          >
            <SafeImage
              src={mainDetailImageUrl}
              alt={product.title || product.name}
              fill
              sizes="(max-width: 768px) 50vw, 300px"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        )}

        {badgeLabel && badgeVariant && (
          <div className="absolute top-3 left-3 z-20">
            <Badge variant={badgeVariant} size="lg" showIcon={true}>
              {badgeLabel}
            </Badge>
          </div>
        )}

        {/* Wishlist heart icon button - top-right corner */}
        <div
          onClick={(e) => e.preventDefault()}
          className="absolute top-2 right-2 z-30"
        >
          <WishlistButton
            productId={product.id}
            colorVariantId={firstColorVariantId}
            variant="icon"
            className="!static"
          />
        </div>
      </div>

      {/* Product Info */}
      <div className="flex flex-col gap-1 pt-3">
        {/* Title and Price - Same Line */}
        <div className="flex items-center justify-between gap-2">
          <div
            className="max-w-full uppercase tracking-wide text-sm font-semibold transition-colors cursor-pointer"
            style={{ color: themeTokens.textPrimary }}
          >
            <span className="relative inline-block max-w-full after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full after:bg-current after:scale-x-0 after:origin-left after:transition-transform after:duration-[100ms] after:linear after:delay-[100ms] group-hover:after:scale-x-100 group-hover:after:delay-0">
              <span className="block max-w-full truncate">{product.title || product.name}</span>
            </span>
          </div>
          <span
            className="relative inline-block text-sm font-semibold whitespace-nowrap after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full after:bg-current after:scale-x-0 after:origin-left after:transition-transform after:duration-[100ms] after:linear after:delay-0 group-hover:after:scale-x-100 group-hover:after:delay-[100ms]"
            style={{ color: themeTokens.textPrimary }}
          >
            {price}
          </span>
        </div>

        {/* Colors count */}
        {colorCount > 0 && (
          <p className="text-xs uppercase" style={{ color: themeTokens.textSecondary }}>
            {colorCount} {colorCount === 1 ? tCatalog("color") : tCatalog("colors")}
          </p>
        )}
      </div>
    </Link>
  );
}

