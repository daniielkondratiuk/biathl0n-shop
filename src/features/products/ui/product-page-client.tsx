// src/features/products/ui/product-page-client.tsx
"use client";

import { useState, useMemo, type ComponentProps } from "react";
import { ProductImageGallery } from "./product-image-gallery";
import { ProductColorSwatches } from "./product-color-swatches";
import { ProductSizeSelector } from "./product-size-selector";
import { ProductInfoSection } from "./product-info-section";
import { ProductRecommendations } from "./product-recommendations";
import { AddToCartButton } from "./add-to-cart-button";
import { WishlistButton } from "@/features/wishlist";
import { calculateFinalPrice } from "@/lib/utils/product-utils";
import { useTranslations } from "next-intl";

type ProductPageImage = { url: string; role: string; order?: number };
type ProductPageSize = { id: string; size: string; stock: number; priceDiff: number };
type ProductPageColorVariant = {
  id: string;
  priceDiff?: number;
  isActive?: boolean;
  images?: ProductPageImage[];
  sizes?: ProductPageSize[];
};
type ProductPageProduct = {
  id: string;
  title?: string;
  name?: string;
  slug: string;
  basePrice?: number;
  price?: number;
  badge?: string | null;
  gender?: string | null;
  description?: string | null;
  categoryDescription?: string | null;
  colorVariants?: ProductPageColorVariant[];
};

interface ProductPageClientProps {
  product: ProductPageProduct;
  recommendedProducts?: ProductPageProduct[];
}

// Helper function to check if product is available
function isProductAvailable(product: ProductPageProduct): boolean {
  if (!product.colorVariants || product.colorVariants.length === 0) {
    return false;
  }

  // Check if ANY size variant of ANY color variant has stock > 0
  return product.colorVariants.some((colorVariant) => {
    if (!colorVariant.sizes || colorVariant.sizes.length === 0) {
      return false;
    }
    return colorVariant.sizes.some((size) => size.stock > 0);
  });
}

export function ProductPageClient({
  product,
  recommendedProducts = [],
}: ProductPageClientProps) {
  const t = useTranslations("product");
  // Get first active color variant as default
  const defaultColorVariant = product.colorVariants?.[0];
  const [selectedColorVariantId, setSelectedColorVariantId] = useState<string | null>(
    defaultColorVariant?.id || null
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  // Get selected color variant
  const selectedColorVariant = product.colorVariants?.find(
    (cv) => cv.id === selectedColorVariantId
  ) || defaultColorVariant;

  // Get images for selected color variant - sorted properly, always return array
  const colorImages = useMemo(() => {
    if (!selectedColorVariant?.images || !Array.isArray(selectedColorVariant.images)) {
      return [];
    }
    return [...selectedColorVariant.images].sort((a, b) => {
      const roleOrder: Record<string, number> = { MAIN: 0, MAIN_DETAIL: 1, GALLERY: 2 };
      const aOrder = roleOrder[a.role] ?? 2;
      const bOrder = roleOrder[b.role] ?? 2;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      return (a.order || 0) - (b.order || 0);
    });
  }, [selectedColorVariant]);

  // Find selected size variant within selected color variant
  const selectedSizeVariant = selectedColorVariant?.sizes?.find(
    (s) => s.size === selectedSize
  );

  // Calculate price
  const basePrice = product.basePrice || product.price || 0;
  const colorPriceDiff = selectedColorVariant?.priceDiff || 0;
  const sizePriceDiff = selectedSizeVariant?.priceDiff || 0;
  
  const finalPrice = calculateFinalPrice(
    basePrice,
    colorPriceDiff,
    sizePriceDiff,
    [] // Patches not included in this version
  );

  // Check if selected size is in stock
  const isSelectedSizeInStock = selectedSizeVariant ? selectedSizeVariant.stock > 0 : false;
  
  // Check if product is available (any size of any color)
  const isProductInStock = isProductAvailable(product);

  // Available sizes from selected color variant - sorted
  const availableSizes = useMemo(() => {
    if (!selectedColorVariant?.sizes) return [];
    const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];
    return [...selectedColorVariant.sizes].sort((a, b) => {
      return SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size);
    });
  }, [selectedColorVariant]);

  // Handle color change - reset size and image index
  const handleColorChange = (colorVariantId: string) => {
    setSelectedColorVariantId(colorVariantId);
    setSelectedSize(null); // Reset size when color changes
  };

  // Format price
  const formattedPrice = (finalPrice / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "EUR",
  });

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        {/* Product Section */}
        <section className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Left Column - Image Gallery */}
            <div className="sticky top-20 self-start">
              <ProductImageGallery
                images={colorImages.map((img) => ({
                  url: img.url,
                  role: img.role as "MAIN" | "MAIN_DETAIL" | "GALLERY",
                  order: img.order ?? 0,
                }))}
                productTitle={(product.title ?? product.name ?? "") as string}
                productBadge={product.badge}
              />
            </div>

            {/* Right Column - Product Info */}
            <div className="space-y-6">
              {/* Title & Subtitle */}
              <div className="space-y-2">
                <h1 className="text-2xl font-medium text-foreground">
                  {product.title || product.name}
                </h1>
                {product.gender && (
                  <p className="text-base text-muted-foreground">
                    {product.gender === "MEN" && t("mensClothing")}
                    {product.gender === "WOMEN" && t("womensClothing")}
                    {product.gender === "KIDS" && t("kidsClothing")}
                    {product.gender === "UNISEX" && t("unisexClothing")} {t("clothing")}
                  </p>
                )}
              </div>

              {/* Price */}
              <div className="space-y-1">
                <p className="text-2xl font-medium text-foreground">
                  {formattedPrice}
                </p>
                {(colorPriceDiff !== 0 || sizePriceDiff !== 0) && (
                  <p className="text-sm text-muted-foreground">
                    {t("base", { price: (basePrice / 100).toFixed(2) })}
                    {colorPriceDiff !== 0 && t("plusColor", { price: (colorPriceDiff / 100).toFixed(2) })}
                    {sizePriceDiff !== 0 && t("plusSize", { price: (sizePriceDiff / 100).toFixed(2) })}
                  </p>
                )}
                {!isProductInStock && (
                  <p className="text-sm text-muted-foreground">
                    {t("currentlySoldOut")}
                  </p>
                )}
              </div>

              {/* Color Selection */}
              <ProductColorSwatches
                colorVariants={(product.colorVariants || []) as unknown as ComponentProps<typeof ProductColorSwatches>["colorVariants"]}
                selectedColorVariantId={selectedColorVariantId}
                onColorChange={handleColorChange}
              />

              {/* Size Selection */}
              <ProductSizeSelector
                sizes={availableSizes.map((s) => ({
                  ...s,
                  size: s.size as "XS" | "S" | "M" | "L" | "XL" | "XXL",
                }))}
                selectedSize={selectedSize}
                onSizeChange={setSelectedSize}
              />

              {/* Action Buttons */}
              <div className="space-y-3">
                {isProductInStock ? (
                  <AddToCartButton
                    productId={product.id}
                    colorVariantId={selectedColorVariantId || null}
                    sizeVariantId={selectedSizeVariant?.id || null}
                    disabled={!selectedSize || !isSelectedSizeInStock}
                  />
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-full border border-border bg-muted px-5 py-4 text-base font-medium text-muted-foreground cursor-not-allowed"
                  >
                    {t("currentlySoldOutButton")}
                  </button>
                )}
                <WishlistButton
                  productId={product.id}
                  colorVariantId={selectedColorVariantId || null}
                  sizeVariantId={selectedSizeVariant?.id || null}
                  variant="full"
                />
              </div>

              {/* Product Info Sections */}
              <div className="space-y-0">
                <ProductInfoSection title={t("productDetails")} defaultOpen>
                  {product.description ? (
                    <p className="mb-4 whitespace-pre-wrap">{product.description}</p>
                  ) : (
                    <p className="mb-4 text-muted-foreground">
                      {t("noDescription")}
                    </p>
                  )}
                  {product.categoryDescription && (
                    <p className="mt-2 whitespace-pre-wrap">{product.categoryDescription}</p>
                  )}
                </ProductInfoSection>

                <ProductInfoSection title={t("shippingReturns")}>
                  <div className="space-y-3">
                    <div>
                      <h4 className="mb-1 font-medium">{t("shipping")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t("freeShippingOver")}
                      </p>
                    </div>
                    <div>
                      <h4 className="mb-1 font-medium">{t("returns")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t("easyReturns")}
                      </p>
                    </div>
                  </div>
                </ProductInfoSection>

                <ProductInfoSection title={t("reviews")}>
                  <p className="text-sm text-muted-foreground">
                    {t("noReviews")}
                  </p>
                </ProductInfoSection>
              </div>
            </div>
          </div>
        </section>

        {/* Recommendations Section */}
        {recommendedProducts.length > 0 && (
          <section className="mx-auto max-w-7xl px-6 pb-12">
            <ProductRecommendations products={recommendedProducts as unknown as ComponentProps<typeof ProductRecommendations>["products"]} />
          </section>
        )}
      </main>
    </div>
  );
}

