// src/features/home/ui/home-page.tsx
import Link from "next/link";
import Image from "next/image";
import { ProductGrid } from "@/features/products";
import { Button } from "@/components/ui/button";
import { getFeaturedProducts, getHeroProducts } from "@/features/products";
import { HeroBanner } from "./hero-banner";
import { getLocale, getTranslations } from "next-intl/server";

export async function HomePage() {
  const locale = await getLocale();
  const prefix = `/${locale}`;
  const t = await getTranslations("home");
  const [featured, heroProducts] = await Promise.all([
    getFeaturedProducts(4, locale),
    getHeroProducts(undefined, locale), // No limit - fetch all products where showInHero = true
  ]);

  return (
    <>
      {/* Hero Banner */}
      <HeroBanner products={heroProducts} />

      {/* Best Sellers Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 flex items-center justify-between">
            <h2 className="text-2xl font-medium text-foreground">
              {t("bestSellers")}
            </h2>
          </div>
          <ProductGrid products={featured} />
        </div>
      </section>

      {/* Trending Now Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-12 text-2xl font-medium text-foreground">
            {t("trendingNow")}
          </h2>

          {/* Featured Product Card - Entire banner is clickable */}
          <Link
            href={`${prefix}/catalog`}
            aria-label={t("openTrendingCollection")}
            className="group relative mb-8 block h-[490px] overflow-hidden rounded-lg"
          >
            <Image
              src="/trending/1.png"
              alt={t("trendingCollection")}
              fill
              className="object-cover"
              sizes="(max-width: 1280px) 100vw, 1280px"
            />
            {/* Bottom-left text content - positioned like Hero banner */}
            <div className="absolute bottom-4 left-4 z-10 md:bottom-6 md:left-6 lg:bottom-8 lg:left-8">
              <div className="flex flex-col gap-2">
                {/* Headline */}
                <div className="w-fit">
                  <span className="inline-block bg-black/60 px-4 py-2 text-3xl font-extrabold uppercase tracking-tight text-white drop-shadow-lg md:text-4xl lg:text-5xl">
                    {t("inspiredByFaith")}
                  </span>
                </div>
                {/* Subtitle */}
                <div className="w-fit">
                  <span className="inline-block bg-black/50 px-4 py-1.5 text-base font-medium text-white/90 md:text-lg lg:text-xl">
                    {t("minimalDesign")}
                  </span>
                </div>
                <div className="w-fit">
                  <span className="inline-block bg-black/50 px-4 py-1.5 text-base font-medium text-white/90 md:text-lg lg:text-xl">
                    {t("craftedForEveryday")}
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Smaller Product Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {featured.slice(0, 2).map((product, index) => (
              <Link
                key={product.id}
                href={`${prefix}/product/${product.slug}`}
                className="group relative h-[390px] overflow-hidden rounded-lg"
              >
                <Image
                  src={`/trending/${index + 2}.png`}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute bottom-6 left-6 z-10">
                  <h4 className="text-2xl font-medium text-white">
                    {product.name}
                  </h4>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Promotional Banner */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="relative overflow-hidden rounded-lg py-24">
            <Image
              src="/banner/1.png"
              alt=""
              aria-hidden="true"
              fill
              className="absolute inset-0 h-full w-full object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />

            <div className="relative z-10 flex items-center">
              <div className="flex max-w-2xl flex-col gap-6 px-8 md:px-12">
                <div className="flex flex-col gap-4">
                  <p className="bg-gradient-to-b from-accent-red to-accent-orange bg-clip-text text-xl font-medium text-transparent">
                    {t("modernEssentials")}
                  </p>
                  <h2 className="heading-1 text-foreground">
                    {t("faithMadeWearable")}
                  </h2>
                </div>

                <p className="text-2xl text-muted-foreground">
                  {t("cleanSilhouettes")}
                </p>

                <Link href={`${prefix}/catalog`}>
                  <Button variant="primary" size="md" className="w-fit">
                    {t("shopCollection")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
