import { prisma } from "@/server/db/prisma";
import type { Prisma, Gender } from "@prisma/client";

export interface GetAdminProductsParams {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  gender?: string;
  badge?: string;
  status?: string; // "active" | "inactive"
  search?: string;
  hero?: string; // "1" | "0" | undefined
}

export interface AdminProductsListResult {
   
  items: any[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getAdminProductsForList(
  params?: GetAdminProductsParams
): Promise<AdminProductsListResult> {
  const {
    page = 1,
    pageSize,
    categoryId,
    gender,
    badge,
    status,
    search,
    hero,
  } = params || {};

  // Build where clause
  const where: Prisma.ProductWhereInput = {};

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (gender) {
    where.gender = gender as Gender;
  }

  if (badge) {
    where.badge = badge as
      | "NEW"
      | "BESTSELLER"
      | "SALE"
      | "LIMITED"
      | "BACKINSTOCK"
      | "TRENDING";
  }

  if (status === "active") {
    where.isActive = true;
  } else if (status === "inactive") {
    where.isActive = false;
  }

  // Hero filter: "1" = enabled, "0" = disabled
  if (hero === "1") {
    where.showInHero = true;
  } else if (hero === "0") {
    where.showInHero = false;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ];
  }

  // Get total count
  const totalCount = await prisma.product.count({ where });

  // Calculate pagination
  // When pageSize is undefined, fetch all products (no skip/take)
  const skip = pageSize ? (page - 1) * pageSize : undefined;
  const take = pageSize; // undefined when showing all, number when paginated

  // Fetch products
  const items = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    ...(skip !== undefined && { skip }), // Only include skip if defined
    ...(take !== undefined && { take }), // Only include take if defined
    include: {
      category: true,
      translations: {
        where: { locale: "en" },
        select: { title: true },
      },
      colorVariants: {
        include: {
          color: true,
          images: {
            where: { role: "MAIN" },
            orderBy: { order: "asc" },
            take: 1,
          },
          sizes: {
            orderBy: { size: "asc" },
          },
        },
      },
    },
  });

  // Compute displayTitle for each product (translation -> title -> name fallback)
  const itemsWithDisplayTitle = items.map((product) => ({
    ...product,
    displayTitle: product.title || product.name || "",
  }));

  // When pageSize is undefined (show all), totalPages is 1 and pageSize in response is totalCount
  const totalPages = pageSize ? Math.ceil(totalCount / pageSize) : 1;

  return {
    items: itemsWithDisplayTitle,
    totalCount,
    page: pageSize ? page : 1, // Always use page 1 when showing all
    pageSize: pageSize ?? totalCount, // Return totalCount when showing all
    totalPages,
  };
}

export async function getAdminCategoriesForList() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
  });
}

