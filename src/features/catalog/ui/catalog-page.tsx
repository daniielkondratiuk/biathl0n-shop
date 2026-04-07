// src/features/catalog/ui/catalog-page.tsx
import { Suspense, type ReactElement } from "react";
import { getLocale } from "next-intl/server";
import { ProductGrid, ProductGridSkeleton } from "@/features/products/ui/product-grid";
import { Pagination } from "@/shared/ui/admin/pagination";
import {
  getAllCategories,
  getAllColors,
  getCatalogProducts,
} from "@/features/products";
import { CatalogLayoutClient } from "./catalog-layout-client";
import {
  parseCatalogSearchParams,
  normalizeSearchQuery,
  toBackendSort,
} from "../lib/catalog-params";

interface CatalogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface CatalogProductsSectionProps {
  filters: ReturnType<typeof parseCatalogSearchParams>;
  q: string | undefined;
  page: number;
  pageSize: number;
  locale: string;
}

async function CatalogProductsSection({
  filters,
  q,
  page,
  pageSize,
  locale,
}: CatalogProductsSectionProps): Promise<ReactElement> {
  const query = q ?? "";
  const isSearchActive = !!q;

  const catalog = await getCatalogProducts({
    page: isSearchActive ? 1 : page,
    pageSize: isSearchActive ? 10000 : pageSize,
    categorySlugs:
      filters.categories.length > 0 ? filters.categories : undefined,
    sort: toBackendSort(filters.sort),
    search: query,
    genders: filters.genders.length > 0 ? filters.genders : undefined,
    badges: filters.badges.length > 0 ? filters.badges : undefined,
    sizes: filters.sizes.length > 0 ? filters.sizes : undefined,
    minPrice: filters.minPrice ? parseInt(filters.minPrice) : undefined,
    maxPrice: filters.maxPrice ? parseInt(filters.maxPrice) : undefined,
    colorSlugs: filters.colors.length > 0 ? filters.colors : undefined,
    locale,
  });

  const { items, total: backendTotal, totalPages: backendTotalPages } = catalog;

  const filteredItems = query
    ? items.filter((product) =>
        product.name.toLowerCase().includes(query.toLowerCase())
      )
    : items;

  const total = isSearchActive ? filteredItems.length : backendTotal;
  const totalPages = isSearchActive
    ? Math.ceil(total / pageSize)
    : backendTotalPages;
  const pageItems = isSearchActive
    ? filteredItems.slice((page - 1) * pageSize, page * pageSize)
    : filteredItems;
  const hasActiveFilters =
    query.length > 0 ||
    filters.categories.length > 0 ||
    filters.genders.length > 0 ||
    filters.badges.length > 0 ||
    filters.sizes.length > 0 ||
    filters.colors.length > 0 ||
    !!filters.minPrice ||
    !!filters.maxPrice;

  return (
    <>
      <ProductGrid
        products={pageItems}
        clearFiltersHref={hasActiveFilters ? `/${locale}/catalog?page=1` : undefined}
      />

      {totalPages > 1 && (
        <div className="mt-10 flex flex-col items-center gap-3">
          <Pagination
            basePath={`/${locale}/catalog`}
            currentPage={page}
            totalPages={totalPages}
          />
        </div>
      )}
    </>
  );
}

export async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const locale = await getLocale();

  // Parse search params using shared helper
  const filters = parseCatalogSearchParams(params);
  const q = normalizeSearchQuery(filters.q);

  const pageParam = params?.page;
  const page = Number(pageParam) > 0 ? Number(pageParam) : 1;
  const pageSize = 36;
  const isSearchActive = !!q;

  const [categories, colors, catalogSummary] = await Promise.all([
    getAllCategories(),
    getAllColors(),
    getCatalogProducts({
      page: isSearchActive ? 1 : page,
      pageSize: isSearchActive ? 10000 : 1,
      categorySlugs:
        filters.categories.length > 0 ? filters.categories : undefined,
      sort: toBackendSort(filters.sort),
      search: q ?? "",
      genders: filters.genders.length > 0 ? filters.genders : undefined,
      badges: filters.badges.length > 0 ? filters.badges : undefined,
      sizes: filters.sizes.length > 0 ? filters.sizes : undefined,
      minPrice: filters.minPrice ? parseInt(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice ? parseInt(filters.maxPrice) : undefined,
      colorSlugs: filters.colors.length > 0 ? filters.colors : undefined,
      locale,
    }),
  ]);

  const summaryItems = catalogSummary.items;
  const total = isSearchActive
    ? summaryItems.filter((product) =>
        product.name.toLowerCase().includes((q ?? "").toLowerCase())
      ).length
    : catalogSummary.total;

  return (
    <CatalogLayoutClient categories={categories} colors={colors} total={total}>
      {q && (
        <p className="mb-4 text-sm text-foreground/70">
          Results for &ldquo;{q}&rdquo; ({total})
        </p>
      )}

      <Suspense fallback={<ProductGridSkeleton pageSize={pageSize} />}>
        <CatalogProductsSection
          filters={filters}
          q={q}
          page={page}
          pageSize={pageSize}
          locale={locale}
        />
      </Suspense>
    </CatalogLayoutClient>
  );
}
