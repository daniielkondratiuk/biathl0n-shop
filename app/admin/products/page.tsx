import { use } from "react";
import { ProductListPage } from "@/features/admin/products";

interface AdminProductsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function AdminProductsPage({
  searchParams,
}: AdminProductsPageProps) {
  const params = use(searchParams);

  // Normalize searchParams to plain object
  const normalizedParams: {
    page?: string;
    pageSize?: string;
    categoryId?: string;
    gender?: string;
    badge?: string;
    status?: string;
    search?: string;
    hero?: string;
  } = {};

  if (params.page) {
    normalizedParams.page =
      typeof params.page === "string" ? params.page : params.page[0];
  }
  if (params.pageSize) {
    normalizedParams.pageSize =
      typeof params.pageSize === "string" ? params.pageSize : params.pageSize[0];
  }
  if (params.categoryId) {
    normalizedParams.categoryId =
      typeof params.categoryId === "string"
        ? params.categoryId
        : params.categoryId[0];
  }
  if (params.gender) {
    normalizedParams.gender =
      typeof params.gender === "string" ? params.gender : params.gender[0];
  }
  if (params.badge) {
    normalizedParams.badge =
      typeof params.badge === "string" ? params.badge : params.badge[0];
  }
  if (params.status) {
    normalizedParams.status =
      typeof params.status === "string" ? params.status : params.status[0];
  }
  if (params.search) {
    normalizedParams.search =
      typeof params.search === "string" ? params.search : params.search[0];
  }
  if (params.hero) {
    normalizedParams.hero =
      typeof params.hero === "string" ? params.hero : params.hero[0];
  }

  return <ProductListPage searchParams={normalizedParams} />;
}
