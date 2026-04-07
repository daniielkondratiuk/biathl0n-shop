// src/features/catalog/ui/filters/filter-panel.tsx
"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  FilterSection,
  FilterCheckbox,
  FilterColorSwatches,
  FilterSizePills,
  FilterChip,
  FilterRadio,
} from "./filter-section";
import { Input } from "@/components/ui/input";
import {
  parseCatalogSearchParams,
  buildCatalogSearchParams,
  hasActiveFilters,
  DEFAULT_FILTER_STATE,
  GENDER_OPTIONS,
  BADGE_OPTIONS,
  SIZE_OPTIONS,
  type CatalogFilterState,
  type CatalogSort,
} from "../../lib/catalog-params";

// =============================================================================
// Types
// =============================================================================

type CategoryForFilter = {
  id: string;
  slug: string;
  name: string;
  nameFr?: string | null;
};

interface Color {
  id: string;
  name: string;
  slug: string;
  hex: string;
}

interface FilterPanelProps {
  categories: CategoryForFilter[];
  colors?: Color[];
  onClose?: () => void;
  isMobile?: boolean;
}

// SORT_OPTIONS will be created in component with translations

// =============================================================================
// Component
// =============================================================================

export function FilterPanel({
  categories,
  colors = [],
  onClose,
  isMobile = false,
}: FilterPanelProps) {
  const t = useTranslations("filters");
  const tCart = useTranslations("cart");
  const tProduct = useTranslations("product");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
    { value: "relevance", label: t("relevance") },
    { value: "price_asc", label: t("priceLowToHigh") },
    { value: "price_desc", label: t("priceHighToLow") },
    { value: "newest", label: t("newest") },
  ];

  // Parse current URL state
  const urlState = useMemo(
    () => parseCatalogSearchParams(searchParams),
    [searchParams]
  );

  // Local draft state - synced from URL, but price changes stay local until Apply
  const [draft, setDraft] = useState<CatalogFilterState>(urlState);

  // Sync draft state when URL changes (back/forward navigation)
  useEffect(() => {
    setDraft(urlState);
  }, [urlState]);

  // ==========================================================================
  // URL Update Helpers
  // ==========================================================================

  /**
   * Update URL immediately (for instant filters: sort, category, gender, badge, size, color)
   */
  const updateUrlInstant = useCallback(
    (newState: CatalogFilterState) => {
      // Build params WITHOUT price (price is only committed on Apply)
      const params = buildCatalogSearchParams(
        {
          ...newState,
          // Keep URL's current price values (not draft)
          minPrice: urlState.minPrice,
          maxPrice: urlState.maxPrice,
        },
        { commitPrice: true },
        searchParams
      );
      router.replace(`/catalog?${params.toString()}`);
    },
    [router, searchParams, urlState.minPrice, urlState.maxPrice]
  );

  const toggleMultiParam = useCallback(
    (next: URLSearchParams, key: string, value: string): void => {
      const normalizedTarget = value.trim().toUpperCase();
      if (!normalizedTarget) return;
      const current = next
        .getAll(key)
        .flatMap((entry) => entry.split(","))
        .map((entry) => entry.trim().toUpperCase())
        .filter((entry) => entry.length > 0);
      const exists = current.includes(normalizedTarget);
      const result = exists
        ? current.filter((entry) => entry !== normalizedTarget)
        : [...current, normalizedTarget];
      next.delete(key);
      result.forEach((entry) => next.append(key, entry));
      next.set("page", "1");
    },
    []
  );

  /**
   * Apply price filter to URL
   */
  const applyPriceFilter = useCallback(() => {
    const params = buildCatalogSearchParams(
      draft,
      { commitPrice: true },
      searchParams
    );
    router.replace(`/catalog?${params.toString()}`);
    if (isMobile) onClose?.();
  }, [draft, router, searchParams, isMobile, onClose]);

  /**
   * Reset price filter (clear from URL and draft)
   */
  const resetPriceFilter = useCallback(() => {
    const newDraft = { ...draft, minPrice: "", maxPrice: "" };
    setDraft(newDraft);
    const params = buildCatalogSearchParams(
      newDraft,
      { commitPrice: true },
      searchParams
    );
    router.replace(`/catalog?${params.toString()}`);
  }, [draft, router, searchParams]);

  /**
   * Reset all filters
   */
  const resetAllFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (searchParams.get("q")) {
      params.set("q", searchParams.get("q")!);
    }
    params.set("page", "1");
    router.replace(`/catalog?${params.toString()}`);
    setDraft(DEFAULT_FILTER_STATE);
    if (isMobile) onClose?.();
  }, [searchParams, router, isMobile, onClose]);

  // ==========================================================================
  // Toggle Handlers (instant URL update)
  // ==========================================================================

  const toggleSort = (sort: CatalogSort) => {
    const newState = { ...draft, sort };
    setDraft(newState);
    updateUrlInstant(newState);
  };

  const toggleCategory = (slug: string) => {
    const categories = draft.categories.includes(slug)
      ? draft.categories.filter((c) => c !== slug)
      : [...draft.categories, slug];
    const newState = { ...draft, categories };
    setDraft(newState);
    updateUrlInstant(newState);
  };

  const toggleGender = (gender: string) => {
    const genders = draft.genders.includes(gender)
      ? draft.genders.filter((g) => g !== gender)
      : [...draft.genders, gender];
    const newState = { ...draft, genders };
    setDraft(newState);
    updateUrlInstant(newState);
  };

  const toggleBadge = (badge: string) => {
    const next = new URLSearchParams(searchParams.toString());
    toggleMultiParam(next, "badge", badge);
    const nextUrl = next.toString();
    router.replace(nextUrl ? `${pathname}?${nextUrl}` : pathname, { scroll: false });
  };

  const toggleSize = (size: string) => {
    const sizes = draft.sizes.includes(size)
      ? draft.sizes.filter((s) => s !== size)
      : [...draft.sizes, size];
    const newState = { ...draft, sizes };
    setDraft(newState);
    updateUrlInstant(newState);
  };

  const toggleColor = (slug: string) => {
    const colors = draft.colors.includes(slug)
      ? draft.colors.filter((c) => c !== slug)
      : [...draft.colors, slug];
    const newState = { ...draft, colors };
    setDraft(newState);
    updateUrlInstant(newState);
  };

  // Price changes are LOCAL only (no URL update until Apply)
  const setMinPrice = (minPrice: string) => {
    setDraft((prev) => ({ ...prev, minPrice }));
  };

  const setMaxPrice = (maxPrice: string) => {
    setDraft((prev) => ({ ...prev, maxPrice }));
  };

  // ==========================================================================
  // Chip Helpers (remove from URL directly)
  // ==========================================================================

  const removeCategory = (slug: string) => toggleCategory(slug);
  const removeGender = (gender: string) => toggleGender(gender);
  const removeBadge = (badge: string) => toggleBadge(badge);
  const removeSize = (size: string) => toggleSize(size);
  const removeColor = (slug: string) => toggleColor(slug);

  // ==========================================================================
  // Derived State
  // ==========================================================================

  // Check if there are active filters in URL (for chips display)
  const urlHasActiveFilters = hasActiveFilters(urlState);

  // Check if price draft differs from URL (show Apply button)
  const priceDraftDiffers =
    draft.minPrice !== urlState.minPrice ||
    draft.maxPrice !== urlState.maxPrice;

  // Price is applied in URL
  const priceApplied = urlState.minPrice !== "" || urlState.maxPrice !== "";

  // Build price chip label
  const getPriceChipLabel = () => {
    if (urlState.minPrice && urlState.maxPrice) {
      return t("priceRange", { minPrice: urlState.minPrice, maxPrice: urlState.maxPrice });
    }
    if (urlState.minPrice) {
      return t("priceMin", { minPrice: urlState.minPrice });
    }
    if (urlState.maxPrice) {
      return t("upTo", { maxPrice: urlState.maxPrice });
    }
    return "";
  };

  const getGenderLabel = (gender: string) => {
    switch (gender.toLowerCase()) {
      case "men":
        return tProduct("mensClothing");
      case "women":
        return tProduct("womensClothing");
      case "kids":
        return tProduct("kidsClothing");
      case "unisex":
        return tProduct("unisexClothing");
      default:
        return gender;
    }
  };

  const getBadgeLabel = (badge: string) => {
    switch (badge) {
      case "NEW":
        return tCart("badgeNew");
      case "BESTSELLER":
        return tCart("badgeBestSeller");
      case "SALE":
        return tCart("badgeSale");
      case "LIMITED":
        return tCart("badgeLimited");
      case "BACKINSTOCK":
        return tCart("badgeBackInStock");
      case "TRENDING":
        return tCart("badgeTrending");
      default:
        return badge;
    }
  };

  const getCategoryLabel = (c: CategoryForFilter) => {
    if (locale === "fr") {
      const nameFr = (c.nameFr ?? "").trim();
      return nameFr || c.name;
    }
    return c.name;
  };

  // Get category name by slug
  const getCategoryName = (slug: string) => {
    const c = categories.find((x) => x.slug === slug);
    return c ? getCategoryLabel(c) : slug;
  };

  // Get color name by slug
  const getColorName = (slug: string) => {
    return colors.find((c) => c.slug === slug)?.name || slug;
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="flex h-full flex-col">
      {/* Mobile header */}
      {isMobile && (
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-medium text-foreground">{t("title")}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-muted transition-colors"
            aria-label={t("closeFilters")}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Active Filter Chips */}
      {urlHasActiveFilters && (
        <div className="border-b border-border px-5 py-3">
          <div className="flex flex-wrap gap-2">
            {/* Sort chip - optional, skip for simplicity */}

            {/* Category chips */}
            {urlState.categories.map((slug) => (
              <FilterChip
                key={`cat-${slug}`}
                label={getCategoryName(slug)}
                onRemove={() => removeCategory(slug)}
              />
            ))}

            {/* Gender chips */}
            {urlState.genders.map((g) => (
              <FilterChip
                key={`gender-${g}`}
                label={getGenderLabel(g)}
                onRemove={() => removeGender(g)}
              />
            ))}

            {/* Badge chips */}
            {urlState.badges.map((b) => (
              <FilterChip
                key={`badge-${b}`}
                label={getBadgeLabel(b)}
                onRemove={() => removeBadge(b)}
              />
            ))}

            {/* Size chips */}
            {urlState.sizes.map((s) => (
              <FilterChip
                key={`size-${s}`}
                label={s}
                onRemove={() => removeSize(s)}
              />
            ))}

            {/* Color chips */}
            {urlState.colors.map((slug) => (
              <FilterChip
                key={`color-${slug}`}
                label={getColorName(slug)}
                onRemove={() => removeColor(slug)}
              />
            ))}

            {/* Price chip */}
            {priceApplied && (
              <FilterChip
                label={getPriceChipLabel()}
                onRemove={resetPriceFilter}
              />
            )}

            {/* Clear all button */}
            <button
              onClick={resetAllFilters}
              className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors ml-1"
            >
              {t("clearAll")}
            </button>
          </div>
        </div>
      )}

      {/* Scrollable filter content */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="flex flex-col gap-6">
          {/* Sort By */}
          <FilterSection title={t("sortBy")} defaultOpen={false}>
            <div className="flex flex-col gap-3">
              {SORT_OPTIONS.map((option) => (
                <FilterRadio
                  key={option.value}
                  name="sort"
                  value={option.value}
                  label={option.label}
                  checked={draft.sort === option.value}
                  onChange={() => toggleSort(option.value)}
                />
              ))}
            </div>
          </FilterSection>

          <div className="h-px w-full bg-border" />

          {/* Category */}
          <FilterSection title={t("category")} defaultOpen={false}>
            <div className="flex flex-col gap-3">
              {categories.map((category) => (
                <FilterCheckbox
                  key={category.id}
                  label={getCategoryLabel(category)}
                  checked={draft.categories.includes(category.slug)}
                  onChange={() => toggleCategory(category.slug)}
                />
              ))}
            </div>
          </FilterSection>

          <div className="h-px w-full bg-border" />

          {/* Gender */}
          <FilterSection title={t("gender")} defaultOpen={false}>
            <div className="flex flex-col gap-3">
              {GENDER_OPTIONS.map((gender) => (
                <FilterCheckbox
                  key={gender}
                  label={getGenderLabel(gender)}
                  checked={draft.genders.includes(gender)}
                  onChange={() => toggleGender(gender)}
                />
              ))}
            </div>
          </FilterSection>

          <div className="h-px w-full bg-border" />

          {/* Badge */}
          <FilterSection title={t("badge")} defaultOpen={false}>
            <div className="flex flex-col gap-3">
              {BADGE_OPTIONS.map((badge) => (
                <FilterCheckbox
                  key={badge}
                  label={getBadgeLabel(badge)}
                  checked={draft.badges.includes(badge)}
                  onChange={() => toggleBadge(badge)}
                />
              ))}
            </div>
          </FilterSection>

          <div className="h-px w-full bg-border" />

          {/* Size */}
          <FilterSection title={t("size")} defaultOpen={false}>
            <FilterSizePills
              sizes={[...SIZE_OPTIONS]}
              selected={draft.sizes}
              onToggle={toggleSize}
            />
          </FilterSection>

          <div className="h-px w-full bg-border" />

          {/* Color */}
          {colors.length > 0 && (
            <>
              <FilterSection title={t("color")} defaultOpen={false}>
                <FilterColorSwatches
                  colors={colors}
                  selected={draft.colors}
                  onToggle={toggleColor}
                />
              </FilterSection>
              <div className="h-px w-full bg-border" />
            </>
          )}

          {/* Price Range */}
          <FilterSection title={t("price")} defaultOpen={false}>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder={t("min")}
                  value={draft.minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="h-9 w-full text-sm"
                  min="0"
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="number"
                  placeholder={t("max")}
                  value={draft.maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="h-9 w-full text-sm"
                  min="0"
                />
              </div>
              {/* Price Apply / Reset */}
              <div className="flex items-center gap-2">
                <button
                  onClick={applyPriceFilter}
                  disabled={!priceDraftDiffers && !draft.minPrice && !draft.maxPrice}
                  className="flex-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("applyPrice")}
                </button>
                {(priceApplied || draft.minPrice || draft.maxPrice) && (
                  <button
                    onClick={resetPriceFilter}
                    className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
                  >
                    {t("reset")}
                  </button>
                )}
              </div>
            </div>
          </FilterSection>
        </div>
      </div>

      {/* Footer - only show reset on mobile */}
      {isMobile && urlHasActiveFilters && (
        <div className="border-t border-border px-5 py-4">
          <button
            onClick={resetAllFilters}
            className="w-full rounded-full border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {t("resetAllFilters")}
          </button>
        </div>
      )}
    </div>
  );
}
