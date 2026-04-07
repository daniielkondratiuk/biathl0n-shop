// app/[locale]/(store)/wishlist/page.tsx
import { WishlistPageClient } from "@/features/wishlist";
import { getFeaturedProducts } from "@/features/products";

interface WishlistPageProps {
  params: Promise<{ locale: string }>;
}

export default async function WishlistPage({ params }: WishlistPageProps) {
  const { locale } = await params;
  const recommendedProducts = await getFeaturedProducts(8, locale);

  return <WishlistPageClient recommendedProducts={recommendedProducts} />;
}
