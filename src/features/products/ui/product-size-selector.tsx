// src/features/products/ui/product-size-selector.tsx
"use client";

import { useTranslations } from "next-intl";

interface SizeVariant {
  id: string;
  size: "XS" | "S" | "M" | "L" | "XL" | "XXL";
  stock: number;
  priceDiff: number;
}

interface ProductSizeSelectorProps {
  sizes: SizeVariant[];
  selectedSize: string | null;
  onSizeChange: (size: string) => void;
}

const SIZE_ORDER: Array<"XS" | "S" | "M" | "L" | "XL" | "XXL"> = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
];

export function ProductSizeSelector({
  sizes,
  selectedSize,
  onSizeChange,
}: ProductSizeSelectorProps) {
  const tProduct = useTranslations("product");

  if (sizes.length === 0) {
    return null;
  }

  // Sort sizes by SIZE_ORDER
  const sortedSizes = [...sizes].sort((a, b) => {
    return SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size);
  });

  // Create a map for quick lookup
  const sizeMap = new Map(sortedSizes.map((s) => [s.size, s]));

  return (
    <div className="space-y-3">
      <label className="text-base font-medium text-foreground">
        {tProduct("selectSize")}
      </label>
      <div className="grid grid-cols-6 gap-2">
        {SIZE_ORDER.map((size) => {
          const sizeVariant = sizeMap.get(size);
          const isAvailable = sizeVariant && sizeVariant.stock > 0;
          const isSelected = selectedSize === size;

          if (!sizeVariant) {
            return null;
          }

          return (
            <button
              key={size}
              type="button"
              onClick={() => isAvailable && onSizeChange(size)}
              disabled={!isAvailable}
              className={`
                h-12 rounded border text-base font-normal transition-all
                ${
                  isSelected
                    ? "border-foreground bg-foreground text-background cursor-pointer"
                    : isAvailable
                    ? "border-border bg-background text-foreground hover:border-foreground/50 cursor-pointer"
                    : "border-border bg-muted text-muted-foreground cursor-not-allowed opacity-50 line-through"
                }
              `}
            >
              {size}
            </button>
          );
        })}
      </div>
      {!selectedSize && (
        <p className="text-sm text-muted-foreground">
          {tProduct("pleaseSelectSize")}
        </p>
      )}
    </div>
  );
}

