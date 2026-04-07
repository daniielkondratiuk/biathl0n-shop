import {
  getAdminProductsForList,
  getAdminCategoriesForList,
} from "@/features/admin/products";
import { ProductListPageClient } from "./product-list-page-client";

interface ProductListPageProps {
  searchParams?: {
    page?: string;
    pageSize?: string;
    categoryId?: string;
    gender?: string;
    badge?: string;
    status?: string;
    search?: string;
    hero?: string;
  };
}

export async function ProductListPage({ searchParams }: ProductListPageProps) {
  // pageSize in URL: "all" or a number string (e.g., "10", "25", "50")
  const pageSizeParam = searchParams?.pageSize || "25";
  const isAllSelected = pageSizeParam === "all";
  const page = isAllSelected ? 1 : searchParams?.page ? parseInt(searchParams.page, 10) : 1;
  const pageSize = isAllSelected ? undefined : parseInt(pageSizeParam, 10) || 25;

  const [productsData, categories] = await Promise.all([
    getAdminProductsForList({
      page,
      pageSize,
      categoryId: searchParams?.categoryId,
      gender: searchParams?.gender,
      badge: searchParams?.badge,
      status: searchParams?.status,
      search: searchParams?.search,
      hero: searchParams?.hero,
    }),
    getAdminCategoriesForList(),
  ]);

  // Build current filters object to pass to client
  const currentFilters = {
    categoryId: searchParams?.categoryId || "",
    gender: searchParams?.gender || "",
    badge: searchParams?.badge || "",
    status: searchParams?.status || "",
    search: searchParams?.search || "",
    hero: searchParams?.hero || "",
  };

  return (
    <ProductListPageClient
      products={productsData.items}
      categories={categories}
      totalCount={productsData.totalCount}
      page={productsData.page}
      pageSize={isAllSelected ? "all" : productsData.pageSize}
      totalPages={productsData.totalPages}
      currentFilters={currentFilters}
    />
  );
}

