// src/features/admin/products/ui/products-table.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/features/products";

const BADGE_LABELS: Record<string, string> = {
  NEW: "New",
  BESTSELLER: "Best Seller",
  SALE: "Sale",
  LIMITED: "Limited",
  BACKINSTOCK: "Back in Stock",
  TRENDING: "Trending",
};

const BADGE_VARIANTS: Record<
  string,
  "limited" | "new" | "sale" | "bestseller" | "trending" | "backinstock" | "default"
> = {
  NEW: "new",
  LIMITED: "limited",
  SALE: "sale",
  BESTSELLER: "bestseller",
  TRENDING: "trending",
  BACKINSTOCK: "backinstock",
};

type Product = {
  id: string;
  name: string;
  title: string;
  displayTitle?: string; // Computed: translation title -> title -> name
  basePrice: number;
  price: number;
  gender: string | null;
  badge: string | null;
  isActive: boolean;
  showInHero: boolean;
  category: {
    name: string;
  };
  colorVariants: Array<{
    images: Array<{ url: string }>;
    sizes: Array<{ stock: number }>;
  }>;
};

interface ProductsTableProps {
  products: Product[];
  onSelectionChange?: (selectedIds: string[]) => void;
  resetSelection?: number;
}

export function ProductsTable({
  products,
  onSelectionChange,
  resetSelection,
}: ProductsTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset selection when resetSelection changes
  useEffect(() => {
    if (resetSelection !== undefined && resetSelection > 0) {
      setSelectedIds(new Set());
      onSelectionChange?.([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSelection]);

  function handleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      const allIds = new Set(products.map((p) => p.id));
      setSelectedIds(allIds);
      onSelectionChange?.(Array.from(allIds));
    } else {
      setSelectedIds(new Set());
      onSelectionChange?.([]);
    }
  }

  function handleSelectOne(productId: string, checked: boolean) {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedIds(newSelected);
    onSelectionChange?.(Array.from(newSelected));
  }

  // Calculate total stock for each product
  const productsWithStock = products.map((product) => {
    const totalStock = product.colorVariants.reduce((sum, cv) => {
      return sum + cv.sizes.reduce((sizeSum, size) => sizeSum + size.stock, 0);
    }, 0);
    return { ...product, totalStock };
  });

  const allSelected = products.length > 0 && selectedIds.size === products.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < products.length;

  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">No products found.</p>
        <Link href="/admin/products/new">
          <Button variant="primary" size="md" className="mt-4">
            Create First Product
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-border text-accent focus:ring-2 focus:ring-ring focus:ring-offset-1"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Image
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Gender
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Badge
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Stock
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Hero
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {productsWithStock.map((product) => (
              <tr
                key={product.id}
                className="transition-colors hover:bg-muted/50"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(product.id)}
                    onChange={(e) =>
                      handleSelectOne(product.id, e.target.checked)
                    }
                    className="h-4 w-4 rounded border-border text-accent focus:ring-2 focus:ring-ring focus:ring-offset-1"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded border border-border bg-muted">
                    <SafeImage
                      src={product.colorVariants[0]?.images[0]?.url || null}
                      alt={product.displayTitle || product.title || product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">
                    {product.displayTitle || product.title || product.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {product.category.name}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-foreground">
                  {((product.basePrice ?? product.price ?? 0) / 100).toLocaleString("en-US", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </td>
                <td className="px-4 py-3">
                  {product.gender ? (
                    <span className="text-xs text-muted-foreground">
                      {product.gender}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {product.badge ? (
                    <Badge
                      variant={BADGE_VARIANTS[product.badge] || "default"}
                      size="md"
                      showIcon={true}
                    >
                      {BADGE_LABELS[product.badge] || product.badge}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-foreground">
                  {product.totalStock}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={product.isActive ? "paid" : "default"}
                    size="sm"
                    showIcon={false}
                  >
                    {product.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={product.showInHero ? "paid" : "default"}
                    size="sm"
                    showIcon={false}
                  >
                    {product.showInHero ? "On" : "Off"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/products/${product.id}`}>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
