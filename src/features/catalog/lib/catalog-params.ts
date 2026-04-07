// src/features/catalog/lib/catalog-params.ts
/**
 * Shared helpers for parsing and building catalog search params.
 * Used by both filter UI and server-side data fetching to ensure consistency.
 */

export type CatalogSort = "relevance" | "price_asc" | "price_desc" | "newest";

export interface CatalogFilterState {
  sort: CatalogSort;
  categories: string[];
  genders: string[];
  badge?: string;
  badges: string[];
  sizes: string[];
  colors: string[];
  minPrice: string;
  maxPrice: string;
  q: string;
}

export const DEFAULT_FILTER_STATE: CatalogFilterState = {
  sort: "relevance",
  categories: [],
  genders: [],
  badge: "",
  badges: [],
  sizes: [],
  colors: [],
  minPrice: "",
  maxPrice: "",
  q: "",
};

// Valid options for validation
export const GENDER_OPTIONS = ["men", "women", "kids", "unisex"] as const;
export const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export const BADGE_OPTIONS = [
  "NEW",
  "BESTSELLER",
  "SALE",
  "LIMITED",
  "BACKINSTOCK",
  "TRENDING",
] as const;

export const BADGE_LABELS: Record<string, string> = {
  NEW: "New",
  BESTSELLER: "Best Seller",
  SALE: "Sale",
  LIMITED: "Limited",
  BACKINSTOCK: "Back in Stock",
  TRENDING: "Trending",
};

export const GENDER_LABELS: Record<string, string> = {
  men: "Men",
  women: "Women",
  kids: "Kids",
  unisex: "Unisex",
};

/**
 * Normalize a raw search query: trim and enforce minimum length of 3.
 */
export function normalizeSearchQuery(
  raw: string | undefined
): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  return trimmed.length >= 3 ? trimmed : undefined;
}

/**
 * Parse URL search params into filter state.
 * Handles both single values and repeated params (e.g., category=a&category=b).
 */
export function parseCatalogSearchParams(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): CatalogFilterState {
  const getAll = (key: string): string[] => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.getAll(key);
    }
    const value = searchParams[key];
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };

  const get = (key: string): string => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) || "";
    }
    const value = searchParams[key];
    if (!value) return "";
    return Array.isArray(value) ? value[0] : value;
  };

  const sortValue = get("sort");
  const sort: CatalogSort =
    sortValue === "price_asc" ||
    sortValue === "price_desc" ||
    sortValue === "newest"
      ? sortValue
      : "relevance";
  const normalizedBadges = getAll("badge")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value) => typeof value === "string" && value.trim().length > 0);
  const badgeValue = normalizedBadges[0] ?? "";

  return {
    sort,
    categories: getAll("category").filter(Boolean),
    genders: getAll("gender").filter(Boolean),
    badge: badgeValue,
    badges: normalizedBadges,
    sizes: getAll("size").filter(Boolean),
    colors: getAll("color").filter(Boolean),
    minPrice: get("minPrice"),
    maxPrice: get("maxPrice"),
    q: get("q"),
  };
}

/**
 * Build URL search params from filter state.
 * @param state - The filter state to serialize
 * @param options.commitPrice - If false, excludes minPrice/maxPrice from output
 * @param preserveParams - URLSearchParams to preserve (e.g., search query)
 */
export function buildCatalogSearchParams(
  state: CatalogFilterState,
  options: { commitPrice: boolean } = { commitPrice: true },
  preserveParams?: URLSearchParams
): URLSearchParams {
  const params = new URLSearchParams();

  // Search query: prefer state.q, fall back to preserveParams
  const qValue = state.q || preserveParams?.get("q") || "";
  if (qValue) {
    params.set("q", qValue);
  }

  // Sort (omit if relevance/default)
  if (state.sort && state.sort !== "relevance") {
    params.set("sort", state.sort);
  }

  // Categories (support multiple)
  state.categories.forEach((cat) => {
    if (cat) params.append("category", cat);
  });

  // Genders (support multiple)
  state.genders.forEach((g) => {
    if (g) params.append("gender", g);
  });

  // Badge (single)
  if (state.badge && state.badge.trim() !== "") {
    params.set("badge", state.badge);
  }

  // Badges (support multiple)
  state.badges.forEach((b) => {
    if (b && b !== state.badge) params.append("badge", b);
  });

  // Sizes (support multiple)
  state.sizes.forEach((s) => {
    if (s) params.append("size", s);
  });

  // Colors (support multiple)
  state.colors.forEach((color) => {
    if (color) params.append("color", color);
  });

  // Price range - only if commitPrice is true
  if (options.commitPrice) {
    if (state.minPrice) {
      params.set("minPrice", state.minPrice);
    }
    if (state.maxPrice) {
      params.set("maxPrice", state.maxPrice);
    }
  }

  // Always reset to page 1 when filters change
  params.set("page", "1");

  return params;
}

/**
 * Check if any filters are active (non-default).
 */
export function hasActiveFilters(state: CatalogFilterState): boolean {
  return (
    state.sort !== "relevance" ||
    state.categories.length > 0 ||
    state.genders.length > 0 ||
    (state.badge?.trim() ?? "") !== "" ||
    state.badges.length > 0 ||
    state.sizes.length > 0 ||
    state.colors.length > 0 ||
    state.minPrice !== "" ||
    state.maxPrice !== "" ||
    state.q !== ""
  );
}

/**
 * Convert frontend sort to backend sort.
 * "relevance" maps to "newest" on backend.
 */
export function toBackendSort(
  sort: CatalogSort
): "price_asc" | "price_desc" | "newest" {
  if (sort === "price_asc" || sort === "price_desc" || sort === "newest") {
    return sort;
  }
  return "newest";
}
