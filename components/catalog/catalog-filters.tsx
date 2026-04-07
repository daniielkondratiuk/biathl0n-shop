// components/catalog/catalog-filters.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { FilterSection, FilterCheckbox } from "./filter-section";
import type { Category } from "@/shared/types/prisma";

interface CatalogFiltersProps {
  categories: Category[];
}

export function CatalogFilters({ categories }: CatalogFiltersProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const selectedCategory = searchParams.get("category") || "";
  const selectedGender = searchParams.get("gender") || "";
  const selectedPriceRange = searchParams.get("price") || "";
  const selectedSports = searchParams.get("sports") || "";

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1"); // Reset to first page
    router.push(`/catalog?${params.toString()}`);
  }

  function toggleCategoryFilter(slug: string) {
    if (selectedCategory === slug) {
      updateFilter("category", "");
    } else {
      updateFilter("category", slug);
    }
  }

  function toggleGenderFilter(gender: string) {
    if (selectedGender === gender) {
      updateFilter("gender", "");
    } else {
      updateFilter("gender", gender);
    }
  }

  function togglePriceFilter(range: string) {
    if (selectedPriceRange === range) {
      updateFilter("price", "");
    } else {
      updateFilter("price", range);
    }
  }

  function toggleSportsFilter(sport: string) {
    if (selectedSports === sport) {
      updateFilter("sports", "");
    } else {
      updateFilter("sports", sport);
    }
  }

  return (
    <div className="flex w-full flex-col gap-7">
      {/* Category Filters - Simple text links (non-collapsible) */}
      <div className="flex flex-col gap-2.5">
        {categories.slice(0, 4).map((category) => (
          <button
            key={category.id}
            onClick={() => toggleCategoryFilter(category.slug)}
            className={`text-left text-sm font-medium leading-6 transition-colors ${
              selectedCategory === category.slug
                ? "text-foreground font-medium"
                : "text-foreground hover:text-muted-foreground"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-border dark:bg-neutral-700" />

      {/* Gender Filter */}
      <FilterSection title="Gender" defaultOpen={true}>
        <FilterCheckbox
          label="Men"
          checked={selectedGender === "men"}
          onChange={() => toggleGenderFilter("men")}
        />
        <FilterCheckbox
          label="Women"
          checked={selectedGender === "women"}
          onChange={() => toggleGenderFilter("women")}
        />
        <FilterCheckbox
          label="Unisex"
          checked={selectedGender === "unisex"}
          onChange={() => toggleGenderFilter("unisex")}
        />
      </FilterSection>

      {/* Divider */}
      <div className="h-px w-full bg-border dark:bg-neutral-700" />

      {/* Kids Filter */}
      <FilterSection title="Kids" defaultOpen={true}>
        <FilterCheckbox
          label="Boys"
          checked={selectedGender === "boys"}
          onChange={() => toggleGenderFilter("boys")}
        />
        <FilterCheckbox
          label="Girls"
          checked={selectedGender === "girls"}
          onChange={() => toggleGenderFilter("girls")}
        />
      </FilterSection>

      {/* Divider */}
      <div className="h-px w-full bg-border dark:bg-neutral-700" />

      {/* Price Filter */}
      <FilterSection title="Shop By Price" defaultOpen={true}>
        <FilterCheckbox
          label="$25 - $50"
          checked={selectedPriceRange === "25-50"}
          onChange={() => togglePriceFilter("25-50")}
        />
        <FilterCheckbox
          label="$50 - $100"
          checked={selectedPriceRange === "50-100"}
          onChange={() => togglePriceFilter("50-100")}
        />
        <FilterCheckbox
          label="$100 - $150"
          checked={selectedPriceRange === "100-150"}
          onChange={() => togglePriceFilter("100-150")}
        />
        <FilterCheckbox
          label="Over $150"
          checked={selectedPriceRange === "150+"}
          onChange={() => togglePriceFilter("150+")}
        />
      </FilterSection>

      {/* Divider */}
      <div className="h-px w-full bg-border dark:bg-neutral-700" />

      {/* Shoe Height Filter - Collapsed by default */}
      <FilterSection title="Shoe Height" defaultOpen={false}>
        <p className="text-sm text-muted-foreground">No height filters available.</p>
      </FilterSection>

      {/* Divider */}
      <div className="h-px w-full bg-border dark:bg-neutral-700" />

      {/* Sports Filter */}
      <FilterSection title="Sports" defaultOpen={true}>
        <FilterCheckbox
          label="Lifestyle"
          checked={selectedSports === "lifestyle"}
          onChange={() => toggleSportsFilter("lifestyle")}
        />
        <FilterCheckbox
          label="Skateboarding"
          checked={selectedSports === "skateboarding"}
          onChange={() => toggleSportsFilter("skateboarding")}
        />
        <FilterCheckbox
          label="Dance"
          checked={selectedSports === "dance"}
          onChange={() => toggleSportsFilter("dance")}
        />
      </FilterSection>
    </div>
  );
}
