import { prisma } from "@/server/db/prisma";
import { unstable_cache } from "next/cache";
import type { Prisma, Gender, ProductBadge, Size } from "@prisma/client";

export type CatalogSort = "price_asc" | "price_desc" | "newest";

type TranslationEntry = { locale: string; title: string; description: string | null };

type TranslatableProduct = {
  translations?: TranslationEntry[];
  title?: string | null;
  name?: string | null;
  description: string | null;
};

/**
 * Helper to resolve translated fields from ProductTranslation.
 * Falls back to current locale -> "en" -> legacy Product fields.
 */
function resolveTranslatedFields(
  product: TranslatableProduct,
  locale: string
): { title: string; description: string | null } {
  const translations = product.translations || [];
  
  // Try current locale first
  let translation = translations.find((t) => t.locale === locale);
  
  // Fallback to "en"
  if (!translation) {
    translation = translations.find((t) => t.locale === "en");
  }
  
  // Use translation if found
  if (translation) {
    return {
      title: translation.title,
      description: translation.description,
    };
  }
  
  // Fallback to legacy Product fields
  return {
    title: product.title || product.name || "",
    description: product.description,
  };
}

async function getAllCategoriesImpl() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      nameFr: true,
      createdAt: true,
      updatedAt: true,
      description: true,
    },
  });
}

export async function getAllCategories() {
  const args: [] = [];
  return unstable_cache(
    async () => getAllCategoriesImpl(),
    ["public:getAllCategories", JSON.stringify(args)],
    { revalidate: 120 }
  )();
}

/**
 * Canonical color order for consistent display.
 */
const CANONICAL_COLOR_ORDER = [
  "black",
  "gray",
  "light-gray",
  "white",
  "green",
  "red",
  "dark-red",
  "brown",
  "light-brown",
  "blue",
  "light-blue",
  "orange",
] as const;


/**
 * Get all colors for catalog filtering.
 * Returns colors sorted in canonical order.
 */
async function getAllColorsImpl() {
  const allColors = await prisma.color.findMany();

  // Filter to canonical colors only
  const canonicalSlugs = new Set<string>(CANONICAL_COLOR_ORDER);
  const canonicalColors = allColors.filter((c) => canonicalSlugs.has(c.slug));

  // Sort by canonical order
  const orderMap = new Map<string, number>(
    CANONICAL_COLOR_ORDER.map((slug, index) => [slug, index])
  );
  return canonicalColors.sort((a, b) => {
    const aIndex = orderMap.get(a.slug) ?? 999;
    const bIndex = orderMap.get(b.slug) ?? 999;
    return aIndex - bIndex;
  });
}

export async function getAllColors() {
  const args: [] = [];
  return unstable_cache(
    async () => getAllColorsImpl(),
    ["public:getAllColors", JSON.stringify(args)],
    { revalidate: 120 }
  )();
}

const getFeaturedProductsCached = unstable_cache(
  async (limit: number, locale: string) => {
  const products = await prisma.product.findMany({
    where: { 
      isActive: true,
      visible: true, // Backward compatibility
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      category: true,
      translations: {
        where: {
          locale: { in: [locale, "en"] },
        },
      },
      colorVariants: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          color: {
            select: {
              id: true,
              name: true,
              nameFr: true,
              hex: true,
            },
          },
          images: {
            select: {
              id: true,
              url: true,
              role: true,
              order: true,
            },
            orderBy: [{ role: "asc" }, { order: "asc" }],
          },
          sizes: {
            where: { stock: { gt: 0 } },
            orderBy: { size: "asc" },
          },
        },
      },
    },
  });

  // Resolve translated fields
  return products.map((product) => {
    const { title, description } = resolveTranslatedFields(product, locale);
    return {
      ...product,
      title,
      description,
    };
  });
  },
  ["public-featured-products"],
  { revalidate: 120 }
);

export async function getFeaturedProducts(limit = 8, locale = "en") {
  return getFeaturedProductsCached(limit, locale);
}

export async function getLimitedProducts(limit = 5, locale = "en") {
  const products = await prisma.product.findMany({
    where: { 
      isActive: true,
      visible: true,
      badge: "LIMITED",
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      category: true,
      translations: {
        where: {
          locale: { in: [locale, "en"] },
        },
      },
      colorVariants: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          color: {
            select: {
              id: true,
              name: true,
              nameFr: true,
              hex: true,
            },
          },
          images: {
            select: {
              id: true,
              url: true,
              role: true,
              order: true,
            },
            orderBy: [{ role: "asc" }, { order: "asc" }],
          },
          sizes: {
            where: { stock: { gt: 0 } },
            orderBy: { size: "asc" },
          },
        },
      },
    },
  });

  // Resolve translated fields
  return products.map((product) => {
    const { title, description } = resolveTranslatedFields(product, locale);
    return {
      ...product,
      title,
      description,
    };
  });
}

/**
 * Get products flagged for hero banner display.
 * Returns products where showInHero = true.
 * If limit is provided, returns up to that many products.
 * If limit is undefined, returns all hero products.
 * Ordered by updatedAt desc (most recently updated first).
 */
export async function getHeroProducts(limit?: number, locale = "en") {
  const products = await prisma.product.findMany({
    where: { 
      isActive: true,
      visible: true,
      showInHero: true,
    },
    orderBy: { updatedAt: "desc" },
    ...(limit !== undefined && { take: limit }),
    include: {
      category: true,
      translations: {
        where: {
          locale: { in: [locale, "en"] },
        },
      },
      colorVariants: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          color: {
            select: {
              id: true,
              name: true,
              nameFr: true,
              hex: true,
            },
          },
          images: {
            select: {
              id: true,
              url: true,
              role: true,
              order: true,
            },
            orderBy: [{ role: "asc" }, { order: "asc" }],
          },
          sizes: {
            where: { stock: { gt: 0 } },
            orderBy: { size: "asc" },
          },
        },
      },
    },
  });

  // Resolve translated fields
  return products.map((product) => {
    const { title, description } = resolveTranslatedFields(product, locale);
    return {
      ...product,
      title,
      description,
    };
  });
}

const getProductBySlugCached = unstable_cache(
  async (slug: string, locale: string) => {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      translations: {
        where: {
          locale: { in: [locale, "en"] },
        },
      },
      colorVariants: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          color: {
            select: {
              id: true,
              name: true,
              nameFr: true,
              hex: true,
            },
          },
          images: {
            select: {
              id: true,
              url: true,
              role: true,
              order: true,
            },
            orderBy: [{ role: "asc" }, { order: "asc" }],
          },
          sizes: {
            orderBy: { size: "asc" },
          },
        },
      },
      patches: {
        include: {
          patch: true,
        },
      },
    },
  });

  if (!product) {
    return null;
  }

  // Resolve translated fields
  const { title, description } = resolveTranslatedFields(product, locale);
  return {
    ...product,
    title,
    description,
  };
  },
  ["public-product-by-slug"],
  { revalidate: 120 }
);

export async function getProductBySlug(slug: string, locale = "en") {
  return getProductBySlugCached(slug, locale);
}

type CatalogProductsParams = {
  page: number;
  pageSize: number;
  categorySlug?: string;
  categorySlugs?: string[]; // Support multiple categories
  sort?: CatalogSort;
  search?: string;
  gender?: string;
  genders?: string[]; // Support multiple genders
  priceRange?: string;
  minPrice?: number; // In dollars
  maxPrice?: number; // In dollars
  colorSlugs?: string[]; // Color filter
  badges?: string[]; // Badge filter (NEW, BESTSELLER, etc.)
  sizes?: string[]; // Size filter (XS, S, M, L, XL, XXL)
  locale?: string; // Locale for translations
};

async function getCatalogProductsImpl(params: CatalogProductsParams) {
  const {
    page,
    pageSize,
    categorySlug,
    categorySlugs,
    sort,
    search,
    gender,
    genders,
    priceRange,
    minPrice,
    maxPrice,
    colorSlugs,
    badges,
    sizes,
    locale = "en",
  } = params;

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    visible: true, // Backward compatibility
  };

  // Category filter - support single slug (backward compat) or multiple
  const allCategorySlugs = categorySlugs?.length
    ? categorySlugs
    : categorySlug
      ? [categorySlug]
      : [];

  if (allCategorySlugs.length === 1) {
    where.category = { slug: allCategorySlugs[0] };
  } else if (allCategorySlugs.length > 1) {
    where.category = { slug: { in: allCategorySlugs } };
  }

  // Search filter
  if (search) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } }, // Backward compatibility
          { description: { contains: search, mode: "insensitive" } },
        ],
      },
    ];
  }

  // Gender filter - support single (backward compat) or multiple
  const allGenders = genders?.length
    ? genders.map((g) => g.toUpperCase())
    : gender
      ? [gender.toUpperCase()]
      : [];

  const validGenders = allGenders.filter((g) =>
    ["MEN", "WOMEN", "KIDS", "UNISEX"].includes(g)
  );

  if (validGenders.length === 1) {
    where.gender = validGenders[0] as Gender;
  } else if (validGenders.length > 1) {
    where.gender = { in: validGenders as Gender[] };
  }

  // Badge filter - support multiple
  if (badges && badges.length > 0) {
    const validBadges = badges.filter((b) =>
      ["NEW", "BESTSELLER", "SALE", "LIMITED", "BACKINSTOCK", "TRENDING"].includes(b)
    );
    if (validBadges.length === 1) {
      where.badge = validBadges[0] as ProductBadge;
    } else if (validBadges.length > 1) {
      where.badge = { in: validBadges as ProductBadge[] };
    }
  }

  // Price range filter - support legacy priceRange param OR minPrice/maxPrice
  if (minPrice !== undefined || maxPrice !== undefined) {
    const basePriceFilter: { gte?: number; lte?: number } = {};
    if (minPrice !== undefined && minPrice > 0) {
      basePriceFilter.gte = minPrice * 100; // Convert dollars to cents
    }
    if (maxPrice !== undefined && maxPrice > 0) {
      basePriceFilter.lte = maxPrice * 100;
    }
    where.basePrice = basePriceFilter;
  } else if (priceRange) {
    // Legacy support for price range strings like "25-50" or "150+"
    const [min, max] = priceRange.split("-");
    if (max) {
      where.basePrice = {
        gte: parseInt(min) * 100,
        lte: parseInt(max) * 100,
      };
    } else if (priceRange === "150+") {
      where.basePrice = {
        gte: 15000, // $150 in cents
      };
    }
  }

  // Color filter - filter products that have variants with selected colors
  if (colorSlugs && colorSlugs.length > 0) {
    where.colorVariants = {
      some: {
        isActive: true,
        color: {
          slug: { in: colorSlugs },
        },
      },
    };
  }

  // Size filter - filter products that have variants with selected sizes
  if (sizes && sizes.length > 0) {
    const validSizes = sizes.filter((s) =>
      ["XS", "S", "M", "L", "XL", "XXL"].includes(s)
    );
    if (validSizes.length > 0) {
      // If we already have a colorVariants filter, we need to combine conditions
      if (where.colorVariants) {
        where.colorVariants.some = {
          ...where.colorVariants.some,
          sizes: {
            some: {
              size: { in: validSizes as Size[] },
              stock: { gt: 0 }, // Only count sizes that are in stock
            },
          },
        };
      } else {
        where.colorVariants = {
          some: {
            isActive: true,
            sizes: {
              some: {
                size: { in: validSizes as Size[] },
                stock: { gt: 0 },
              },
            },
          },
        };
      }
    }
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
  if (sort === "price_asc") {
    orderBy = { basePrice: "asc" };
  } else if (sort === "price_desc") {
    orderBy = { basePrice: "desc" };
  } else if (sort === "newest") {
    orderBy = { createdAt: "desc" };
  }

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: true,
        translations: {
          where: {
            locale: { in: [locale, "en"] },
          },
        },
        colorVariants: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          include: {
            color: {
              select: {
                id: true,
                name: true,
                nameFr: true,
                hex: true,
              },
            },
            images: {
              select: {
                id: true,
                url: true,
                role: true,
                order: true,
              },
              orderBy: [{ role: "asc" }, { order: "asc" }],
            },
            sizes: {
              orderBy: { size: "asc" },
            },
          },
        },
      },
    }),
  ]);

  // Resolve translated fields
  const itemsWithTranslations = items.map((product) => {
    const { title, description } = resolveTranslatedFields(product, locale);
    return {
      ...product,
      title,
      description,
    };
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    items: itemsWithTranslations,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getCatalogProducts(params: CatalogProductsParams) {
  const args = [params] as const;
  return unstable_cache(
    async (nextParams: CatalogProductsParams) =>
      getCatalogProductsImpl(nextParams),
    ["public:getCatalogProducts", JSON.stringify(args)],
    { revalidate: 120 }
  )(params);
}
