// src/features/products/ui/product-color-swatches.tsx
"use client";

import { useLocale, useTranslations } from "next-intl";

interface ColorVariant {
  id: string;
  colorId: string;
  color: {
    id: string;
    name: string;
    nameFr?: string | null;
    hex: string;
  };
  images: Array<{
    url: string;
    role: "MAIN" | "MAIN_DETAIL" | "GALLERY";
  }>;
}

interface ProductColorSwatchesProps {
  colorVariants: ColorVariant[];
  selectedColorVariantId: string | null;
  onColorChange: (colorVariantId: string) => void;
}

export function ProductColorSwatches({
  colorVariants,
  selectedColorVariantId,
  onColorChange,
}: ProductColorSwatchesProps) {
  const locale = useLocale();
  const tProduct = useTranslations("product");

   const selectedColor = selectedColorVariantId
    ? colorVariants.find((cv) => cv.id === selectedColorVariantId)?.color
    : undefined;

  const selectedColorName = selectedColor
    ? locale === "fr"
      ? selectedColor.nameFr || selectedColor.name
      : selectedColor.name
    : "";

  if (colorVariants.length <= 1) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-base font-medium text-foreground">
          {tProduct("chooseColor")}
        </label>
        {selectedColorVariantId && selectedColorName && (
          <span className="text-sm text-muted-foreground">
            {selectedColorName}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {colorVariants.map((colorVariant) => {
          const isSelected = selectedColorVariantId === colorVariant.id;
          const colorHex = colorVariant.color.hex || "#000000";

          return (
            <div
              key={colorVariant.id}
              className="flex h-10 w-10 items-center justify-center"
            >
              <button
                type="button"
                onClick={() => onColorChange(colorVariant.id)}
                title={
                  locale === "fr"
                    ? colorVariant.color.nameFr || colorVariant.color.name
                    : colorVariant.color.name
                }
                className={`
                  rounded-full shadow-sm transition-all duration-150 ease-out cursor-pointer
                  ${
                    isSelected
                      ? "h-7 w-7 scale-110 shadow-md ring-2 ring-blue-500 ring-offset-2 ring-offset-background"
                      : "h-6 w-6 scale-100 hover:scale-105"
                  }
                `}
                style={{ backgroundColor: colorHex }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

