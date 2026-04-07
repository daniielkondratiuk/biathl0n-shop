// src/features/wishlist/ui/wishlist-page-client.tsx
"use client";

import { useEffect, useMemo, useRef, type ComponentProps } from "react";
import { useMounted } from "@/shared/theme/use-mounted";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useWishlistStore } from "@/features/wishlist";
import { ProductCard } from "@/features/products/ui/product-card";
import { Button } from "@/components/ui/button";
import { CenteredLoader } from "@/shared/ui/centered-loader";
import { Heart, ShoppingBag } from "lucide-react";
import type { Product, Category, ProductImage } from "@/shared/types/prisma";

type ProductWithRelations = Product & {
  category: Category;
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

type WishlistPageClientProps = {
  recommendedProducts?: Array<ComponentProps<typeof ProductCard>["product"]>;
};

type PersistApi = {
  hasHydrated: () => boolean;
  onFinishHydration: (cb: () => void) => () => void;
  rehydrate: () => void | Promise<void>;
};

const persistApi = (useWishlistStore as unknown as { persist?: PersistApi }).persist;

function EmptyWishlistState({
  recommendedProducts = [],
}: {
  recommendedProducts?: Array<ComponentProps<typeof ProductCard>["product"]>;
}) {
  const locale = useLocale();
  const prefix = `/${locale}`;
  const t = useTranslations("wishlist");
  return (
    <div>
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
          <Heart className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="mb-2 text-2xl font-semibold text-foreground">
          {t("emptyTitle")}
        </h2>
        <p className="mb-8 text-muted-foreground max-w-md">
          {t("emptyHint")}
        </p>
        <Link href={`${prefix}/catalog`}>
          <Button variant="primary" size="md" className="cursor-pointer">
            <ShoppingBag className="h-4 w-4 mr-2" />
            {t("continueShopping")}
          </Button>
        </Link>
      </div>

      {recommendedProducts.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-4 text-xl font-semibold text-foreground">
            You Might Also Like
          </h3>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {recommendedProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function WishlistPageClient({
  recommendedProducts = [],
}: WishlistPageClientProps) {
  const t = useTranslations("wishlist");
  const itemsResolved = useWishlistStore((state) => state.itemsResolved);
  const count = useWishlistStore((state) => state.count);
  const ready = useWishlistStore((state) => state.ready);
  const loadingInitial = useWishlistStore((state) => state.loadingInitial);
  const mounted = useMounted();
  const didBootstrapRef = useRef(false);

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

  const wishlistProducts = useMemo(
    () =>
      itemsResolved
        .map((item) => {
          const resolved = item as typeof item & {
            product: ProductWithRelations;
            colorVariantId?: string | null;
            sizeVariantId?: string | null;
          };
          const p = resolved.product;
          if (!p || !p.id) return null;
          const selectedCvId = resolved.colorVariantId ?? null;
          const selectedSvId = resolved.sizeVariantId ?? null;
          const cvs = Array.isArray(p.colorVariants) ? p.colorVariants : [];
          const idx = selectedCvId
            ? cvs.findIndex((cv) => cv && cv.id === selectedCvId)
            : -1;
          const orderedColorVariants =
            idx > 0 ? [cvs[idx], ...cvs.filter((_, i) => i !== idx)] : cvs;

          return {
            ...p,
            colorVariants: orderedColorVariants,
            __wishlistKey: `${p.id}:${selectedCvId ?? "none"}:${selectedSvId ?? "none"}`,
          } as ProductWithRelations & { __wishlistKey: string };
        })
        .filter((product): product is ProductWithRelations & { __wishlistKey: string } => product !== null),
    [itemsResolved],
  );

  if (!mounted || !ready || loadingInitial) {
    return <CenteredLoader text={t("loadingWishlist")} />;
  }

  if (count === 0) {
    return <EmptyWishlistState recommendedProducts={recommendedProducts} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {itemsResolved.length === 0
            ? t("subtitle")
            : t("itemsCount", { count: itemsResolved.length })}
        </p>
      </header>

      <div className="mb-16">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {wishlistProducts.map((product) => (
            <ProductCard
              key={product.__wishlistKey || product.id}
              product={product}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
