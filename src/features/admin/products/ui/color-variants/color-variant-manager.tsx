// src/features/admin/products/ui/color-variants/color-variant-manager.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductImageUploader, ProductImage } from "@/features/admin/products/ui/upload/product-image-uploader";

type Size = "XS" | "S" | "M" | "L" | "XL" | "XXL";
const SIZES: Size[] = ["XS", "S", "M", "L", "XL", "XXL"];

export interface ColorVariantData {
  id?: string; // For updates
  colorId: string;
  priceDiff: number;
  isActive: boolean;
  images: Array<{
    url: string;
    role: "MAIN" | "MAIN_DETAIL" | "GALLERY";
    order: number;
  }>;
  sizes: Array<{
    id?: string; // For updates
    size: Size;
    stock: number;
    priceDiff?: number; // Optional - no longer used in UI but kept for DB compatibility
  }>;
}

interface Color {
  id: string;
  name: string;
  hex: string;
}

interface ColorVariantManagerProps {
  colorVariants: ColorVariantData[];
  onChange: (colorVariants: ColorVariantData[]) => void;
  colors: Color[];
  productSlug?: string; // For SKU generation
}

export function ColorVariantManager({
  colorVariants,
  onChange,
  colors,
  productSlug,
}: ColorVariantManagerProps) {
  const addColorVariant = () => {
    onChange([
      ...colorVariants,
      {
        colorId: colors[0]?.id || "",
        priceDiff: 0,
        isActive: true,
        images: [],
        sizes: [],
      },
    ]);
  };

  const removeColorVariant = (index: number) => {
    onChange(colorVariants.filter((_, i) => i !== index));
  };

  const updateColorVariant = (index: number, updates: Partial<ColorVariantData>) => {
    const updated = [...colorVariants];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const updateColorVariantImages = (index: number, images: ProductImage[]) => {
    // Convert ProductImage[] to the format expected by the API
    const apiImages = images.map((img, imgIndex) => {
      // Determine role: use role if set, otherwise use isMain
      let role: "MAIN" | "MAIN_DETAIL" | "GALLERY" = "GALLERY";
      if (img.role) {
        role = img.role;
      } else if (img.isMain) {
        role = "MAIN";
      }
      
      return {
        url: img.url,
        role,
        order: imgIndex,
      };
    });
    updateColorVariant(index, { images: apiImages });
  };

  const addSize = (colorVariantIndex: number) => {
    const variant = colorVariants[colorVariantIndex];
    updateColorVariant(colorVariantIndex, {
      sizes: [
        ...variant.sizes,
        {
          size: "M",
          stock: 10,
        },
      ],
    });
  };

  const removeSize = (colorVariantIndex: number, sizeIndex: number) => {
    const variant = colorVariants[colorVariantIndex];
    updateColorVariant(colorVariantIndex, {
      sizes: variant.sizes.filter((_, i) => i !== sizeIndex),
    });
  };

  const updateSize = (colorVariantIndex: number, sizeIndex: number, updates: Partial<ColorVariantData["sizes"][0]>) => {
    const variant = colorVariants[colorVariantIndex];
    const updatedSizes = [...variant.sizes];
    updatedSizes[sizeIndex] = { ...updatedSizes[sizeIndex], ...updates };
    updateColorVariant(colorVariantIndex, { sizes: updatedSizes });
  };

  const generateDefaultSizes = (colorVariantIndex: number) => {
    const variant = colorVariants[colorVariantIndex];
    const newSizes = SIZES.map((size) => {
      // Preserve existing size data if it exists
      const existing = variant.sizes.find(s => s.size === size);
      if (existing) {
        return existing;
      }
      // Create new size with default stock of 10
      return {
        size,
        stock: 10,
      };
    });
    updateColorVariant(colorVariantIndex, { sizes: newSizes });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Color Variants</h2>
        <Button type="button" onClick={addColorVariant} variant="ghost" size="sm">
          Add Color Variant
        </Button>
      </div>

      {colorVariants.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No color variants added. Click &quot;Add Color Variant&quot; to create one.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {colorVariants.map((variant, index) => {
            const selectedColor = colors.find((c) => c.id === variant.colorId);
            const mainImage = variant.images.find((img) => img.role === "MAIN");

            // Convert to ProductImage format for the uploader
            const productImages: ProductImage[] = variant.images.map((img, idx) => ({
              id: `img-${idx}`,
              url: img.url,
              role: img.role,
              isMain: img.role === "MAIN",
              temp: false,
            }));

            return (
              <div key={index} className="rounded-lg border border-border bg-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-medium text-foreground">
                    Color Variant {index + 1}
                    {selectedColor && (
                      <span className="ml-2 inline-flex items-center gap-2">
                        <span
                          className="inline-block h-4 w-4 rounded border border-border"
                          style={{ backgroundColor: selectedColor.hex }}
                        />
                        {selectedColor.name}
                      </span>
                    )}
                  </h3>
                  <Button
                    type="button"
                    onClick={() => removeColorVariant(index)}
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                  >
                    Remove
                  </Button>
                </div>

                {/* Color Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Color *
                  </label>
                  <select
                    value={variant.colorId}
                    onChange={(e) => updateColorVariant(index, { colorId: e.target.value })}
                    className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  >
                    <option value="">Select a color</option>
                    {colors.map((color) => (
                      <option key={color.id} value={color.id}>
                        {color.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Diff */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Price Difference (cents)
                  </label>
                  <Input
                    type="number"
                    value={variant.priceDiff}
                    onChange={(e) => updateColorVariant(index, { priceDiff: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>

                {/* Active Toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`active-${index}`}
                    checked={variant.isActive}
                    onChange={(e) => updateColorVariant(index, { isActive: e.target.checked })}
                    className="rounded border-border"
                  />
                  <label htmlFor={`active-${index}`} className="text-sm text-foreground">
                    Active
                  </label>
                </div>

                {/* Images */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Images
                  </label>
                  <ProductImageUploader
                    images={productImages}
                    onChange={(images) => updateColorVariantImages(index, images)}
                    allowMultiple={true}
                    allowRoleSelection={true}
                  />
                  {mainImage && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      ✓ MAIN image set
                    </p>
                  )}
                  {!mainImage && variant.images.length > 0 && (
                    <p className="mt-2 text-xs text-warning">
                      ⚠ MAIN image is required
                    </p>
                  )}
                </div>

                {/* Sizes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-foreground">
                      Sizes
                    </label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() => generateDefaultSizes(index)}
                        variant="ghost"
                        size="sm"
                      >
                        Generate All Sizes
                      </Button>
                      <Button
                        type="button"
                        onClick={() => addSize(index)}
                        variant="ghost"
                        size="sm"
                      >
                        Add Size
                      </Button>
                    </div>
                  </div>

                  {variant.sizes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No sizes added. Click &quot;Generate All Sizes&quot; or &quot;Add Size&quot;.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {variant.sizes.map((size, sizeIndex) => (
                        <div
                          key={sizeIndex}
                          className="flex items-center gap-2 rounded border border-border bg-muted p-2"
                        >
                          <select
                            value={size.size}
                            onChange={(e) =>
                              updateSize(index, sizeIndex, { size: e.target.value as Size })
                            }
                            className="flex-1 rounded border border-border bg-input px-2 py-1 text-sm"
                          >
                            {SIZES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <Input
                            type="number"
                            placeholder="Stock"
                            value={size.stock}
                            onChange={(e) =>
                              updateSize(index, sizeIndex, { stock: parseInt(e.target.value) || 0 })
                            }
                            className="w-24"
                          />
                          {productSlug && selectedColor && (
                            <span className="text-xs text-muted-foreground">
                              SKU: {productSlug}-{selectedColor.name.toLowerCase()}-{size.size.toLowerCase()}
                            </span>
                          )}
                          <Button
                            type="button"
                            onClick={() => removeSize(index, sizeIndex)}
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

