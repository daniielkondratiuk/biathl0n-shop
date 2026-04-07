// src/features/admin/products/ui/color-variants/color-variant-table.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ColorVariantData } from "./color-variant-manager";

interface Color {
  id: string;
  name: string;
  hex: string;
}

interface ColorVariantTableProps {
  colorVariants: ColorVariantData[];
  colors: Color[];
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}

export function ColorVariantTable({
  colorVariants,
  colors,
  onEdit,
  onRemove,
}: ColorVariantTableProps) {
  if (colorVariants.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No color variants added. Click &quot;Add Color Variant&quot; to create one.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Color
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Images
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sizes
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Price Diff
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {colorVariants.map((variant, index) => {
            const color = colors.find((c) => c.id === variant.colorId);
            const mainImage = variant.images.find((img) => img.role === "MAIN");
            const imageCount = variant.images.length;
            const sizeCount = variant.sizes.length;

            return (
              <tr
                key={index}
                className="transition-colors hover:bg-muted/50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-6 w-6 rounded border border-border"
                      style={{ backgroundColor: color?.hex || "#000000" }}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {color?.name || "Unknown"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge 
                    variant={variant.isActive ? "paid" : "default"} 
                    size="sm"
                    showIcon={false}
                  >
                    {variant.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground">{imageCount}</span>
                    {mainImage ? (
                      <span className="text-xs text-muted-foreground">(MAIN ✓)</span>
                    ) : (
                      <span className="text-xs text-warning">(No MAIN)</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-foreground">{sizeCount}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-foreground">
                    {variant.priceDiff !== 0
                      ? `${variant.priceDiff > 0 ? "+" : ""}${(variant.priceDiff / 100).toFixed(2)}`
                      : "$0.00"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(index)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

