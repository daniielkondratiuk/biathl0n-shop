// src/features/products/ui/product-recommendations.tsx
"use client";

import { ProductCard } from "./product-card";

interface Product {
  id: string;
  title?: string;
  name: string;
  slug: string;
  basePrice: number;
  price: number;
  colorVariants?: Array<{
    id: string;
    images: Array<{
      url: string;
      role: "MAIN" | "MAIN_DETAIL" | "GALLERY";
    }>;
  }>;
}

interface ProductRecommendationsProps {
  products: Product[];
}

export function ProductRecommendations({
  products,
}: ProductRecommendationsProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="py-12">
      <div className="mb-6">
        <h2 className="text-2xl font-medium text-foreground">
          You Might Also Like
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product as Parameters<typeof ProductCard>[0]["product"]}
          />
        ))}
      </div>
    </section>
  );
}

