// src/features/products/ui/product-card.tsx
"use client";

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
      id?: string;
      name?: string;
      nameFr?: string | null;
      hex?: string;
      slug?: string | null;
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

export function ProductCard({
  product,
  selectedColorSlug,
  preferredColorSlug,
}: {
  product: ProductWithRelations;
  selectedColorSlug?: string;
  preferredColorSlug?: string;
}) {
  const locale = useLocale();
  const tCart = useTranslations("cart");
  const tCatalog = useTranslations("catalog");
  const themeTokens = useStoreThemeTokens();

  const activeColorVariants = product.colorVariants?.filter((cv) => cv.isActive !== false) || [];
  const selectedColorVariant = selectedColorSlug
    ? activeColorVariants.find((cv) => cv.color?.slug === selectedColorSlug)
    : null;
  const preferredColorVariant = preferredColorSlug
    ? activeColorVariants.find((cv) => cv.color?.slug === preferredColorSlug)
    : null;

  // Extract images from selected color variant when color filter is active.
  // Otherwise, catalog can pass a preferred color to create a chessboard pattern.
  const firstColor = selectedColorVariant || preferredColorVariant || activeColorVariants[0] || product.colorVariants?.[0];
  const images = firstColor?.images || [];
  
  // Find MAIN and MAIN_DETAIL images (sorted by role)
  const mainImage = images.find((i) => i.role === "MAIN");
  const mainDetailImage = images.find((i) => i.role === "MAIN_DETAIL");
  const productPageImageOrder = [...images].sort((a, b) => {
    const roleOrder: Record<string, number> = { MAIN: 0, MAIN_DETAIL: 1, GALLERY: 2 };
    const aOrder = roleOrder[String(a.role)] ?? 2;
    const bOrder = roleOrder[String(b.role)] ?? 2;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (a.order || 0) - (b.order || 0);
  });
  const productSpecificHoverImageUrl =
    product.slug === "biathlon-culture-hoodie1" ? productPageImageOrder[1]?.url : null;
  
  const mainImageUrl = mainImage?.url || images[0]?.url || "";
  const mainDetailImageUrl = productSpecificHoverImageUrl || mainDetailImage?.url || null;

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
  const colorCount = activeColorVariants.length;

  const firstColorVariantId = firstColor?.id || null;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col cursor-pointer"
      style={{ borderColor: themeTokens.border }}
    >
      {/* Product Image Container - Square */}
      <div
        className="relative aspect-square w-full overflow-hidden rounded-2xl"
        style={{
          backgroundColor: themeTokens.cardBg,
        }}
      >
        <div
          className="absolute inset-0 z-[5] opacity-0 transition-opacity duration-200 group-hover:opacity-100 pointer-events-none"
          style={{
            backgroundColor: "var(--store-nav-link-bg)",
          }}
        />
        <div
          className={`absolute inset-0 z-0 transition-opacity duration-300 ease-out ${
            mainDetailImageUrl ? "opacity-100 group-hover:opacity-0" : "opacity-100"
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
            className="absolute inset-0 z-10 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
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
        <div className="flex items-start justify-between gap-2">
          {/* TITLE */}
          <div
            className="min-w-0 flex-1 uppercase tracking-wide text-sm font-semibold transition-colors hover:text-accent cursor-pointer"
            style={{ color: themeTokens.textPrimary }}
          >
            <span className="relative inline-block w-full after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full after:bg-current after:scale-x-0 after:origin-left after:transition-transform after:duration-[100ms] after:linear after:delay-[100ms] group-hover:after:scale-x-100 group-hover:after:delay-0">
              <span className="block truncate">{product.title || product.name}</span>
            </span>
          </div>
          {/* PRICE */}
          <span
            className="shrink-0 whitespace-nowrap text-sm font-semibold relative inline-block after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full after:bg-current after:scale-x-0 after:origin-left after:transition-transform after:duration-[100ms] after:linear after:delay-0 group-hover:after:scale-x-100 group-hover:after:delay-[100ms]"
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

