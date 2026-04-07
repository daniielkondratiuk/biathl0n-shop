import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import {
  getFeaturedProducts,
  getProductBySlug,
} from "@/features/products/server/public-products";
import { ProductPageClient } from "./product-page-client";

interface ProductPageProps {
  slug: string;
}

export async function ProductPage({ slug }: ProductPageProps) {
  const locale = await getLocale();
  const [product, recommendedProducts] = await Promise.all([
    getProductBySlug(slug, locale),
    getFeaturedProducts(4, locale), // Get 4 recommended products
  ]);

  if (!product) {
    notFound();
  }

  // Filter out current product from recommendations
  const filteredRecommendations = recommendedProducts
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  return (
    <ProductPageClient
      product={product}
      recommendedProducts={filteredRecommendations}
    />
  );
}
