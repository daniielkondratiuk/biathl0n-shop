// app/product/[slug]/page.tsx
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { getProductBySlug } from "@/features/products/server/public-products";
import { ProductPage as ProductFeaturePage } from "@/features/products/ui/product-page";

export const revalidate = 120;

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const product = await getProductBySlug(slug, locale);

  if (!product) {
    return {};
  }

  // Get MAIN image from first active color variant
  const firstColorVariant = product.colorVariants?.[0];
  const mainImage = firstColorVariant?.images?.find((img) => img.role === "MAIN");
  const imageUrl = mainImage?.url || null;

  return {
    title: product.title || product.name,
    description: product.description || `Buy ${product.title || product.name} at predators`,
    openGraph: {
      title: product.title || product.name,
      description: product.description || `Buy ${product.title || product.name} at predators`,
      images: imageUrl ? [{ url: imageUrl }] : [],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  return (
    <ProductFeaturePage slug={slug} />
  );
}
