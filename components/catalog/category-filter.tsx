// components/catalog/category-filter.tsx
import Link from "next/link";
import type { Category } from "@/shared/types/prisma";

interface CategoryFilterProps {
  categories: Category[];
  activeSlug?: string | null;
}

export function CategoryFilter({
  categories,
  activeSlug,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/catalog"
        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
          !activeSlug
            ? "border-accent bg-accent text-accent-foreground"
            : "border-border bg-card text-muted-foreground hover:border-accent/50 hover:text-foreground"
        }`}
      >
        All
      </Link>
      {categories.map((category) => {
        const isActive = activeSlug === category.slug;
        return (
          <Link
            key={category.id}
            href={`/catalog?category=${encodeURIComponent(category.slug)}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              isActive
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border bg-card text-muted-foreground hover:border-accent/50 hover:text-foreground"
            }`}
          >
            {category.name}
          </Link>
        );
      })}
    </div>
  );
}


