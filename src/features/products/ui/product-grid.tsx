// src/features/products/ui/product-grid.tsx
import type { Product, ProductImage, Category, ProductColorVariant } from "@/shared/types/prisma";
import type { ReactElement } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/shared/ui/skeleton";
import { ProductCard } from "./product-card";

type ProductWithRelations = Product & {
  category: Category;
  colorVariants?: (ProductColorVariant & {
    images: Partial<ProductImage>[];
  })[];
  // Legacy support
  images?: ProductImage[];
};

export function ProductGrid({
  products,
  clearFiltersHref,
}: {
  products: ProductWithRelations[];
  clearFiltersHref?: string;
}) {
  const t = useTranslations();

  if (!products.length) {
    return (
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
        <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
          <h3 className="text-xl font-semibold text-foreground">
            {t("catalog.empty.title")}
          </h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {t("catalog.empty.subtitle")}
          </p>
          {clearFiltersHref ? (
            <Link
              href={clearFiltersHref}
              className="mt-6 text-sm font-medium underline underline-offset-4 hover:opacity-80"
            >
              {t("catalog.empty.clearFilters")}
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({
  pageSize,
}: {
  pageSize: number;
}): ReactElement {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
      {Array.from({ length: pageSize }).map((_, index) => (
        <div key={index} className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <Skeleton className="h-4 w-3/4 rounded-md" />
          <Skeleton className="h-4 w-24 rounded-md" />
        </div>
      ))}
    </div>
  );
}

