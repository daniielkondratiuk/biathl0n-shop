// src/features/admin/categories/ui/categories-list-page.tsx
import Link from "next/link";
import { listCategories } from "@/features/admin/categories";

export async function CategoriesListPage() {
  const categories = await listCategories();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          Categories
        </h2>
        <Link
          href="/admin/categories/new"
          className="inline-flex h-8 items-center rounded-full bg-accent px-4 text-xs font-medium text-accent-foreground hover:opacity-90 transition-colors cursor-pointer"
        >
          New category
        </Link>
      </div>
      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No categories yet.
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {categories.map((cat: (typeof categories)[0]) => (
            <li
              key={cat.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
            >
              <div>
                <p className="font-medium text-card-foreground">
                  {cat.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  /category/{cat.slug}
                </p>
              </div>
              <Link
                href={`/admin/categories/${cat.id}`}
                className="text-xs font-medium text-foreground underline-offset-4 hover:text-accent transition-colors"
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

